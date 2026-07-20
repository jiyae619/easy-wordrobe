// Vision-model adapters for the intake A/B eval.
// Both providers take a base64 image + the same prompt and return
// the same shape: { category, subcategory, color, colorHex, season, mood }.

const INTAKE_PROMPT = `You are a fashion AI assistant analyzing a single clothing item for a digital wardrobe app.

Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "category": "tops" | "bottoms" | "outerwear" | "dresses",
  "subcategory": "specific descriptive label, e.g. Crew Neck T-Shirt",
  "color": "dominant color name in plain English",
  "colorHex": "#RRGGBB",
  "season": ["spring" | "summer" | "fall" | "winter", ...],
  "mood": ["professional" | "casual" | "sporty" | "creative" | "romantic", ...]
}

If multiple items are visible, describe the most prominent one only.`;

function stripFence(text) {
  let s = String(text || "").trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  const start = Math.min(
    ...[s.indexOf("{"), s.indexOf("[")].filter((i) => i >= 0)
  );
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (Number.isFinite(start) && end > start) s = s.slice(start, end + 1);
  return s;
}

function firstObject(parsed) {
  if (Array.isArray(parsed)) return parsed[0] ?? null;
  return parsed;
}

// ----- AWS Nova 2 Lite via Bedrock Converse -----
export async function novaProvider({ base64, format, region, apiKey, timeoutMs = 30000 }) {
  const modelId = "us.amazon.nova-2-lite-v1:0";
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;

  const payload = {
    messages: [
      {
        role: "user",
        content: [
          { image: { format, source: { bytes: base64 } } },
          { text: INTAKE_PROMPT },
        ],
      },
    ],
    inferenceConfig: { maxTokens: 1024, temperature: 0.2 },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Nova ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const text = (json?.output?.message?.content || [])
      .map((c) => c.text || "")
      .join("\n")
      .trim();
    return firstObject(JSON.parse(stripFence(text)));
  } finally {
    clearTimeout(timer);
  }
}

// ----- Gemini 2.5 Flash via Google AI Studio REST -----
export async function geminiProvider({ base64, mimeType, apiKey, model = "gemini-2.5-flash", timeoutMs = 30000 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: INTAKE_PROMPT },
        ],
      },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: "application/json" },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const text = (json?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("\n")
      .trim();
    return firstObject(JSON.parse(stripFence(text)));
  } finally {
    clearTimeout(timer);
  }
}
