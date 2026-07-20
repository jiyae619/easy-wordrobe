import { useMemo, useState } from "react";
import { listProviders } from "../services/vision/providerRegistry";
import { createAgentTraceId } from "../services/agents/agentTelemetry";
import type { VisionProvider } from "../services/vision/VisionProvider";

// Same prompt the IntakeAgent uses, trimmed to the parts that matter for keyword
// interpretation (we don't need bbox/confidence for visual sanity checking).
const TEST_PROMPT = `You are a fashion AI assistant analyzing a single clothing item for a digital wardrobe app.

Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "category": "tops" | "bottoms" | "outerwear" | "dresses",
  "subcategory": "specific descriptive label, e.g. Crew Neck T-Shirt, Slim-Fit Chinos",
  "color": "dominant color name in plain English",
  "colorHex": "#RRGGBB",
  "season": ["spring" | "summer" | "fall" | "winter", ...],
  "mood": ["professional" | "casual" | "sporty" | "creative" | "romantic", ...]
}

If multiple items are visible, describe the most prominent one only.`;

interface ProviderResult {
    providerId: string;
    providerLabel: string;
    status: "idle" | "loading" | "ok" | "error";
    latencyMs?: number;
    rawJson?: string;
    parsed?: Record<string, unknown>;
    parseError?: string;
    error?: string;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result);
            const comma = dataUrl.indexOf(",");
            resolve({
                base64: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl,
                mimeType: file.type || "image/jpeg",
                dataUrl,
            });
        };
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

function safeParse(raw: string): { parsed?: Record<string, unknown>; parseError?: string } {
    try {
        const parsed = JSON.parse(raw);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        if (obj && typeof obj === "object") return { parsed: obj as Record<string, unknown> };
        return { parseError: "Top-level JSON was not an object" };
    } catch (err) {
        return { parseError: err instanceof Error ? err.message : String(err) };
    }
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-1 mb-1"
            style={{
                backgroundColor: color ? `${color}22` : "#e5e7eb",
                color: color ?? "#374151",
                border: color ? `1px solid ${color}55` : "1px solid #d1d5db",
            }}
        >
            {children}
        </span>
    );
}

function ParsedView({ parsed }: { parsed: Record<string, unknown> }) {
    const category = String(parsed.category ?? "—");
    const subcategory = String(parsed.subcategory ?? "—");
    const color = String(parsed.color ?? "—");
    const colorHex = typeof parsed.colorHex === "string" ? parsed.colorHex : undefined;
    const season = Array.isArray(parsed.season) ? parsed.season.map(String) : [];
    const mood = Array.isArray(parsed.mood) ? parsed.mood.map(String) : [];

    return (
        <div className="text-sm space-y-2">
            <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Category</div>
                <div className="font-medium">{category}</div>
            </div>
            <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Subcategory</div>
                <div className="font-medium">{subcategory}</div>
            </div>
            <div className="flex items-center gap-3">
                <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Color</div>
                    <div className="font-medium">{color} <span className="text-gray-500 font-mono text-xs">{colorHex ?? ""}</span></div>
                </div>
                {colorHex && (
                    <div
                        className="w-10 h-10 rounded border border-gray-300"
                        style={{ backgroundColor: colorHex }}
                        title={colorHex}
                    />
                )}
            </div>
            <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Season</div>
                <div>{season.length ? season.map((s) => <Chip key={s}>{s}</Chip>) : <span className="text-gray-400 text-xs">none</span>}</div>
            </div>
            <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Mood</div>
                <div>{mood.length ? mood.map((m) => <Chip key={m}>{m}</Chip>) : <span className="text-gray-400 text-xs">none</span>}</div>
            </div>
        </div>
    );
}

