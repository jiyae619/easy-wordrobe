// Engine: fal.ai flux-schnell — the HOSTED reference / fallback. Fully
// implemented (no local install). ~$0.003/image, so the 12-image bake-off costs
// ~$0.04 and a 200-image batch ~$0.60. Use it as a quality ceiling to judge the
// local engines against, or as the actual generator if you'd rather not fight 8GB.
//
// Setup:  export FAL_KEY=...   (https://fal.ai/dashboard/keys)
// Env overrides:
//   FAL_MODEL     model slug (default "fal-ai/flux/schnell")
//   FAL_STEPS     num_inference_steps (default 4 — schnell is distilled)

import { downloadTo } from "./runner.mjs";

const KEY = process.env.FAL_KEY || process.env.FAL_API_KEY;
const MODEL = process.env.FAL_MODEL || "fal-ai/flux/schnell";
const STEPS = Number(process.env.FAL_STEPS || 4);

export const hostedFal = {
    id: "hosted-fal",
    label: "fal.ai flux-schnell (hosted)",
    async isAvailable() {
        return Boolean(KEY);
    },
    async generate({ prompt, seed, width, height, outPath }) {
        if (!KEY) throw new Error("hosted-fal: FAL_KEY not set");
        const res = await fetch(`https://fal.run/${MODEL}`, {
            method: "POST",
            headers: {
                Authorization: `Key ${KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt,
                seed,
                num_images: 1,
                num_inference_steps: STEPS,
                image_size: { width, height },
                enable_safety_checker: true,
            }),
        });
        if (!res.ok) {
            throw new Error(`fal ${res.status}: ${await res.text()}`);
        }
        const json = await res.json();
        const url = json?.images?.[0]?.url;
        if (!url) throw new Error(`fal: no image url in response`);
        await downloadTo(url, outPath);
    },
};
