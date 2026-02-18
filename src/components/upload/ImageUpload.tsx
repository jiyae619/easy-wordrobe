import React, { useState, useRef, type ChangeEvent } from 'react';
import { Upload, Camera, X, Loader2, CheckCircle } from 'lucide-react';
import { awsNovaService } from '../../services/awsNova';
import { type ClothingItem, ClothingCategory, Season } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';

export const ImageUpload: React.FC = () => {
    const { addClothingItem } = useWardrobe();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedItem, setAnalyzedItem] = useState<Partial<ClothingItem> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            await processFile(file);
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            setSelectedImage(base64String);
            await analyzeImage(base64String);
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = async (base64: string) => {
        setIsAnalyzing(true);
        try {
            const result = await awsNovaService.analyzeClothingImage(base64);
            setAnalyzedItem(result);
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Failed to analyze image. Please try again.");
            setSelectedImage(null);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = () => {
        if (analyzedItem && selectedImage) {
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
            addClothingItem(itemToSave);
            setSelectedImage(null);
            setAnalyzedItem(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">

            {!selectedImage ? (
                <div
                    className="border-2 border-dashed border-olive-300 rounded-2xl p-6 md:p-10 text-center hover:border-secondary transition-colors cursor-pointer bg-olive-50/50"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-4 bg-olive-100 rounded-full">
                            <Camera className="w-10 h-10 text-secondary" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-primary">Upload Photos</p>
                            <p className="text-sm text-gray-500 mt-1 hidden md:block">Drag and drop or select files</p>
                            <p className="text-sm text-gray-500 mt-1 md:hidden">Take a photo or choose from gallery</p>
                        </div>

                        <div className="flex flex-col w-full gap-3 mt-4 md:flex-row md:w-auto md:gap-3">
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="w-full md:w-auto px-6 py-3.5 md:py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-olive-700 transition-all active:scale-[0.97] flex items-center justify-center text-base md:text-sm md:bg-olive-100 md:border md:border-olive-200 md:text-secondary md:hover:bg-olive-200 md:order-2"
                            >
                                <Camera className="w-5 h-5 mr-2 md:w-4 md:h-4" />
                                Take Photo
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full md:w-auto px-6 py-3.5 md:py-2.5 bg-olive-100 border border-olive-200 text-secondary rounded-xl font-medium hover:bg-olive-200 transition-all active:scale-[0.97] flex items-center justify-center text-base md:text-sm md:bg-primary md:text-white md:border-0 md:hover:bg-olive-700 md:order-1"
                            >
                                <Upload className="w-5 h-5 mr-2 md:w-4 md:h-4" />
                                Select Photo
                            </button>
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                    <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
                </div>
            ) : (
                <div className="flex flex-col gap-4 md:flex-row md:gap-6 animate-fade-in-up">
                    {/* Image Preview */}
                    <div className="w-full md:w-1/2 relative rounded-2xl overflow-hidden shadow-inner bg-olive-50 aspect-[3/4]">
                        <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                        <button
                            onClick={() => { setSelectedImage(null); setAnalyzedItem(null); }}
                            className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 active:scale-95 transition-transform"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Analysis & Edit Form */}
                    <div className="w-full md:w-1/2 flex flex-col">
                        {isAnalyzing ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <Loader2 className="w-10 h-10 text-secondary animate-spin" />
                                <p className="font-medium text-primary">AI is analyzing your clothing...</p>
                                <p className="text-sm text-gray-500">Detecting color, pattern, and style.</p>
                            </div>
                        ) : analyzedItem ? (
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center space-x-2 text-secondary mb-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-medium">Analysis Complete</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Category</label>
                                    <select
                                        value={analyzedItem.category}
                                        onChange={(e) => setAnalyzedItem({ ...analyzedItem, category: e.target.value as any })}
                                        className="w-full rounded-xl border-olive-200 border p-3 md:p-2.5 focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none bg-white"
                                    >
                                        {Object.values(ClothingCategory).map(cat => (
                                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Item Type</label>
                                    <input
                                        type="text"
                                        value={analyzedItem.subcategory}
                                        onChange={(e) => setAnalyzedItem({ ...analyzedItem, subcategory: e.target.value })}
                                        className="w-full rounded-xl border-olive-200 border p-3 md:p-2.5 focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none bg-white"
                                    />
                                </div>

                                <div className="flex space-x-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-primary mb-1">Color</label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="color"
                                                value={analyzedItem.colorHex}
                                                onChange={(e) => setAnalyzedItem({ ...analyzedItem, colorHex: e.target.value })}
                                                className="h-11 w-11 md:h-10 md:w-10 p-1 rounded-lg border border-olive-200 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={analyzedItem.color}
                                                onChange={(e) => setAnalyzedItem({ ...analyzedItem, color: e.target.value })}
                                                className="flex-1 rounded-xl border-olive-200 border p-3 md:p-2.5 focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleSave}
                                        className="w-full py-4 md:py-3 bg-primary text-white rounded-xl font-semibold hover:bg-olive-700 transition-all active:scale-[0.97] shadow-lg text-base"
                                    >
                                        Add to Wardrobe
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};
