#!/usr/bin/env node
// Visual verification sheet for the intake eval.
//
// The A/B scorecard trusts the sidecar labels as ground truth — but those labels
// are the IMAGE GENERATOR'S INTENT, not a verified fact about the rendered pixels.
// This tool lets a human CHECK that, by laying out for a diverse sample:
//   the image · the expected label · the ACTUAL color measured from the pixels ·
//   each model's prediction — with color swatches, side by side.
//
// Usage:
//   GEMINI_API_KEY=$GEMINI_EVAL_API_KEY node scripts/eval/verify-sheet.mjs
//
// Requires `sips` (macOS) for pixel extraction; degrades gracefully without it.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import zlib from "node:zlib";
import { colorDistance } from "./score.mjs";
import { geminiProvider, novaProvider } from "./providers.mjs";

const exec = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.EVAL_FIXTURES_DIR || path.join(__dirname, "..", "gen", "out", "flux2-iris");
const OUT = path.join(__dirname, "..", "..", "verify-color.html");
const REGION = process.env.EVAL_REGION || process.env.VITE_AWS_REGION || "us-east-2";
const NOVA_KEY = process.env.VITE_BEDROCK_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Color-diverse, category-diverse sample (incl. the boundary cases that both models miss).
const WANT = [
  "tops-knit-sweater-black", "tops-crew-tee-white", "tops-silk-blouse-navy", "tops-hoodie-olive",
  "bottoms-slim-jeans-blue", "bottoms-chinos-beige", "bottoms-pleated-skirt-pink",
  "outerwear-wool-coat-cream", "outerwear-denim-jacket-blue", "outerwear-cardigan-grey",
  "dresses-shirt-dress-black", "dresses-slip-dress-olive", "dresses-sundress-pink",
  "tops-knit-sweater-brown", "bottoms-denim-shorts-navy", "outerwear-blazer-beige",
];

async function pickFiles() {
  const all = (await fs.readdir(SRC)).filter((f) => f.endsWith(".png"));
  const picked = [];
  for (const prefix of WANT) {
    const hit = all.find((f) => f.startsWith(prefix + "-"));
    if (hit) picked.push(hit.slice(0, -4)); // stem
  }
  return picked;
}

