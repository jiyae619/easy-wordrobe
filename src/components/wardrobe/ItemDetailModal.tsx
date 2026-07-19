import React, { useRef, useState } from 'react';
import { X, Trash2, Calendar, Hash, Sparkles, Check, Camera, Loader2 } from 'lucide-react';
import { type ClothingItem, ClothingCategory } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';
import { format, differenceInDays } from 'date-fns';
import { awsNovaService } from '../../services/awsNova';
import { COLOR_PALETTE } from '../../data/colorPalette';
import { isStockPhoto } from '../../data/starterCatalog';
import { compressImage } from '../../utils/imageUtils';

interface ItemDetailModalProps {
    item: ClothingItem;
    onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
    const { deleteClothingItem, updateClothingItem, correctItemColor, replaceItemPhoto } = useWardrobe();
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [displayColor, setDisplayColor] = useState<{ name: string; hex: string }>({ name: item.color, hex: item.colorHex });
    const [colorSheetOpen, setColorSheetOpen] = useState(false);
    const [displayImage, setDisplayImage] = useState(item.imageUrl);
    const [showStockBadge, setShowStockBadge] = useState(isStockPhoto(item));
    const [isReplacingPhoto, setIsReplacingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const [displayName, setDisplayName] = useState(item.subcategory);
    const [displayCategory, setDisplayCategory] = useState<ClothingCategory>(item.category);

    const handlePickColor = async (c: { name: string; hex: string }) => {
        setDisplayColor(c);
        setColorSheetOpen(false);
        await correctItemColor(item.id, c);
    };

    const handleRename = async () => {
        const trimmed = displayName.trim();
        if (!trimmed || trimmed === item.subcategory) return;
        await updateClothingItem(item.id, { subcategory: trimmed });
    };

    const handleCategory = async (cat: ClothingCategory) => {
        if (cat === displayCategory) return;
        setDisplayCategory(cat);
        await updateClothingItem(item.id, { category: cat });
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            await deleteClothingItem(item.id);
            onClose();
        }
    };

    const handleReplacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (!file) return;
        setIsReplacingPhoto(true);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Could not read the photo'));
                reader.readAsDataURL(file);
            });
            const compressed = await compressImage(dataUrl, 510, 0.85);
            const newUrl = await replaceItemPhoto(item.id, compressed);
            if (newUrl) {
                setDisplayImage(newUrl);
                setShowStockBadge(false);
            }
        } catch (error) {
            console.error('[ItemDetailModal] Photo replacement failed:', error);
            alert('Could not replace the photo right now.');
        } finally {
            setIsReplacingPhoto(false);
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
                        src={displayImage}
                        alt={item.subcategory}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '8px' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                    {/* Stock-photo provenance + one-tap replacement with the user's own shot */}
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReplacePhoto}
                    />
                    {showStockBadge && (
                        <>
                            <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-semibold rounded-full">
                                Stock photo
                            </span>
                            <button
                                onClick={() => photoInputRef.current?.click()}
                                disabled={isReplacingPhoto}
                                className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-md text-primary text-xs font-semibold rounded-full hover:bg-white transition-colors active:scale-[0.97] disabled:opacity-60"
                            >
                                {isReplacingPhoto ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                                ) : (
                                    <><Camera className="w-3.5 h-3.5" /> Use my photo</>
                                )}
                            </button>
                        </>
                    )}

                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-4 left-5 right-5 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-secondary/80 backdrop-blur-sm rounded-md text-[10px] font-bold uppercase tracking-wider">
                                {displayCategory}
                            </span>
                            <span className="text-xs opacity-80">Added {format(new Date(item.dateAdded), 'MMM d, yyyy')}</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">{displayName}</h2>
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

                        {/* Name (subcategory) — editable in case scan got it wrong */}
                        <div>
                            <p className="text-[10px] font-bold text-olive-400 uppercase tracking-wider mb-2">Name</p>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                onBlur={handleRename}
                                className="w-full rounded-xl border border-olive-100 bg-olive-50 p-3 text-sm font-bold text-primary focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
                            />
                        </div>

                        {/* Category — editable */}
                        <div>
                            <p className="text-[10px] font-bold text-olive-400 uppercase tracking-wider mb-2">Category</p>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.values(ClothingCategory).map((cat) => {
                                    const selected = displayCategory === cat;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => handleCategory(cat)}
                                            className={`py-2 rounded-lg text-xs font-bold capitalize border transition-colors ${selected ? 'border-secondary bg-olive-50 text-primary' : 'border-olive-100 bg-white text-secondary hover:bg-olive-50'}`}
                                        >
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color — user calibration: shows the snapped palette name (no hex), logs each correction as eval data */}
                        <div>
                            <p className="text-[10px] font-bold text-olive-400 uppercase tracking-wider mb-2">Color</p>
                            <div className="flex items-center gap-3 p-3 bg-olive-50 rounded-xl border border-olive-100">
                                <span className="w-8 h-8 rounded-lg border border-black/10 flex-shrink-0" style={{ backgroundColor: displayColor.hex }} />
                                <span className="text-sm font-bold text-primary flex-1">{displayColor.name}</span>
                                <button
                                    onClick={() => setColorSheetOpen((o) => !o)}
                                    className="text-xs font-bold text-secondary bg-white border border-olive-100 rounded-lg px-3 py-1.5 hover:bg-olive-100 transition-colors"
                                >
                                    {colorSheetOpen ? 'Close' : 'Edit'}
                                </button>
                            </div>
                            {colorSheetOpen && (
                                <div className="mt-3">
                                    <p className="text-xs text-olive-400 mb-2">Pick the correct color:</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {COLOR_PALETTE.map((c) => {
                                            const selected = displayColor.name === c.name;
                                            return (
                                                <button
                                                    key={c.name}
                                                    onClick={() => handlePickColor(c)}
                                                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${selected ? 'border-secondary bg-olive-50' : 'border-transparent hover:bg-olive-50'}`}
                                                >
                                                    <span className="w-7 h-7 rounded-lg border border-black/10" style={{ backgroundColor: c.hex }} />
                                                    <span className="text-[10px] font-semibold text-primary">{c.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-olive-800 transition-colors active:scale-[0.98]"
                    >
                        <Check className="w-4 h-4" />
                        Confirm
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
