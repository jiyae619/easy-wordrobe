#!/usr/bin/env node
// Stylemax catalog generator (guide Part A, Stylemax-native).
//
// Generates clothing catalog images + eval-format label sidecars. Engine-agnostic:
// the same matrix runs through any backend in engines/ so the bake-off can compare
// them apples-to-apples (matched combos + seeds).
//
// Examples:
//   # See the 12 bake-off prompts + labels without generating anything:
//   node scripts/gen/generate.mjs --bakeoff --dry-run
//
//   # Bake-off on the hosted reference (needs FAL_KEY) — writes to scripts/gen/out/<engine>/:
//   node scripts/gen/generate.mjs --bakeoff --engine hosted-fal
//
//   # Bake-off locally once iris.c is set up:
//   node scripts/gen/generate.mjs --bakeoff --engine flux2-iris
//
//   # Full labeled batch straight into the eval fixtures (after you pick an engine):
//   node scripts/gen/generate.mjs --engine flux2-iris --count 200 \
//        --out scripts/eval/fixtures --flat
//
// Flags:
//   --engine <id>     flux2-iris | sd15-mflux | hosted-fal   (default flux2-iris)
//   --bakeoff         the fixed 12-combo comparison set (ignores --count)
//   --per-category    category-balanced set: one per category + extras (use --count)
//   --count <n>       number of combos to sample        (default 200)
//   --out <dir>       output root                        (default scripts/gen/out)
//   --flat            write <out>/<stem>.{png,json} (no per-engine subdir) — use for fixtures
//   --width/-w <px>   default 1024
//   --height/-h <px>  default 1024
//   --noisy-frac <f>  fraction [0..1] of images with a cluttered background (default 0)
//   --category <cat>  generate only this category (e.g. shoes) — filters the sampled matrix
//   --limit <n>       stop after n images (smoke test)
//   --until <epoch>   stop before starting any image past this UNIX time (seconds) —
//                     time-bounded run; pair with a large --count so the clock is the limit
//   --max-consec-fails <n>  abort after n failures in a row (default 5) — catches
//                     engine/system breakage (e.g. Metal compiler crash) early
//   --dry-run         print prompts + labels; generate nothing

import { mkdir, writeFile, appendFile, access, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bakeoffMatrix, sampleMatrix, perCategoryMatrix } from "./matrix.mjs";
import { buildPrompt, buildLabel, stemFor } from "./prompt.mjs";
import { getEngine } from "./engines/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
    const a = {
        engine: "flux2-iris",
        bakeoff: false,
        perCategory: false,
        count: 200,
        out: path.join("scripts", "gen", "out"),
        flat: false,
        width: 1024,
        height: 1024,
        noisyFrac: 0,
        category: null, // generate only this category (e.g. "shoes") — filters the matrix
        limit: Infinity,
        until: Infinity, // epoch ms; stop before starting any image past this wall-clock time
        maxConsecFails: 5, // abort after this many failures in a row (engine/system breakage)
        dryRun: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const t = argv[i];
        const next = () => argv[++i];
        switch (t) {
            case "--engine": a.engine = next(); break;
            case "--bakeoff": a.bakeoff = true; break;
            case "--per-category": a.perCategory = true; break;
            case "--count": a.count = Number(next()); break;
            case "--out": a.out = next(); break;
            case "--flat": a.flat = true; break;
            case "--width": case "-w": a.width = Number(next()); break;
            case "--height": case "-h": a.height = Number(next()); break;
            case "--noisy-frac": a.noisyFrac = Number(next()); break;
            case "--category": a.category = next(); break;
            case "--limit": a.limit = Number(next()); break;
            case "--until": a.until = Number(next()) * 1000; break; // epoch SECONDS
            case "--max-consec-fails": a.maxConsecFails = Number(next()); break;
            case "--dry-run": a.dryRun = true; break;
            default:
                console.error(`Unknown flag: ${t}`);
                process.exit(1);
        }
    }
    return a;
}

async function exists(p) {
    try { await access(p); return true; } catch { return false; }
}

