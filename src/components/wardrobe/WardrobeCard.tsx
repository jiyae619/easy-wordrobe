import React from 'react';
import { Trash2 } from 'lucide-react';
import { type ClothingItem } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';

interface WardrobeCardProps {
    item: ClothingItem;
}

export const WardrobeCard: React.FC<WardrobeCardProps> = ({ item }) => {
    const { deleteClothingItem } = useWardrobe();

    return (
        <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-muted card-hover">
            {/* Image */}
            <div className="relative aspect-[3/4] bg-olive-50 overflow-hidden">
                <img
                    src={item.imageUrl}
                    alt={item.subcategory}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Color + Pattern badge */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-white/30">
                    <div
                        className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                        style={{ backgroundColor: item.colorHex }}
                    />
                    <span className="text-[10px] font-semibold text-primary capitalize">{item.pattern}</span>
                </div>

                {/* Delete button on hover */}
                <button
                    onClick={(e) => { e.stopPropagation(); deleteClothingItem(item.id); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="font-bold text-sm text-primary truncate capitalize">
                    {item.subcategory}
                </h3>
                <p className="text-[11px] text-olive-400 capitalize mt-0.5">
                    {item.category} • {item.color}
                </p>
            </div>
        </div>
    );
};
