import React from 'react';
import { type ClothingItem } from '../../types';
import { itemName } from '../../utils/itemName';

interface GarmentImageProps {
    item: ClothingItem;
    className?: string;
}

/**
 * One garment photo, filling its box. Every garment is shown the same way — as a photo tile
 * framed by its parent — whether it is a catalog stock shot or the user's own picture, so the
 * closet looks consistent and colours are never altered by blending.
 */
export const GarmentImage: React.FC<GarmentImageProps> = ({ item, className = '' }) => (
    <img
        src={item.thumbnailUrl || item.imageUrl}
        alt={itemName(item)}
        draggable={false}
        loading="lazy"
        decoding="async"
        className={`block object-cover select-none pointer-events-none ${className}`}
    />
);