export default function DevModelTest() {
    const providers: VisionProvider[] = useMemo(() => listProviders(), []);
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMime, setImageMime] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, ProviderResult>>(
        () => Object.fromEntries(providers.map((p) => [p.id, { providerId: p.id, providerLabel: p.label, status: "idle" }]))
    );
    const [busy, setBusy] = useState(false);

    async function onFileChange(file: File | null) {
        if (!file) return;
        const { base64, mimeType, dataUrl } = await fileToBase64(file);
        setImageDataUrl(dataUrl);
        setImageBase64(base64);
        setImageMime(mimeType);
        setResults(Object.fromEntries(providers.map((p) => [p.id, { providerId: p.id, providerLabel: p.label, status: "idle" }])));
    }

    async function runAll() {
        if (!imageBase64 || !imageMime) return;
        setBusy(true);

        const loading: Record<string, ProviderResult> = Object.fromEntries(
            providers.map((p) => [p.id, { providerId: p.id, providerLabel: p.label, status: p.isConfigured() ? "loading" : "error", error: p.isConfigured() ? undefined : "Not configured (missing API key)" }])
        );
        setResults(loading);

        await Promise.all(
            providers.map(async (provider) => {
                if (!provider.isConfigured()) return;
                const traceId = createAgentTraceId("intake");
                const startedAt = performance.now();
                try {
                    const rawJson = await provider.call(
                        { imageBase64: imageBase64!, mimeType: imageMime!, systemPrompt: TEST_PROMPT, maxTokens: 1024, temperature: 0.2 },
                        { agent: "intake", traceId }
                    );
                    const latencyMs = performance.now() - startedAt;
                    const { parsed, parseError } = safeParse(rawJson);
                    setResults((prev) => ({
                        ...prev,
                        [provider.id]: { providerId: provider.id, providerLabel: provider.label, status: "ok", latencyMs, rawJson, parsed, parseError },
                    }));
                } catch (err) {
                    const latencyMs = performance.now() - startedAt;
                    setResults((prev) => ({
                        ...prev,
                        [provider.id]: { providerId: provider.id, providerLabel: provider.label, status: "error", latencyMs, error: err instanceof Error ? err.message : String(err) },
                    }));
                }
            })
        );

        setBusy(false);
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Vision model test bench</h1>
                <p className="text-gray-600 text-sm mt-1">
                    Upload one clothing image, run it through every configured vision provider, and compare how each
                    interprets the category, color, and mood keywords. Dev-only; not linked from main navigation.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <label className="block">
                        <div className="text-sm font-medium mb-2">Image</div>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm border border-gray-300 rounded p-2"
                        />
                    </label>
                    {imageDataUrl && (
                        <div className="mt-3">
                            <img src={imageDataUrl} alt="upload preview" className="rounded border border-gray-200 max-h-72 object-contain w-full bg-gray-50" />
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={runAll}
                        disabled={!imageBase64 || busy}
                        className="mt-4 w-full px-4 py-2 rounded bg-black text-white text-sm font-medium disabled:opacity-40"
                    >
                        {busy ? "Running…" : `Run on ${providers.length} provider${providers.length === 1 ? "" : "s"}`}
                    </button>

                    <div className="mt-4 text-xs text-gray-500">
                        <div className="font-semibold mb-1">Registered providers</div>
                        <ul className="space-y-0.5">
                            {providers.map((p) => (
                                <li key={p.id}>
                                    <span className="font-mono">{p.id}</span>{" "}
                                    {p.isConfigured() ? <span className="text-green-600">configured</span> : <span className="text-amber-600">missing key</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    {providers.map((provider) => {
                        const result = results[provider.id];
                        return (
                            <div key={provider.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                <div className="flex items-baseline justify-between mb-3">
                                    <div>
                                        <div className="font-semibold">{provider.label}</div>
                                        <div className="text-xs font-mono text-gray-500">{provider.id}</div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {result.status === "loading" && "running…"}
                                        {result.status === "ok" && result.latencyMs != null && `${Math.round(result.latencyMs)} ms`}
                                        {result.status === "error" && <span className="text-red-600">error</span>}
                                        {result.status === "idle" && "idle"}
                                    </div>
                                </div>

                                {result.status === "error" && (
                                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{result.error}</div>
                                )}
                                {result.status === "ok" && result.parsed && <ParsedView parsed={result.parsed} />}
                                {result.status === "ok" && result.parseError && (
                                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                                        Returned text was not valid JSON: {result.parseError}
                                    </div>
                                )}
                                {result.status === "ok" && result.rawJson && (
                                    <details className="mt-3">
                                        <summary className="text-xs text-gray-500 cursor-pointer">Raw JSON response</summary>
                                        <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-64">{result.rawJson}</pre>
                                    </details>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
