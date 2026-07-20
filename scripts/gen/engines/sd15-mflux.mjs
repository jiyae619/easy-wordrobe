// Engine: Stable Diffusion 1.5 (8-bit) — the reliable LOCAL fallback that
// comfortably fits 8GB. Lower fidelity than FLUX.2 for clean product shots, but
// mature tooling and low setup risk.
//
// There's no single canonical SD-1.5 CLI on Apple Silicon, so this adapter is
// command-template driven. Point it at whatever you install. Two common paths:
//
//   A) mlx-examples stable diffusion (Python):
//      git clone https://github.com/ml-explore/mlx-examples
//      export SD15_CMD="python /path/mlx-examples/stable_diffusion/txt2image.py \
//        {prompt} --seed {seed} --n_images 1 --output {out}"
//
//   B) diffusers + MPS (Python venv): wrap your own txt2img.py and point SD15_CMD at it.
//
// Env overrides:
//   SD15_BIN   probe binary for availability (default "python3")
//   SD15_STEPS steps (default 20 — SD 1.5 needs more than distilled FLUX)
//   SD15_CMD   full command template ({prompt} {seed} {width} {height} {out} {steps})

import { buildArgv, runCommand, commandExists } from "./runner.mjs";

const BIN = process.env.SD15_BIN || "python3";
const STEPS = process.env.SD15_STEPS || "20";
const TEMPLATE = process.env.SD15_CMD || "";

export const sd15Mflux = {
    id: "sd15-mflux",
    label: "Stable Diffusion 1.5 8-bit (local)",
    async isAvailable() {
        if (!TEMPLATE) return false; // needs an explicit command — no safe default
        return commandExists(BIN);
    },
    async generate({ prompt, seed, width, height, outPath }) {
        if (!TEMPLATE) {
            throw new Error(
                "sd15-mflux: set SD15_CMD to your SD-1.5 CLI command template " +
                "(see scripts/gen/engines/sd15-mflux.mjs header for examples)."
            );
        }
        const argv = buildArgv(TEMPLATE, {
            prompt,
            seed,
            width,
            height,
            out: outPath,
            steps: STEPS,
        });
        await runCommand(argv);
    },
};
