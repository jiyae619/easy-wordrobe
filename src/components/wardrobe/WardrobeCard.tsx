import React from 'react';
import { Trash2 } from 'lucide-react';
import { type ClothingItem } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';

interface WardrobeCardProps {
    item: ClothingItem;
    onClick?: () => void;
}

export const WardrobeCard: React.FC<WardrobeCardProps> = ({ item, onClick }) => {
    const { deleteClothingItem } = useWardrobe();
    // The displayed bitmap is already focus-cropped at save time (see
    // CameraScannerOverlay.handleSaveAndContinue: cropImageWithFocus + cropImageByRect
    // bake the user's focusPoint/focusZoom/focusRoi into primaryImage). At render time
    // we just center it.
    const displayImage = item.thumbnailUrl || item.imageUrl;
    const isMultiItemScan = (item.scanItemCount ?? 1) > 1;

    return (
        <div
            onClick={onClick}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onClick) {
                    e.preventDefault();
                    onClick();
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open details for ${item.subcategory}`}
            className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-muted card-hover aspect-square cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/40"
        >
            {/* Image */}
            {isMultiItemScan ? (
                <div className="relative w-full h-full bg-olive-50 overflow-hidden">
                    <img
                        src={displayImage}
                        alt={item.subcategory}
                        className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            ) : (
                <div className="w-full h-full bg-olive-50 overflow-hidden flex items-center justify-center">
                    <img
                        src={displayImage}
                        alt={item.subcategory}
                        className="w-full h-auto max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            )}

            {item.subcategory.toLowerCase() === 'unknown' && (
                <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wide border border-amber-300">
                    Needs attention
                </div>
            )}



            {/* Delete button on hover */}
            <button
                onClick={(e) => { e.stopPropagation(); deleteClothingItem(item.id); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};
