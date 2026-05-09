import React, { useState } from 'react';
import { X, Trash2, Calendar, Hash, Sparkles } from 'lucide-react';
import { type ClothingItem } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';
import { format, differenceInDays } from 'date-fns';
import { awsNovaService } from '../../services/awsNova';

interface ItemDetailModalProps {
    item: ClothingItem;
    onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
    const { deleteClothingItem, updateClothingItem } = useWardrobe();
    const [isReanalyzing, setIsReanalyzing] = useState(false);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            await deleteClothingItem(item.id);
            onClose();
        }
    };

    const toDataUrl = async (imageUrl: string): Promise<string> => {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error('Could not fetch item image');
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Could not read item image'));
            reader.readAsDataURL(blob);
        });
    };

    const handleReanalyze = async () => {
        setIsReanalyzing(true);
        try {
            const imageBase64 = item.imageUrl.startsWith('data:')
                ? item.imageUrl
                : await toDataUrl(item.imageUrl);
            const result = await awsNovaService.analyzeClothingImage(imageBase64);
            if (!result.success) {
                alert(result.message || 'Re-analysis failed. Please try again.');
                return;
            }
            if (result.items.length === 0) {
                alert('Re-analysis failed. Please try again.');
                return;
            }

            const detected = result.items[0];
            await updateClothingItem(item.id, {
                category: detected.category ?? item.category,
                subcategory: detected.subcategory ?? item.subcategory,
                color: detected.color ?? item.color,
                colorHex: detected.colorHex ?? item.colorHex,
                season: detected.season?.length ? detected.season : item.season,
                aiTags: detected.aiTags?.length ? detected.aiTags : item.aiTags,
                userNotes: detected.userNotes ?? item.userNotes ?? '',
            });
            alert('Item updated from AI re-analysis.');
            onClose();
        } catch (error) {
            console.error('[ItemDetailModal] Re-analysis failed:', error);
            alert('Could not re-analyze this item right now.');
        } finally {
            setIsReanalyzing(false);
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

                        {item.subcategory.toLowerCase() === 'unknown' && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-2">
                                    Needs attention
                                </p>
                                <p className="text-sm text-amber-900 mb-3">
                                    This item could not be categorized before. Re-analyze it to recover better outfit suggestions.
                                </p>
                                <button
                                    onClick={handleReanalyze}
                                    disabled={isReanalyzing}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {isReanalyzing ? 'Re-analyzing...' : 'Re-analyze with AI'}
                                </button>
                            </div>
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
