import React from 'react';
import { type ClothingItem } from '../../types';
import { WardrobeCard } from './WardrobeCard';
import { Shirt, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WardrobeGridProps {
    items: ClothingItem[];
    isLoading?: boolean;
}

export const WardrobeGrid: React.FC<WardrobeGridProps> = ({ items, isLoading }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-3 gap-3 md:gap-5">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden border border-muted">
                        <div className="aspect-[3/4] skeleton" />
                    </div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-olive-200 text-center">
                <div className="p-4 bg-olive-100 rounded-full mb-4">
                    <Shirt className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-1">Your wardrobe is empty</h3>
                <p className="text-gray-500 mb-6 max-w-md text-sm">
                    Start building your digital closet by uploading photos of your clothing.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center px-5 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-olive-700 transition-all active:scale-[0.97]"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Item
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-3 md:gap-5">
            {items.map(item => (
                <WardrobeCard key={item.id} item={item} />
            ))}
        </div>
    );
};
