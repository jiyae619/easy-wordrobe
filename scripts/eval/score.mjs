// Scoring helpers for intake-model A/B eval.
// Pure functions, no I/O — easy to unit test or tweak independently.

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Euclidean distance in RGB. Not perceptually accurate (real ΔE2000 is better)
// but good enough to rank two models against the same ground truth.
// Range: 0 (identical) to ~441 (black vs white).
export function colorDistance(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function jaccard(setA, setB) {
  const A = new Set((setA || []).map((s) => String(s).toLowerCase()));
  const B = new Set((setB || []).map((s) => String(s).toLowerCase()));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let intersection = 0;
  for (const v of A) if (B.has(v)) intersection += 1;
  return intersection / (A.size + B.size - intersection);
}

export function subcategoryHit(actual, keywords) {
  if (!actual || !Array.isArray(keywords) || keywords.length === 0) return 0;
  const lower = String(actual).toLowerCase();
  return keywords.some((k) => lower.includes(String(k).toLowerCase())) ? 1 : 0;
}

// Compose a single per-image score row from one model's prediction.
// Each sub-score is normalized so "higher is better" across the board,
// which makes the final summary readable as a percentage.
export function scoreOne({ truth, prediction, latencyMs, errored }) {
  if (errored || !prediction) {
    return {
      categoryHit: 0,
      colorScore: 0,
      colorDistance: null,
      subcategoryHit: 0,
      moodJaccard: 0,
      seasonJaccard: 0,
      latencyMs,
      errored: true,
    };
  }

  const categoryHit = prediction.category === truth.expectedCategory ? 1 : 0;
  const dist = colorDistance(prediction.colorHex, truth.expectedColorHex);
  // Invert distance into [0, 1]. 100 RGB units ≈ "noticeably different",
  // so anything closer than that gets partial credit.
  const colorScore = dist === null ? 0 : Math.max(0, 1 - dist / 200);

  return {
    categoryHit,
    colorScore,
    colorDistance: dist,
    subcategoryHit: subcategoryHit(prediction.subcategory, truth.subcategoryKeywords),
    moodJaccard: jaccard(prediction.mood, truth.expectedMoods),
    seasonJaccard: jaccard(prediction.season, truth.expectedSeasons),
    latencyMs,
    errored: false,
  };
}

export function aggregate(rows) {
  const n = rows.length;
  if (n === 0) return null;
  const successful = rows.filter((r) => !r.errored);
  const successRate = successful.length / n;
  const mean = (key) =>
    successful.reduce((sum, r) => sum + (r[key] ?? 0), 0) / Math.max(1, successful.length);

  return {
    n,
    successRate,
    categoryAccuracy: mean("categoryHit"),
    avgColorScore: mean("colorScore"),
    avgColorDistance:
      successful.reduce((sum, r) => sum + (r.colorDistance ?? 0), 0) /
      Math.max(1, successful.length),
    subcategoryHitRate: mean("subcategoryHit"),
    avgMoodJaccard: mean("moodJaccard"),
    avgSeasonJaccard: mean("seasonJaccard"),
    avgLatencyMs: rows.reduce((sum, r) => sum + r.latencyMs, 0) / n,
  };
}