// Deterministic: every Nth image (by index) is noisy, so the same combos are
// noisy across engines and reruns.
function isNoisy(index, frac) {
    if (frac <= 0) return false;
    if (frac >= 1) return true;
    const stride = Math.max(1, Math.round(1 / frac));
    return index % stride === 0;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const allCombos = args.bakeoff
        ? bakeoffMatrix()
        : args.perCategory
            ? perCategoryMatrix({ total: args.count })
            : sampleMatrix({ count: args.count });
    const combos = args.category
        ? allCombos.filter((c) => c.category === args.category)
        : allCombos;
    const engine = getEngine(args.engine);

    // Resolve output dir: <out> for --flat, else <out>/<engine-id>.
    const outDir = path.resolve(
        REPO_ROOT,
        args.flat ? args.out : path.join(args.out, engine.id)
    );
    const metaPath = path.resolve(REPO_ROOT, args.out, "meta.jsonl");

    console.log(
        `engine=${engine.id}  combos=${combos.length}  ` +
        `${args.bakeoff ? "[BAKEOFF] " : ""}${args.perCategory ? "[PER-CATEGORY] " : ""}` +
        `${args.dryRun ? "[DRY-RUN] " : ""}` +
        `out=${path.relative(REPO_ROOT, outDir)}`
    );

    if (!args.dryRun) {
        await mkdir(outDir, { recursive: true });
        await mkdir(path.dirname(metaPath), { recursive: true });
        if (!(await engine.isAvailable())) {
            console.error(
                `\nEngine "${engine.id}" is not configured/available.\n` +
                `See scripts/gen/README.md and scripts/gen/engines/${engine.id}.mjs for setup.\n` +
                `(Tip: run with --dry-run to validate prompts/labels without an engine.)`
            );
            process.exit(2);
        }
    }

    let made = 0, skipped = 0, failed = 0, consecFails = 0;
    let hitDeadline = false, aborted = false;
    for (let i = 0; i < combos.length && made < args.limit; i++) {
        if (Date.now() >= args.until) {
            hitDeadline = true;
            console.log(`\nDeadline reached (--until) — stopping before image ${i + 1}.`);
            break;
        }
        const combo = combos[i];
        const noisy = isNoisy(i, args.noisyFrac);
        const stem = stemFor(combo);
        const prompt = buildPrompt(combo, { noisy });
        const label = buildLabel(combo, { noisy });
        const pngPath = path.join(outDir, `${stem}.png`);
        const jsonPath = path.join(outDir, `${stem}.json`);

        if (args.dryRun) {
            console.log(`\n• ${stem}`);
            console.log(`  prompt: ${prompt}`);
            console.log(`  label : ${JSON.stringify(label)}`);
            made++;
            continue;
        }

        if (await exists(pngPath)) { skipped++; continue; }

        process.stdout.write(`  [${made + skipped + 1}/${combos.length}] ${stem} … `);
        try {
            await engine.generate({
                prompt,
                seed: combo.seed,
                width: args.width,
                height: args.height,
                outPath: pngPath,
            });
            await writeFile(jsonPath, JSON.stringify(label, null, 2) + "\n");
            await appendFile(
                metaPath,
                JSON.stringify({
                    engine: engine.id,
                    comboKey: combo.comboKey,
                    stem,
                    path: path.relative(path.dirname(metaPath), pngPath),
                    category: combo.category,
                    subcategory: combo.subSlug,
                    color: combo.color,
                    colorHex: label.expectedColorHex,
                    seed: combo.seed,
                    noisy,
                    prompt,
                    ...label,
                }) + "\n"
            );
            made++;
            consecFails = 0; // a success breaks any failure streak
            console.log("ok");
        } catch (err) {
            failed++;
            consecFails++;
            console.log(`FAIL: ${err.message}`);
            // Leave no orphan sidecar if the image failed.
            if (await exists(jsonPath)) await rm(jsonPath);
            // Bail out on a sustained failure streak — usually engine/system
            // breakage (e.g. Metal compiler crash), where every remaining combo
            // would fail instantly and churn through the whole list for nothing.
            if (consecFails >= args.maxConsecFails) {
                aborted = true;
                console.log(
                    `\nAborting: ${consecFails} consecutive failures ` +
                    `(--max-consec-fails ${args.maxConsecFails}). The engine looks broken; ` +
                    `fix it and re-run — completed images are skipped on the next pass.`
                );
                break;
            }
        }
    }

    const stopNote = aborted ? " (aborted: failure streak)"
        : hitDeadline ? " (stopped at deadline)" : "";
    console.log(
        `\nDone${stopNote}. ` +
        `generated=${made} skipped=${skipped} failed=${failed}` +
        (args.dryRun ? "" : `\nmeta: ${path.relative(REPO_ROOT, metaPath)}`)
    );
    if (failed > 0 && !args.dryRun) process.exitCode = 1;
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
