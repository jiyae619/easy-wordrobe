import React, { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Grid3X3, Loader2, CheckCircle, Zap, X } from 'lucide-react';
import { awsNovaService } from '../../services/awsNova';
import { type ClothingItem, ClothingCategory, Season } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';
import { compressImage } from '../../utils/imageUtils';
import { MOODS } from '../../data/moods';

interface CameraScannerOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const ALL_SEASONS = Object.values(Season);

export const CameraScannerOverlay: React.FC<CameraScannerOverlayProps> = ({ isOpen, onClose }) => {
    const { addClothingItem } = useWardrobe();
    const navigate = useNavigate();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedItem, setAnalyzedItem] = useState<Partial<ClothingItem> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);

    // Initialize camera when opened
    useEffect(() => {
        if (isOpen && !selectedImage && !isAnalyzing) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, selectedImage, isAnalyzing]);

    // Sync seasons from analyzed item
    useEffect(() => {
        if (analyzedItem?.season) {
            setSelectedSeasons(analyzedItem.season as string[]);
        }
    }, [analyzedItem?.season]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera access denied or unavailable:", err);
        }
    };

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    if (!isOpen) return null;

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                setSelectedImage(base64String);
                stopCamera();
                await analyzeImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && stream) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                setSelectedImage(base64);
                stopCamera();
                analyzeImage(base64);
            }
        }
    };

    const analyzeImage = async (base64: string) => {
        setIsAnalyzing(true);
        try {
            const result = await awsNovaService.analyzeClothingImage(base64);
            setAnalyzedItem(result);
        } catch (error) {
            console.error("[Scanner] Analysis failed:", error);
            alert("Failed to analyze image. Please try again.");
            setSelectedImage(null);
            startCamera();
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleSeason = (season: string) => {
        setSelectedSeasons(prev =>
            prev.includes(season)
                ? prev.filter(s => s !== season)
                : [...prev, season]
        );
    };

    const handleSave = async () => {
        if (analyzedItem && selectedImage) {
            try {
                const compressedImage = await compressImage(selectedImage, 400, 0.7);
                const itemToSave: Omit<ClothingItem, 'id' | 'dateAdded'> = {
                    imageUrl: compressedImage,
                    category: analyzedItem.category || ClothingCategory.Tops,
                    subcategory: analyzedItem.subcategory || "Unknown",
                    color: analyzedItem.color || "Unknown",
                    colorHex: analyzedItem.colorHex || "#000000",
                    pattern: analyzedItem.pattern || "solid",
                    season: selectedSeasons.length > 0 ? selectedSeasons as Season[] : [Season.Spring],
                    wearFrequency: 0,
                    lastWorn: null,
                    aiTags: [
                        ...(analyzedItem.aiTags || []),
                        ...(selectedMood ? [selectedMood] : [])
                    ],
                    userNotes: analyzedItem.userNotes || ""
                };
                addClothingItem(itemToSave);
                onClose();
                handleReset();
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
        setSelectedSeasons([]);
        setSelectedMood(null);
        startCamera();
    };

    const handleClose = () => {
        stopCamera();
        handleReset();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden">
            {/* Background — camera or selected image */}
            <div className="absolute inset-0 z-0 bg-black">
                {selectedImage ? (
                    <img src={selectedImage} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            {/* Top Bar */}
            <div className="relative z-50 flex items-center justify-between bg-white/90 backdrop-blur-md px-4 py-3 border-b border-olive-100 shadow-sm">
                <button
                    onClick={handleClose}
                    className="flex items-center justify-center w-10 h-10 text-primary hover:bg-olive-50 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-primary text-lg font-bold tracking-tight">AI Wardrobe Scanner</h2>
                <button
                    onClick={() => setShowInfo(true)}
                    className="flex items-center justify-center w-10 h-10 text-primary hover:bg-olive-50 rounded-full transition-colors"
                >
                    <Info className="w-5 h-5" />
                </button>
            </div>

            {/* Info Modal */}
            {showInfo && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-olive-100">
                            <div className="flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-primary">How It Works</h3>
                            </div>
                            <button
                                onClick={() => setShowInfo(false)}
                                className="p-2 text-olive-400 hover:text-primary hover:bg-olive-50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 text-sm text-olive-600 leading-relaxed">
                            <p><strong className="text-primary">1. Capture or Upload</strong> — Take a photo of your clothing item or pick one from your gallery.</p>
                            <p><strong className="text-primary">2. AI Analysis</strong> — Our AI detects the category, color, pattern, and suitable seasons for the item.</p>
                            <p><strong className="text-primary">3. Review & Save</strong> — Adjust the detected details if needed, then add it to your wardrobe.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Results Overlay */}
            {selectedImage && (
                <div className="relative z-50 flex-1 flex items-end justify-center pb-6 px-6">
                    {isAnalyzing ? (
                        <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md text-center border border-white/10 shadow-xl">
                            <Loader2 className="w-10 h-10 text-secondary animate-spin mx-auto mb-3" />
                            <p className="text-white font-medium">AI is analyzing your clothing...</p>
                            <p className="text-white/50 text-sm mt-1">Detecting color, pattern, and style.</p>
                        </div>
                    ) : analyzedItem ? (
                        <div className="bg-black/80 backdrop-blur-xl rounded-2xl w-full max-w-md border border-white/10 max-h-[75vh] overflow-y-auto shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center gap-2 text-secondary p-5 pb-3">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium text-white">Analysis Complete</span>
                            </div>

                            <div className="px-5 pb-5 space-y-4">
                                {/* Category Dropdown — at the top */}
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">Category</label>
                                    <select
                                        value={analyzedItem.category}
                                        onChange={(e) => setAnalyzedItem({ ...analyzedItem, category: e.target.value as any })}
                                        className="w-full rounded-xl bg-black/50 border border-white/20 text-white p-3 text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none"
                                    >
                                        {Object.values(ClothingCategory).map(cat => (
                                            <option key={cat} value={cat} className="text-black">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Detected Color + Pattern chips */}
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-secondary/40">
                                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: analyzedItem.colorHex || '#000' }} />
                                        <span className="text-xs font-semibold uppercase tracking-wide capitalize">{analyzedItem.color}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-secondary/40">
                                        <span className="text-xs font-semibold uppercase tracking-wide capitalize">{analyzedItem.pattern}</span>
                                    </div>
                                </div>

                                {/* Season Tags — selectable */}
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">Seasons</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_SEASONS.map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => toggleSeason(s)}
                                                className={`text-xs px-3 py-1.5 rounded-full capitalize font-semibold transition-all active:scale-95 ${selectedSeasons.includes(s)
                                                        ? 'bg-secondary text-white border border-secondary shadow-md'
                                                        : 'bg-white/10 text-white/60 border border-white/20 hover:border-white/40'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Mood Tags — selectable */}
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">Mood</label>
                                    <div className="flex flex-wrap gap-2">
                                        {MOODS.slice(0, 6).map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => setSelectedMood(prev => prev === m.id ? null : m.id)}
                                                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all active:scale-95 ${selectedMood === m.id
                                                        ? 'bg-primary text-white border border-primary shadow-md'
                                                        : 'bg-white/10 text-white/60 border border-white/20 hover:border-white/40'
                                                    }`}
                                            >
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Tags */}
                                {analyzedItem.aiTags && analyzedItem.aiTags.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-medium text-white/60 mb-1.5">AI Tags</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {analyzedItem.aiTags.map((tag: string) => (
                                                <span key={tag} className="text-xs bg-white/10 text-white/80 px-2.5 py-1 rounded-full border border-white/10">#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all active:scale-[0.97]"
                                    >
                                        Retake
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-olive-700 transition-all active:scale-[0.97] shadow-lg flex items-center justify-center gap-2 border border-primary-light/20"
                                    >
                                        Add to Wardrobe
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Bottom Controls */}
            {!selectedImage && (
                <div className="relative z-50 mt-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-10 px-8">
                    <div className="flex items-center justify-between gap-6 max-w-md mx-auto">
                        {/* Gallery thumbnail */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-14 h-14 rounded-2xl border border-white/30 overflow-hidden bg-black/40 backdrop-blur-md flex items-center justify-center hover:border-white/60 hover:bg-white/10 transition-all"
                        >
                            <Grid3X3 className="w-6 h-6 text-white/80" />
                        </button>

                        {/* Capture button */}
                        <div className="flex flex-col items-center group">
                            <button
                                onClick={capturePhoto}
                                className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-[3px] border-white active:scale-95 transition-all group-hover:bg-white/20"
                            >
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-transform group-active:scale-90">
                                </div>
                            </button>
                            <span className="text-white/80 text-[11px] mt-3 font-bold tracking-[0.25em] uppercase drop-shadow-md">Capture</span>
                        </div>

                        {/* Flash toggle */}
                        <button className="w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-white/30 text-white/80 flex items-center justify-center hover:border-white/60 hover:bg-white/10 transition-all">
                            <Zap className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden file input */}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
        </div>
    );
};
