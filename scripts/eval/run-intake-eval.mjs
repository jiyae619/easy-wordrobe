#!/usr/bin/env node
// A/B eval for the IntakeAgent — runs the same fixture images through
// two vision models and prints a side-by-side scorecard.
//
// Usage:
//   VITE_BEDROCK_API_KEY=... GEMINI_API_KEY=... node scripts/eval/run-intake-eval.mjs
//
// Optional:
//   EVAL_FIXTURES_DIR=./scripts/eval/fixtures   (default)
//   EVAL_OUTPUT=./scripts/eval/last-report.md   (default; pass "-" for stdout only)
//   EVAL_REGION=us-east-2                       (default; matches VITE_AWS_REGION)
//   EVAL_GEMINI_MODEL=gemini-2.5-flash          (default)

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aggregate, scoreOne } from "./score.mjs";
import { geminiProvider, novaProvider } from "./providers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = process.env.EVAL_FIXTURES_DIR || path.join(__dirname, "fixtures");
const OUTPUT = process.env.EVAL_OUTPUT || path.join(__dirname, "last-report.md");
const REGION = process.env.EVAL_REGION || process.env.VITE_AWS_REGION || "us-east-2";
const GEMINI_MODEL = process.env.EVAL_GEMINI_MODEL || "gemini-2.5-flash";

const NOVA_KEY = process.env.VITE_BEDROCK_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!NOVA_KEY) console.warn("[warn] VITE_BEDROCK_API_KEY not set — Nova column will be empty");
if (!GEMINI_KEY) console.warn("[warn] GEMINI_API_KEY not set — Gemini column will be empty");
if (!NOVA_KEY && !GEMINI_KEY) {
  console.error("[error] Need at least one of VITE_BEDROCK_API_KEY or GEMINI_API_KEY");
  process.exit(1);
}

function mimeFromExt(ext) {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return { mime: "image/jpeg", format: "jpeg" };
    case ".png":
      return { mime: "image/png", format: "png" };
    case ".webp":
      return { mime: "image/webp", format: "webp" };
    default:
      return null;
  }
}

async function loadFixtures(dir) {
  const entries = await fs.readdir(dir).catch(() => []);
  const fixtures = [];
  for (const entry of entries) {
    const ext = path.extname(entry);
    const mime = mimeFromExt(ext);
    if (!mime) continue;
    const stem = entry.slice(0, -ext.length);
    const truthPath = path.join(dir, `${stem}.json`);
    let truth;
    try {
      truth = JSON.parse(await fs.readFile(truthPath, "utf8"));
    } catch {
      console.warn(`[skip] ${entry} — no matching ${stem}.json`);
      continue;
    }
    const bytes = await fs.readFile(path.join(dir, entry));
    fixtures.push({ name: stem, base64: bytes.toString("base64"), ...mime, truth });
  }
  return fixtures;
}

async function runOne(provider, fixture) {
  const started = performance.now();
  try {
    const prediction = await provider(fixture);
    return { prediction, latencyMs: performance.now() - started, errored: false };
  } catch (err) {
    return {
      prediction: null,
      latencyMs: performance.now() - started,
      errored: true,
      errorMessage: err?.message ?? String(err),
    };
  }
}

function fmtPct(v) {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}
function fmtNum(v, digits = 1) {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits);
}

function summaryTable(label, agg) {
  if (!agg) return `### ${label}\n\nNo runs.\n`;
  return `### ${label} (${agg.n} fixtures)

| Metric | Value |
|---|---|
| Success rate (no error / no fallback) | ${fmtPct(agg.successRate)} |
| Category accuracy | ${fmtPct(agg.categoryAccuracy)} |
| Subcategory keyword hit | ${fmtPct(agg.subcategoryHitRate)} |
| Avg color score (0–1, higher = closer hex) | ${fmtNum(agg.avgColorScore, 3)} |
| Avg color RGB distance (lower = closer) | ${fmtNum(agg.avgColorDistance, 1)} |
| Avg mood Jaccard | ${fmtNum(agg.avgMoodJaccard, 3)} |
| Avg season Jaccard | ${fmtNum(agg.avgSeasonJaccard, 3)} |
| Avg latency (ms) | ${fmtNum(agg.avgLatencyMs, 0)} |
`;
}

