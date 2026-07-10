// Engine: FLUX.2-klein 4B via iris.c (antirez's pure-C, mmap inference engine).
// This is the high-quality LOCAL path that fits 8GB via memory-mapped weights
// (~4–5GB peak). It's a young project — VERIFY the CLI with `iris --help` and
// override IRIS_CMD if the flags differ from the default below.
//
// Setup (outside this repo):
//   git clone https://github.com/antirez/iris.c && cd iris.c && make
//   # download the FLUX.2-klein 4B weights per the project README
//   export IRIS_BIN=/path/to/iris
//   export IRIS_MODEL=/path/to/flux2-klein-4b
//
// Env overrides:
//   IRIS_BIN    binary (default "iris")
//   IRIS_MODEL  model path/id (substituted as {model})
//   IRIS_STEPS  diffusion steps (default 4 — klein is distilled)
//   IRIS_CMD    full command template (placeholders: {prompt} {seed} {width}
//               {height} {out} {steps} {model})

import { buildArgv, runCommand, commandExists } from "./runner.mjs";

const BIN = process.env.IRIS_BIN || "iris";
const MODEL = process.env.IRIS_MODEL || "flux2-klein-4b";
const STEPS = process.env.IRIS_STEPS || "4";
// Verified against iris.c --help (2026-05): the model is passed with --dir, NOT
// --model. The other long flags below are real aliases of -p/-S/-W/-H/-s/-o.
const DEFAULT_TEMPLATE =
    `${BIN} --dir {model} --prompt {prompt} --seed {seed} ` +
    `--width {width} --height {height} --steps {steps} --output {out}`;
const TEMPLATE = process.env.IRIS_CMD || DEFAULT_TEMPLATE;

export const flux2Iris = {
    id: "flux2-iris",
    label: "FLUX.2-klein 4B (iris.c, local)",
    async isAvailable() {
        return commandExists(BIN);
    },
    async generate({ prompt, seed, width, height, outPath }) {
        const argv = buildArgv(TEMPLATE, {
            prompt,
            seed,
            width,
            height,
            out: outPath,
            steps: STEPS,
            model: MODEL,
        });
        await runCommand(argv);
    },
};
