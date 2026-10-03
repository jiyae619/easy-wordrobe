import React from 'react';
import { type ClothingItem } from '../../types';
import { isStockPhoto } from '../../data/starterCatalog';

interface GarmentImageProps {
    item: ClothingItem;
    className?: string;
    /** Rounded corners for user photos (stock catalog shots are cut-out style and stay unframed). */
    rounded?: string;
}

/**
 * One garment picture. Catalog stock shots are shot on white, so they render as cut-outs
 * (contain, no frame) — the PARENT applies `mix-blend-multiply` where the white should disappear,
 * because blending must happen on the element that is transformed. User photos keep their own
 * background, so they render as a rounded photo card instead.
 */
export const GarmentImage: React.FC<GarmentImageProps> = ({ item, className = '', rounded = 'rounded-2xl' }) => {
    const src = item.thumbnailUrl || item.imageUrl;
    const stock = isStockPhoto(item);
    return (
        <img
            src={src}
            alt={`${item.color} ${item.subcategory}`}
            draggable={false}
            loading="lazy"
            decoding="async"
            className={`select-none pointer-events-none ${stock ? 'object-contain' : `object-cover ${rounded} bg-white shadow-sm`} ${className}`}
        />
    );
};
