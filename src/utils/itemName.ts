import type { ClothingItem } from '../types';

/**
 * Display name for a piece: colour + name, without doubling the colour when the name already
 * starts with it (older scans saved names like "Navy Striped Shirt").
 */
export function itemName(item: Pick<ClothingItem, 'color' | 'subcategory'>): string {
    const color = (item.color ?? '').trim();
    const name = (item.subcategory ?? '').trim();
    if (!color || color.toLowerCase() === 'unknown') return name;
    if (name.toLowerCase().startsWith(color.toLowerCase())) return name;
    return `${color} ${name}`;
}
