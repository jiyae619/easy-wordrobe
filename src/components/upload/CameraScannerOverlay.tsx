import React, { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Grid3X3, Loader2, CheckCircle, Zap, X, ChevronDown } from 'lucide-react';
import { awsNovaService, type DetectedClothingItem } from '../../services/awsNova';
import { type ClothingItem, ClothingCategory, Season } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';
import { compressImage } from '../../utils/imageUtils';
import { prodDiag } from '../../utils/productionDiagnostics';
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

    // Multi-item state
    const [detectedItems, setDetectedItems] = useState<DetectedClothingItem[]>([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);

    // Per-item editable fields
    const [itemName, setItemName] = useState('');
    const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
    const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const currentItem = detectedItems[currentItemIndex] ?? null;
    const totalItems = detectedItems.length;
    const isLastItem = currentItemIndex >= totalItems - 1;

    // Pre-fill editable fields from a detected item
    const prefillFromItem = (item: DetectedClothingItem) => {
        setItemName(`${item.color} ${item.subcategory}`);
        setSelectedSeasons(item.season as string[]);
        setSelectedMoods([]);
    };

    // Initialize camera when opened
    useEffect(() => {
        if (isOpen && !selectedImage && !isAnalyzing) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, selectedImage, isAnalyzing]);

    const startCamera = async () => {
        setCameraError(null);
        prodDiag.cameraStart();
        if (!navigator.mediaDevices?.getUserMedia) {
            prodDiag.cameraError(new Error('Camera not supported in this browser'));
            setCameraError('Camera not supported in this browser.');
            return;
        }
        const originOk = location.protocol === 'https:' || location.hostname === 'localhost';
        prodDiag.cameraOriginCheck(originOk);
        if (!originOk) {
            prodDiag.cameraError(new Error('Camera requires HTTPS or localhost'));
            setCameraError('Camera requires HTTPS or localhost.');
            return;
        }
        try {
            let mediaStream: MediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
            } catch {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            prodDiag.cameraError(err);
            const errMsg = (err as Error)?.message ?? String(err);
            console.error("Camera access denied or unavailable:", err);
            if (errMsg.includes('Permission') || errMsg.includes('denied') || (err as Error)?.name === 'NotAllowedError') {
                setCameraError('Camera permission denied. Allow camera access in your browser settings.');
            } else if (errMsg.includes('NotFound') || (err as Error)?.name === 'NotFoundError') {
                setCameraError('No camera found. Try uploading from gallery instead.');
            } else {
                setCameraError('Camera unavailable. Use the gallery button to upload a photo.');
            }
        }
    };

    const stopCamera = useCallback(() => {
        const s = streamRef.current;
        if (s) {
            s.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

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
        if (videoRef.current && streamRef.current) {
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
        prodDiag.scannerAnalyzeStart();
        try {
            const result = await awsNovaService.analyzeClothingImage(base64);
            if (result.success) {
                prodDiag.scannerAnalyzeEnd(true);
                setDetectedItems(result.items);
                setCurrentItemIndex(0);
                prefillFromItem(result.items[0]);
            } else {
                prodDiag.scannerAnalyzeEnd(false);
                alert(result.message);
                setSelectedImage(null);
                startCamera();
            }
        } catch (error) {
            prodDiag.scannerAnalyzeError(error);
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
            prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season]
        );
    };

    const toggleMood = (moodId: string) => {
        setSelectedMoods(prev =>
            prev.includes(moodId) ? prev.filter(m => m !== moodId) : [...prev, moodId]
        );
    };

    const handleSaveAndContinue = async () => {
        if (!currentItem || !selectedImage) return;
        prodDiag.scannerSaveStart();
        try {
            const compressedImage = await compressImage(selectedImage, 400, 0.7);
            const itemToSave: Omit<ClothingItem, 'id' | 'dateAdded'> = {
                imageUrl: compressedImage,
                category: currentItem.category || ClothingCategory.Tops,
                subcategory: itemName || currentItem.subcategory || "Unknown",
                color: currentItem.color || "Unknown",
                colorHex: currentItem.colorHex || "#000000",
                season: selectedSeasons.length > 0 ? selectedSeasons as Season[] : [Season.Spring],
                wearFrequency: 0,
                lastWorn: null,
                aiTags: selectedMoods,
                userMoods: selectedMoods,
                userNotes: currentItem.userNotes || "",
            };
            await addClothingItem(itemToSave);
            prodDiag.scannerSaveEnd(true);
        } catch (error) {
            prodDiag.scannerSaveError(error);
            console.error("[Scanner] Save failed:", error);
            alert("Failed to save item. Please try again.");
            return;
        }

        if (isLastItem) {
            handleClose();
            navigate('/wardrobe');
        } else {
            advanceToNextItem();
        }
    };

    const handleSkip = () => {
        if (isLastItem) {
            handleClose();
        } else {
            advanceToNextItem();
        }
    };

    const advanceToNextItem = () => {
        const nextIndex = currentItemIndex + 1;
        setCurrentItemIndex(nextIndex);
        prefillFromItem(detectedItems[nextIndex]);
    };

    const handleReset = () => {
        setSelectedImage(null);
        setDetectedItems([]);
        setCurrentItemIndex(0);
        setItemName('');
        setSelectedSeasons([]);
        setSelectedMoods([]);
        setIsAnalyzing(false);
        setCameraError(null);
        startCamera();
    };

    const handleClose = () => {
        stopCamera();
        handleReset();
        onClose();
    };

    return (
        <div className="absolute inset-0 z-[100] flex flex-col bg-black overflow-hidden">
            {/* Background — camera or selected image */}
            <div className="absolute inset-0 z-0 bg-black">
                {selectedImage ? (
                    <img src={selectedImage} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {cameraError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/80 text-center">
                                <p className="text-white font-medium mb-2">{cameraError}</p>
                                <p className="text-white/70 text-sm mb-4">Use the gallery button below to upload a photo instead.</p>
                                <button
                                    onClick={() => { setCameraError(null); startCamera(); }}
                                    className="px-4 py-2 bg-white/20 text-white rounded-xl text-sm font-medium hover:bg-white/30"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </>
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
                <h2 className="text-primary text-lg font-bold tracking-tight">Your Wardrobe Scanner</h2>
                <button
                    onClick={() => setShowInfo(true)}
                    className="flex items-center justify-center w-10 h-10 text-primary hover:bg-olive-50 rounded-full transition-colors"
                >
                    <Info className="w-5 h-5" />
                </button>
            </div>

            {/* Info Modal */}
            {showInfo && (
                <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
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
                            <p><strong className="text-primary">2. AI Analysis</strong> — Our AI detects up to 3 items and prepares each one for review.</p>
                            <p><strong className="text-primary">3. Review & Save</strong> — Edit the name, seasons, and moods for each detected item, then add them one by one.</p>
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
                            <p className="text-white/50 text-sm mt-1">Detecting items, colors, and styles.</p>
                        </div>
                    ) : currentItem ? (
                        <div className="bg-black/60 backdrop-blur-xl rounded-2xl w-full max-w-md border border-white/10 max-h-[58vh] overflow-y-auto no-scrollbar shadow-2xl">
                            {/* Header with counter */}
                            <div className="flex items-center justify-between p-5 pb-3">
                                <div className="flex items-center gap-3 text-white">
                                    {selectedImage && (
                                        <img
                                            src={selectedImage}
                                            alt="Captured"
                                            className="w-10 h-10 rounded-lg object-cover border border-white/20 flex-shrink-0"
                                        />
                                    )}
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-secondary" />
                                        <span className="font-medium">Analysis Complete</span>
                                    </div>
                                </div>
                                {totalItems > 1 && (
                                    <span className="text-xs font-bold px-2.5 py-1 bg-secondary/80 text-white rounded-full">
                                        Item {currentItemIndex + 1} of {totalItems}
                                    </span>
                                )}
                            </div>

                            <div className="px-5 pb-5 space-y-4">
                                {/* Item Name — user-editable */}
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">Item Name</label>
                                    <input
                                        type="text"
                                        value={itemName}
                                        onChange={e => setItemName(e.target.value)}
                                        placeholder="e.g. Navy Blue Crew Neck T-Shirt"
                                        className="w-full rounded-xl bg-black/50 border border-white/20 text-white placeholder-white/30 p-3 text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none"
                                    />
                                </div>

                                {/* Category + Detected Color */}
                                <div className="grid grid-cols-2 gap-3 items-center">
                                    <div className="relative w-full">
                                        <select
                                            aria-label="Category"
                                            value={currentItem.category}
                                            onChange={(e) => {
                                                const updated = [...detectedItems];
                                                updated[currentItemIndex] = { ...currentItem, category: e.target.value as any };
                                                setDetectedItems(updated);
                                            }}
                                            className="w-full h-[30px] rounded-lg bg-black/50 border border-white/20 text-white pl-2.5 pr-8 text-[11px] appearance-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none"
                                        >
                                            {Object.values(ClothingCategory).map(cat => (
                                                <option key={cat} value={cat} className="text-black">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/70 pointer-events-none" />
                                    </div>
                                    <div className="w-full flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-secondary/40 h-[30px]">
                                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: currentItem.colorHex || '#000' }} />
                                        <span className="text-xs font-semibold uppercase tracking-wide capitalize">{currentItem.color}</span>
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

                                {/* Mood Tags — multi-select */}
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">Mood (select all that apply)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {MOODS.map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => toggleMood(m.id)}
                                                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all active:scale-95 ${selectedMoods.includes(m.id)
                                                    ? 'bg-secondary text-white border border-secondary shadow-md'
                                                    : 'bg-white/10 text-white/60 border border-white/20 hover:border-white/40'
                                                    }`}
                                            >
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all active:scale-[0.97] text-sm"
                                    >
                                        Retake
                                    </button>
                                    {totalItems > 1 && (
                                        <button
                                            onClick={handleSkip}
                                            className="px-4 py-3 bg-white/10 border border-white/20 text-white/70 rounded-xl font-semibold hover:bg-white/20 transition-all active:scale-[0.97] text-sm"
                                        >
                                            Skip
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSaveAndContinue}
                                        className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-olive-700 transition-all active:scale-[0.97] shadow-lg flex items-center justify-center gap-2 border border-primary-light/20 text-sm"
                                    >
                                        {isLastItem ? 'Add to Wardrobe' : 'Add & Continue'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Bottom Controls — camera live view */}
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