function perFixtureTable(rows) {
  const header = `| Fixture | Nova cat | Gemini cat | Nova color | Gemini color | Nova sub-hit | Gemini sub-hit | Nova ms | Gemini ms |\n|---|---|---|---|---|---|---|---|---|`;
  const body = rows
    .map(
      (r) =>
        `| ${r.name} | ${r.nova.errored ? "ERR" : r.nova.categoryHit ? "✓" : "✗"} | ${r.gemini.errored ? "ERR" : r.gemini.categoryHit ? "✓" : "✗"} | ${fmtNum(r.nova.colorDistance, 0)} | ${fmtNum(r.gemini.colorDistance, 0)} | ${r.nova.subcategoryHit ? "✓" : "✗"} | ${r.gemini.subcategoryHit ? "✓" : "✗"} | ${fmtNum(r.nova.latencyMs, 0)} | ${fmtNum(r.gemini.latencyMs, 0)} |`
    )
    .join("\n");
  return `### Per-fixture\n\n${header}\n${body}\n`;
}

async function main() {
  const fixtures = await loadFixtures(FIXTURES_DIR);
  if (fixtures.length === 0) {
    console.error(`[error] No fixtures in ${FIXTURES_DIR}. See ${path.join(FIXTURES_DIR, "README.md")}`);
    process.exit(1);
  }
  console.log(`Loaded ${fixtures.length} fixtures from ${FIXTURES_DIR}`);

  const novaRows = [];
  const geminiRows = [];
  const perFixture = [];

  for (const fix of fixtures) {
    process.stdout.write(`  • ${fix.name} … `);

    const novaResult = NOVA_KEY
      ? await runOne(
          (f) => novaProvider({ base64: f.base64, format: f.format, region: REGION, apiKey: NOVA_KEY }),
          fix
        )
      : { prediction: null, latencyMs: 0, errored: true, errorMessage: "no key" };

    const geminiResult = GEMINI_KEY
      ? await runOne(
          (f) =>
            geminiProvider({
              base64: f.base64,
              mimeType: f.mime,
              apiKey: GEMINI_KEY,
              model: GEMINI_MODEL,
            }),
          fix
        )
      : { prediction: null, latencyMs: 0, errored: true, errorMessage: "no key" };

    const novaScore = scoreOne({
      truth: fix.truth,
      prediction: novaResult.prediction,
      latencyMs: novaResult.latencyMs,
      errored: novaResult.errored,
    });
    const geminiScore = scoreOne({
      truth: fix.truth,
      prediction: geminiResult.prediction,
      latencyMs: geminiResult.latencyMs,
      errored: geminiResult.errored,
    });

    novaRows.push(novaScore);
    geminiRows.push(geminiScore);
    perFixture.push({ name: fix.name, nova: novaScore, gemini: geminiScore });

    console.log(
      `nova=${novaScore.errored ? "ERR" : novaScore.categoryHit ? "✓" : "✗"} ` +
        `gemini=${geminiScore.errored ? "ERR" : geminiScore.categoryHit ? "✓" : "✗"}`
    );
  }

  const report = `# Intake-model A/B eval

- Fixtures: \`${FIXTURES_DIR}\`
- Nova model: \`us.amazon.nova-2-lite-v1:0\` (region \`${REGION}\`)
- Gemini model: \`${GEMINI_MODEL}\`
- Run at: ${new Date().toISOString()}

${summaryTable("AWS Nova 2 Lite", aggregate(novaRows))}
${summaryTable(`Gemini ${GEMINI_MODEL}`, aggregate(geminiRows))}
${perFixtureTable(perFixture)}

## How to read this

- **Category accuracy** — most important; if a model can't tell tops from bottoms, nothing else matters.
- **Color score** — \`1.0\` is identical hex; \`0.5\` ≈ 100 RGB units off (noticeable but related shade); \`0.0\` ≈ unrelated color.
- **Subcategory hit** — binary keyword match. Looser than category, looks for any of the ground-truth keywords in the model's free-text subcategory.
- **Latency** — wall-clock including network. Different regions/keys will skew this.
`;

  console.log("\n" + report);

  if (OUTPUT !== "-") {
    await fs.writeFile(OUTPUT, report, "utf8");
    console.log(`\nReport written to ${OUTPUT}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