// Average color of the image's center (garment region), measured from actual pixels.
async function actualColor(pngPath) {
  try {
    const crop = "/tmp/vs-crop.png", px = "/tmp/vs-px.png";
    await exec("sips", ["-c", "128", "128", pngPath, "--out", crop]);
    await exec("sips", ["-z", "1", "1", crop, "--out", px]);
    const buf = await fs.readFile(px);
    let off = 8, idat = [];
    while (off < buf.length) {
      const len = buf.readUInt32BE(off);
      const type = buf.toString("ascii", off + 4, off + 8);
      if (type === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len));
      off += 12 + len;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const [r, g, b] = [raw[1], raw[2], raw[3]];
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

const swatch = (hex) =>
  hex ? `<span class="sw" style="background:${hex}"></span><code>${hex}</code>` : `<span class="sw none"></span><code>—</code>`;
const dist = (a, b) => {
  const d = colorDistance(a, b);
  return d == null ? "—" : Math.round(d);
};

async function main() {
  if (!NOVA_KEY && !GEMINI_KEY) {
    console.error("Need VITE_BEDROCK_API_KEY and/or GEMINI_API_KEY");
    process.exit(1);
  }
  const stems = await pickFiles();
  console.log(`Verifying ${stems.length} samples…`);
  const cards = [];

  for (const stem of stems) {
    const pngPath = path.join(SRC, stem + ".png");
    const truth = JSON.parse(await fs.readFile(path.join(SRC, stem + ".json"), "utf8"));
    const bytes = await fs.readFile(pngPath);
    const base64 = bytes.toString("base64");
    process.stdout.write(`  • ${stem} … `);

    const actual = await actualColor(pngPath);

    let nova = null, gem = null;
    try { if (NOVA_KEY) nova = await novaProvider({ base64, format: "png", region: REGION, apiKey: NOVA_KEY }); } catch (e) { nova = { _err: e.message }; }
    try { if (GEMINI_KEY) gem = await geminiProvider({ base64, mimeType: "image/png", apiKey: GEMINI_KEY, model: "gemini-2.5-flash" }); } catch (e) { gem = { _err: e.message }; }
    console.log(`nova=${nova?._err ? "ERR" : nova?.category} gemini=${gem?._err ? "ERR" : gem?.category}`);

    const catCell = (pred) => {
      if (!pred || pred._err) return `<span class="err">ERR</span>`;
      const ok = pred.category === truth.expectedCategory;
      return `${pred.category} <span class="${ok ? "ok" : "no"}">${ok ? "✓" : "✗"}</span>`;
    };
    const colorRow = (label, pred, isModel) => {
      if (isModel && (!pred || pred._err))
        return `<tr><td>${label}</td><td><span class="err">ERR</span></td><td colspan="2"><span class="err">—</span></td></tr>`;
      const hex = isModel ? pred?.colorHex : pred;
      const dLabel = isModel ? dist(hex, truth.expectedColorHex) : "";
      const dPx = isModel ? dist(hex, actual) : "";
      const deltas = isModel ? `<span class="d">Δlabel ${dLabel} · Δpixels ${dPx}</span>` : "";
      return `<tr><td>${label}</td><td>${isModel ? catCell(pred) : (label === "Label" ? truth.expectedCategory : "—")}</td><td class="cw">${swatch(hex)}</td><td>${deltas}</td></tr>`;
    };

    cards.push(`
      <div class="card">
        <img src="data:image/png;base64,${base64}" alt="${stem}">
        <div class="name">${stem}</div>
        <table>
          <thead><tr><th></th><th>category</th><th>color</th><th></th></tr></thead>
          <tbody>
            ${colorRow("Label", truth.expectedColorHex, false)}
            <tr class="px"><td>Actual&nbsp;px</td><td>—</td><td class="cw">${swatch(actual)}</td><td><span class="d">vs label: ${dist(actual, truth.expectedColorHex)}</span></td></tr>
            ${colorRow("Nova", nova, true)}
            ${colorRow("Gemini", gem, true)}
          </tbody>
        </table>
      </div>`);
  }

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stylemax — Eval Ground-Truth Verification</title>
<style>
  :root{--bg:#f5f6f8;--panel:#fff;--ink:#1a1f26;--muted:#5b6770;--line:#e3e7ed;--accent2:#0d9488}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;line-height:1.55}
  .wrap{max-width:1180px;margin:0 auto;padding:28px 22px 90px}
  h1{font-size:1.6rem;margin:0 0 4px}
  .lead{color:var(--muted);max-width:820px;margin:0 0 8px}
  .legend{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:18px 0;font-size:.88rem}
  .legend b{color:var(--accent2)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;overflow:hidden}
  .card img{width:100%;height:200px;object-fit:contain;background:#eef0f3;border-radius:8px}
  .name{font-size:.74rem;color:var(--muted);margin:8px 0 6px;word-break:break-all}
  table{border-collapse:collapse;width:100%;font-size:.8rem}
  td,th{border-top:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:middle}
  th{color:var(--muted);font-weight:600;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;border-top:none}
  tr.px{background:#f0fdf9}
  td:first-child{font-weight:600;white-space:nowrap}
  .cw{white-space:nowrap}
  .sw{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid rgba(0,0,0,.15);vertical-align:middle;margin-right:5px}
  .sw.none{background:repeating-linear-gradient(45deg,#eee,#eee 3px,#fff 3px,#fff 6px)}
  code{font-size:.74rem;color:var(--muted)}
  .ok{color:#16a34a;font-weight:700} .no{color:#e11d48;font-weight:700} .err{color:#e11d48;font-weight:700}
  .d{font-size:.68rem;color:var(--muted);font-variant-numeric:tabular-nums}
</style></head><body><div class="wrap">
  <h1>Eval ground-truth verification</h1>
  <p class="lead">The A/B scorecard trusts the sidecar <b>Label</b> as truth — but that label is the generator's <em>intent</em>. This sheet lets you check it: the <b>Actual&nbsp;px</b> row is the real average color measured from the rendered pixels. Compare swatches with your own eyes.</p>
  <div class="legend">
    <b>How to read each card:</b> <b>Label</b> = sidecar ground truth (what the scorer grades against). <b>Actual&nbsp;px</b> = color measured from the image center (the real pixels). <b>Nova</b> / <b>Gemini</b> = model predictions, with category ✓/✗ vs label and color distance to both the <b>label</b> and the <b>actual pixels</b>. When a model's <b>Δpixels</b> is much smaller than its <b>Δlabel</b>, the model matched reality better than the label did — i.e. the label, not the model, is the weak link.
  </div>
  <div class="grid">${cards.join("")}</div>
</div></body></html>`;

  await fs.writeFile(OUT, html, "utf8");
  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
