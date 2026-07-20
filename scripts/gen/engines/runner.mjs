// Shared helpers for engine adapters: run a templated local command, and
// download a remote image to disk.
//
// Why command templates? The exact CLI signatures for iris.c and local SD 1.5
// runtimes drift between versions and installs. Rather than hard-code flags we
// can't verify, each local engine exposes a default template with {placeholders}
// that you can override via an env var after checking the tool's --help. This
// keeps the orchestrator stable while the underlying binary changes.

import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { Readable } from "node:stream";

/**
 * Expand a command template string into argv.
 * Placeholders: {prompt} {seed} {width} {height} {out} {steps} {model}
 * Tokens are split on whitespace; {prompt} is kept as a single argv entry even
 * though it contains spaces (it's substituted AFTER the split).
 */
export function buildArgv(template, vars) {
    const tokens = template.trim().split(/\s+/);
    return tokens.map((tok) =>
        tok.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
    );
}

/** Run a command, inheriting stderr for progress. Resolves on exit code 0. */
export function runCommand(argv, { cwd, env } = {}) {
    return new Promise((resolve, reject) => {
        const [cmd, ...args] = argv;
        const child = spawn(cmd, args, {
            cwd,
            env: { ...process.env, ...env },
            stdio: ["ignore", "inherit", "inherit"],
        });
        child.on("error", reject);
        child.on("close", (code) =>
            code === 0
                ? resolve()
                : reject(new Error(`${cmd} exited ${code}`))
        );
    });
}

/** True if a binary is resolvable on PATH (or is an absolute/relative file). */
export async function commandExists(bin) {
    if (!bin) return false;
    if (bin.includes("/")) return true; // explicit path — trust it
    try {
        await runCommand(["/bin/sh", "-c", `command -v ${bin} >/dev/null 2>&1`]);
        return true;
    } catch {
        return false;
    }
}

/** Download an http(s) image URL to outPath. */
export async function downloadTo(url, outPath) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status} for ${url}`);
    if (!res.body) {
        await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
        return;
    }
    await new Promise((resolve, reject) => {
        const file = createWriteStream(outPath);
        Readable.fromWeb(res.body).pipe(file);
        file.on("finish", resolve);
        file.on("error", reject);
    });
}
