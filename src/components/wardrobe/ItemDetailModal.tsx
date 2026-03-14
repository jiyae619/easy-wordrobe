import React from 'react';
import { X, Trash2, Calendar, Hash } from 'lucide-react';
import { type ClothingItem } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';
import { format, differenceInDays } from 'date-fns';

interface ItemDetailModalProps {
    item: ClothingItem;
    onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
    const { deleteClothingItem } = useWardrobe();

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            await deleteClothingItem(item.id);
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
            <div
                className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                style={{ maxHeight: 'min(85vh, 640px)', animation: 'scaleIn 0.25s ease-out' }}
            >
                {/* Image Header — fixed height, clipped */}
                <div className="relative flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center" style={{ height: '220px' }}>
                    <img
                        src={item.imageUrl}
                        alt={item.subcategory}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '8px' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-4 left-5 right-5 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-secondary/80 backdrop-blur-sm rounded-md text-[10px] font-bold uppercase tracking-wider">
                                {item.category}
                            </span>
                            <span className="text-xs opacity-80">Added {format(new Date(item.dateAdded), 'MMM d, yyyy')}</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">{item.subcategory}</h2>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="p-5 space-y-5">
                        {/* Key Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-olive-50 rounded-xl border border-olive-100 flex items-center gap-3">
                                <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                                    <Hash className="w-4 h-4 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-olive-400 uppercase tracking-wider">Total Wears</p>
                                    <p className="text-lg font-bold text-primary">{item.wearFrequency}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-olive-50 rounded-xl border border-olive-100 flex items-center gap-3">
                                <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-4 h-4 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-olive-400 uppercase tracking-wider">Last Worn</p>
                                    <p className="text-sm font-bold text-primary truncate">
                                        {item.lastWorn
                                            ? (() => {
                                                const days = differenceInDays(new Date(), new Date(item.lastWorn));
                                                return days === 0 ? 'Today' : `${days}d ago`;
                                            })()
                                            : 'Never'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        {item.aiTags && item.aiTags.length > 0 && (
                            <section className="flex flex-wrap gap-2">
                                {item.aiTags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-olive-100 text-secondary text-xs font-semibold rounded-full">
                                        #{tag}
                                    </span>
                                ))}
                            </section>
                        )}
                    </div>
                </div>

                {/* Actions — fixed at bottom */}
                <div className="flex-shrink-0 bg-white border-t border-olive-100 p-4 flex gap-3">
                    <button
                        onClick={handleDelete}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors active:scale-[0.98]"
                    >
                        <Trash2 className="w-4 h-4" />
                        Remove
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-olive-800 transition-colors active:scale-[0.98]"
                    >
                        Got it
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};
