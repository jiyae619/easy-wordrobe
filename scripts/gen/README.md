# Catalog generator (guide Part A, Stylemax-native)

Generates clothing **catalog images + eval-format label sidecars** for two uses:

1. **Eval fixtures** — labeled images that drop straight into `scripts/eval/fixtures/`
   so the Nova-vs-Gemini intake benchmark (`scripts/eval/run-intake-eval.mjs`) can run.
2. **Demo wardrobes** — curated, polished items for screenshots / personas.

It is **engine-agnostic**: the same matrix (combos + seeds) runs through any backend, so
the bake-off compares engines apples-to-apples. Everything is aligned to the app's real
taxonomy — only 4 categories (`tops`, `bottoms`, `outerwear`, `dresses`), 4 seasons, 5 moods
— mirrored from `src/data/demoItems.ts` + `src/data/moods.ts` in `taxonomy.mjs`. Labels match
`scripts/eval/score.mjs` exactly.

## Quick start

```bash
# 1. Validate prompts + labels with NO engine (free, instant):
node scripts/gen/generate.mjs --bakeoff --dry-run

# 2. Run the 12-image bake-off on whichever engine(s) you've set up:
node scripts/gen/generate.mjs --bakeoff --engine hosted-fal     # needs FAL_KEY
node scripts/gen/generate.mjs --bakeoff --engine flux2-iris     # needs iris.c

# 3. Review side-by-side, pick the winner:
cd scripts/gen/out && python3 -m http.server   # open http://localhost:8000/review.html

# 4. Generate the full labeled batch into the eval fixtures with the chosen engine:
node scripts/gen/generate.mjs --engine flux2-iris --count 200 \
     --out scripts/eval/fixtures --flat

# 5. Run the benchmark that was impossible before (fixtures/ was empty):
VITE_BEDROCK_API_KEY=… GEMINI_API_KEY=… node scripts/eval/run-intake-eval.mjs
```

## Engines

| id | what | setup | cost |
|---|---|---|---|
| `flux2-iris` | FLUX.2-klein 4B via [iris.c](https://github.com/antirez/iris.c) — high-quality **local**, mmap fits 8GB | clone + `make`, set `IRIS_BIN`/`IRIS_MODEL` | free (slow on 8GB: ~60–180s/img) |
| `sd15-mflux` | Stable Diffusion 1.5 8-bit — reliable **local** fallback, lower fidelity | set `SD15_CMD` to your SD CLI | free (~60–90s/img) |
| `hosted-fal` | fal.ai flux-schnell — **hosted** reference / fallback | set `FAL_KEY` | ~$0.003/img (12 ≈ $0.04, 200 ≈ $0.60) |

Each engine reads env-var overrides — see the header comment in each
`scripts/gen/engines/<id>.mjs`. The local engines use **command templates** (e.g. `IRIS_CMD`,
`SD15_CMD`) because the exact CLI flags drift between tool versions: check the tool's `--help`
and override the template if the defaults don't match. Install engine binaries **outside this
repo** (a venv or clone); this folder only holds the orchestrator + outputs.

### Pinned references (as of 2026-05; verify, these move fast)
- iris.c — antirez/iris.c, FLUX.2-klein 4B, 4-step distilled, mmap mode for 8GB.
- fal.ai — `fal-ai/flux/schnell`, 4 steps, ~$0.003/MP.
- SD 1.5 — via `ml-explore/mlx-examples` stable_diffusion, or diffusers+MPS.

## Output layout

```
scripts/gen/out/
  meta.jsonl              # one rich record per image (all engines), drives review.html
  review.html             # side-by-side grid + keep/drop curation → exports kept-stems.json
  <engine-id>/
    <stem>.png
    <stem>.json           # eval-format sidecar (expectedCategory/ColorHex/… )
```

With `--flat` the per-engine subdir is skipped and files land directly in `--out`
(that's how you write into `scripts/eval/fixtures/`).

## Flags

`--engine <id>` · `--bakeoff` · `--count <n>` (default 200) · `--out <dir>` ·
`--flat` · `--width/-w` · `--height/-h` (default 1024) · `--noisy-frac <0..1>`
(fraction with a cluttered background, to exercise `hasNoisyBackground`) ·
`--limit <n>` · `--dry-run`.

## Caveats

- **Distribution shift:** these are clean studio shots; real users upload messy phone photos.
  Synthetic eval is necessary, not sufficient — keep a small holdout of **real photos** in
  `scripts/eval/fixtures/` too (the fixtures README already recommends this).
- **Color-label drift:** `expectedColorHex` is the *nominal* hex for the color name; the
  diffusion model may render a slightly different shade. The scorer tolerates ~100 RGB units,
  so this is usually fine — spot-check with the eval's color-distance column.
- **Don't bloat git:** a few hundred PNGs is heavy. `out/` is gitignored (see `out/.gitignore`);
  decide deliberately what (if anything) to commit under `scripts/eval/fixtures/`.
