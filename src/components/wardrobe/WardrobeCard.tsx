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
        <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-muted card-hover aspect-[3/4]">
            {/* Image */}
            <img
                src={item.imageUrl}
                alt={item.subcategory}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />



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
