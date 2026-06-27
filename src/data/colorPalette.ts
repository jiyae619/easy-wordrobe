// Bounded, user-facing color vocabulary for Stylemax.
//
// Names are the only thing shown to users (no hex in the UI). The hex values
// drive "snap to nearest": the AI returns a precise colorHex, we map it to the
// closest palette NAME for display/filtering, and keep the raw hex on the item.
// See `nearestPaletteColor`.

export interface PaletteColor {
    name: string;
    hex: string;
}

export const COLOR_PALETTE: PaletteColor[] = [
    { name: "Black", hex: "#1C1C1C" },
    { name: "Grey", hex: "#8B8F96" },
    { name: "White", hex: "#F4F4F2" },
    { name: "Cream", hex: "#EFE7D3" },
    { name: "Beige", hex: "#D8C7A3" },
    { name: "Brown", hex: "#6F4E37" },
    { name: "Navy", hex: "#1B2A4A" },
    { name: "Blue", hex: "#2F6FED" },
    { name: "Teal", hex: "#2AA198" },
    { name: "Green", hex: "#3F8F50" },
    { name: "Olive", hex: "#6B7233" },
    { name: "Yellow", hex: "#F2C530" },
    { name: "Orange", hex: "#E8842B" },
    { name: "Red", hex: "#C0392B" },
    { name: "Pink", hex: "#E6A4BD" },
    { name: "Purple", hex: "#7E57C2" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Euclidean distance in RGB. Good enough to snap a hex to its nearest named bucket. */
export function colorDistance(a: string, b: string): number | null {
    const x = hexToRgb(a);
    const y = hexToRgb(b);
    if (!x || !y) return null;
    return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
}

/**
 * Snap an arbitrary hex to the nearest palette color (by RGB distance).
 * Falls back to Black if the hex can't be parsed.
 */
export function nearestPaletteColor(hex: string): PaletteColor {
    let best = COLOR_PALETTE[0];
    let bestDist = Infinity;
    for (const color of COLOR_PALETTE) {
        const d = colorDistance(hex, color.hex);
        if (d !== null && d < bestDist) {
            bestDist = d;
            best = color;
        }
    }
    return best;
}
