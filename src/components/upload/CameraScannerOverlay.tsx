import React, { useState, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Info, Zap, Grid3X3, Loader2, CheckCircle } from 'lucide-react';
import { awsNovaService } from '../../services/awsNova';
import { type ClothingItem, ClothingCategory, Season } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';

interface CameraScannerOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CameraScannerOverlay: React.FC<CameraScannerOverlayProps> = ({ isOpen, onClose }) => {
    const { addClothingItem } = useWardrobe();
    const navigate = useNavigate();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedItem, setAnalyzedItem] = useState<Partial<ClothingItem> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                setSelectedImage(base64String);
                await analyzeImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeImage = async (base64: string) => {
        setIsAnalyzing(true);
        try {
            console.log("[Scanner] Starting image analysis...");
            const result = await awsNovaService.analyzeClothingImage(base64);
            console.log("[Scanner] Analysis result:", result);
            setAnalyzedItem(result);
        } catch (error) {
            console.error("[Scanner] Analysis failed:", error);
            alert("Failed to analyze image. Please try again.");
            setSelectedImage(null);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = () => {
        if (analyzedItem && selectedImage) {
            try {
                const itemToSave: Omit<ClothingItem, 'id' | 'dateAdded'> = {
                    imageUrl: selectedImage,
                    category: analyzedItem.category || ClothingCategory.Tops,
                    subcategory: analyzedItem.subcategory || "Unknown",
                    color: analyzedItem.color || "Unknown",
                    colorHex: analyzedItem.colorHex || "#000000",
                    pattern: analyzedItem.pattern || "solid",
                    season: analyzedItem.season || [Season.Spring],
                    wearFrequency: 0,
                    lastWorn: null,
                    aiTags: analyzedItem.aiTags || [],
                    userNotes: analyzedItem.userNotes || ""
                };
                console.log("[Scanner] Saving item:", itemToSave.subcategory);
                addClothingItem(itemToSave);
                // Close overlay first, then navigate
                onClose();
                handleReset();
                // Navigate to wardrobe so user sees their new item
                navigate('/wardrobe');
            } catch (error) {
                console.error("[Scanner] Save failed:", error);
                alert("Failed to save item. Please try again.");
            }
        }
    };

    const handleReset = () => {
        setSelectedImage(null);
        setAnalyzedItem(null);
        setIsAnalyzing(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden">
            {/* Background — camera placeholder or selected image */}
            <div className="absolute inset-0 z-0">
                {selectedImage ? (
                    <img src={selectedImage} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-olive-900 to-black flex items-center justify-center">
                        <Camera className="w-20 h-20 text-white/10" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Top Bar */}
            <div className="relative z-50 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
                <button
                    onClick={handleClose}
                    className="flex items-center justify-center w-12 h-12 text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-white text-lg font-bold tracking-tight">AI Wardrobe Scanner</h2>
                <button className="flex items-center justify-center w-12 h-12 text-white">
                    <Info className="w-5 h-5" />
                </button>
            </div>

            {/* Scanner Viewport */}
            {!selectedImage && (
                <div className="relative flex-1 flex items-center justify-center px-8">
                    {/* Scanner sweep line */}
                    <div className="scanner-line" />

                    {/* Bounding box */}
                    <div className="absolute top-[25%] left-[15%] right-[15%] bottom-[25%] rounded-xl border-2 border-secondary/50 shadow-[0_0_10px_rgba(107,127,94,0.5)]">
                        {/* Corner brackets */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-secondary rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-secondary rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-secondary rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-secondary rounded-br-lg" />

                        {/* Center text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-white/60 text-sm font-medium text-center px-4">
                                Point camera at your clothing item
                            </p>
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <p className="text-white text-sm font-medium bg-secondary/80 px-4 py-1.5 rounded-full shadow-lg">
                            AWS NOVA Ready
                        </p>
                    </div>
                </div>
            )}

            {/* Analysis Results Overlay */}
            {selectedImage && (
                <div className="relative z-50 flex-1 flex items-end justify-center pb-6 px-6">
                    {isAnalyzing ? (
                        <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md text-center border border-white/10">
                            <Loader2 className="w-10 h-10 text-secondary animate-spin mx-auto mb-3" />
                            <p className="text-white font-medium">AI is analyzing your clothing...</p>
                            <p className="text-white/50 text-sm mt-1">Detecting color, pattern, and style.</p>
                        </div>
                    ) : analyzedItem ? (
                        <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-5 w-full max-w-md border border-white/10 max-h-[65vh] overflow-y-auto">
                            <div className="flex items-center gap-2 text-secondary mb-3">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium text-white">Analysis Complete</span>
                            </div>

                            {/* Item name */}
                            {analyzedItem.subcategory && analyzedItem.subcategory !== "Unknown" && (
                                <p className="text-white text-lg font-semibold mb-3">{analyzedItem.subcategory}</p>
                            )}

                            {/* Detected tags */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-secondary/40">
                                    <CheckCircle className="w-4 h-4 text-secondary" />
                                    <span className="text-xs font-semibold uppercase tracking-wide capitalize">{analyzedItem.category}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-secondary/40">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: analyzedItem.colorHex || '#000' }} />
                                    <span className="text-xs font-semibold uppercase tracking-wide capitalize">{analyzedItem.color}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-secondary/40">
                                    <span className="text-xs font-semibold uppercase tracking-wide capitalize">{analyzedItem.pattern}</span>
                                </div>
                            </div>

                            {/* Season chips */}
                            {analyzedItem.season && analyzedItem.season.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">Seasons</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {analyzedItem.season.map((s: string) => (
                                            <span key={s} className="text-xs bg-secondary/20 text-secondary border border-secondary/30 px-2.5 py-1 rounded-full capitalize">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Tags */}
                            {analyzedItem.aiTags && analyzedItem.aiTags.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">AI Tags</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {analyzedItem.aiTags.map((tag: string) => (
                                            <span key={tag} className="text-xs bg-white/10 text-white/80 px-2.5 py-1 rounded-full">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Edit fields */}
                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1">Category</label>
                                    <select
                                        value={analyzedItem.category}
                                        onChange={(e) => setAnalyzedItem({ ...analyzedItem, category: e.target.value as any })}
                                        className="w-full rounded-xl bg-white/10 border border-white/20 text-white p-2.5 text-sm focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
                                    >
                                        {Object.values(ClothingCategory).map(cat => (
                                            <option key={cat} value={cat} className="text-black">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1">Item Type</label>
                                    <input
                                        type="text"
                                        value={analyzedItem.subcategory}
                                        onChange={(e) => setAnalyzedItem({ ...analyzedItem, subcategory: e.target.value })}
                                        className="w-full rounded-xl bg-white/10 border border-white/20 text-white p-2.5 text-sm focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all active:scale-[0.97]"
                                >
                                    Retake
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-olive-700 transition-all active:scale-[0.97] shadow-lg"
                                >
                                    Add to Wardrobe
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Bottom Controls */}
            {!selectedImage && (
                <div className="relative z-50 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10 pb-8 px-8">
                    <div className="flex items-center justify-between gap-6 max-w-md mx-auto">
                        {/* Gallery thumbnail */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-14 h-14 rounded-xl border-2 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center hover:border-white/60 transition-colors"
                        >
                            <Grid3X3 className="w-6 h-6 text-white/60" />
                        </button>

                        {/* Capture button */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-4 border-white active:scale-95 transition-transform"
                            >
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(107,127,94,0.4)]">
                                    <Camera className="w-8 h-8 text-primary" />
                                </div>
                            </button>
                            <span className="text-white text-[10px] mt-2 font-bold tracking-[0.2em] uppercase">Capture</span>
                        </div>

                        {/* Flash toggle */}
                        <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
                            <Zap className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden file inputs */}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
        </div>
    );
};
