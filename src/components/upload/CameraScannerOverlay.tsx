import React, { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Grid3X3, Loader2, CheckCircle, Zap, X, ChevronDown, Check } from 'lucide-react';
import { awsNovaService, type DetectedClothingItem } from '../../services/awsNova';
import { type ClothingItem, ClothingCategory, Season } from '../../types';
import { useWardrobe } from '../../context/WardrobeContext';
import { compressImage, cropImageByRect, cropImageToBoundingBox, cropImageWithFocus } from '../../utils/imageUtils';
import { prodDiag } from '../../utils/productionDiagnostics';
import { MOODS } from '../../data/moods';
import { COLOR_PALETTE } from '../../data/colorPalette';
import type { ItemBoundingBox } from '../../types';
import { normalizeMoodIds } from '../../services/agents/agentOutputGuards';

interface CameraScannerOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const ALL_SEASONS = Object.values(Season);
const OVERLAP_WARNING_THRESHOLD = 0.45;
type FocusCalibration = {
    x: number;
    y: number;
    zoom: number;
    roi: { x: number; y: number; width: number; height: number };
};
type PixelRect = { x: number; y: number; width: number; height: number };
type DragState = {
    startX: number;
    startY: number;
    startFocusX: number;
    startFocusY: number;
};
type RoiHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type RoiDragState = {
    mode: 'move' | 'resize';
    handle?: RoiHandle;
    startX: number;
    startY: number;
    startRoi: { x: number; y: number; width: number; height: number };
};

const getOverlapRatio = (a?: ItemBoundingBox, b?: ItemBoundingBox): number => {
    if (!a || !b) return 0;
    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;
    const bRight = b.x + b.width;
    const bBottom = b.y + b.height;

    const intersectionWidth = Math.max(0, Math.min(aRight, bRight) - Math.max(a.x, b.x));
    const intersectionHeight = Math.max(0, Math.min(aBottom, bBottom) - Math.max(a.y, b.y));
    const intersectionArea = intersectionWidth * intersectionHeight;
    if (intersectionArea <= 0) return 0;

    const minArea = Math.min(a.width * a.height, b.width * b.height);
    if (minArea <= 0) return 0;
    return intersectionArea / minArea;
};

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
    const [colorSheetOpen, setColorSheetOpen] = useState(false);
    const [focusCalibrations, setFocusCalibrations] = useState<Record<number, FocusCalibration>>({});
    const [isDraggingFocus, setIsDraggingFocus] = useState(false);
    const [isCropEditorOpen, setIsCropEditorOpen] = useState(false);
    const [originalImageAspect, setOriginalImageAspect] = useState(1);
    const [cropPreviewImage, setCropPreviewImage] = useState<string | null>(null);
    const [confirmedCropItems, setConfirmedCropItems] = useState<Record<number, boolean>>({});
    const dragStateRef = useRef<DragState | null>(null);
    const roiDragStateRef = useRef<RoiDragState | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);
    const cropSnapshotRef = useRef<FocusCalibration | null>(null);
    const currentFocusRef = useRef<FocusCalibration>({ x: 50, y: 50, zoom: 1.1, roi: { x: 15, y: 15, width: 70, height: 70 } });
    const currentItemIndexRef = useRef<number>(0);
    const focusViewportRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const safeAreaTop = 'env(safe-area-inset-top, 0px)';
    const safeAreaBottom = 'env(safe-area-inset-bottom, 0px)';

    const currentItem = detectedItems[currentItemIndex] ?? null;
    const totalItems = detectedItems.length;
    const isLastItem = currentItemIndex >= totalItems - 1;
    const currentItemOverlap = currentItem
        ? detectedItems.reduce((maxRatio, item, idx) => {
            if (idx === currentItemIndex) return maxRatio;
            return Math.max(maxRatio, getOverlapRatio(currentItem.detectionBox, item.detectionBox));
        }, 0)
        : 0;
    const hasHeavyOverlap = currentItemOverlap >= OVERLAP_WARNING_THRESHOLD;
    const cropViewportWidth = 1000;
    const cropViewportHeight = Math.max(1, Math.round(cropViewportWidth / originalImageAspect));
    const squarePixelRoiToPercent = (centerXPercent: number, centerYPercent: number, sizePixel: number): FocusCalibration['roi'] => {
        const size = Math.min(cropViewportWidth, cropViewportHeight, Math.max(120, sizePixel));
        const widthPercent = (size / cropViewportWidth) * 100;
        const heightPercent = (size / cropViewportHeight) * 100;
        return {
            x: Math.min(100 - widthPercent, Math.max(0, centerXPercent - widthPercent / 2)),
            y: Math.min(100 - heightPercent, Math.max(0, centerYPercent - heightPercent / 2)),
            width: widthPercent,
            height: heightPercent,
        };
    };

    const getDefaultRoiForItem = (item: DetectedClothingItem): FocusCalibration['roi'] => {
        if (!item.detectionBox) {
            return squarePixelRoiToPercent(50, 50, Math.min(cropViewportWidth, cropViewportHeight) * 0.7);
        }

        const centerX = (item.detectionBox.x + item.detectionBox.width / 2) * 100;
        const centerY = (item.detectionBox.y + item.detectionBox.height / 2) * 100;
        const itemWidthPixels = item.detectionBox.width * cropViewportWidth;
        const itemHeightPixels = item.detectionBox.height * cropViewportHeight;
        const sizePixels = Math.max(itemWidthPixels, itemHeightPixels) * 1.18;
        return squarePixelRoiToPercent(centerX, centerY, sizePixels);
    };

    const defaultFocusForItem = (item: DetectedClothingItem): FocusCalibration => {
        return {
            x: 50,
            y: 50,
            zoom: 1,
            roi: getDefaultRoiForItem(item),
        };
    };
    const currentFocus = currentItem
        ? (focusCalibrations[currentItemIndex] ?? defaultFocusForItem(currentItem))
        : { x: 50, y: 50, zoom: 1.1, roi: { x: 15, y: 15, width: 70, height: 70 } };
    const getPixelRoi = (focus: FocusCalibration): PixelRect => ({
        x: (focus.roi.x / 100) * cropViewportWidth,
        y: (focus.roi.y / 100) * cropViewportHeight,
        width: (focus.roi.width / 100) * cropViewportWidth,
        height: (focus.roi.height / 100) * cropViewportHeight,
    });

    useEffect(() => {
        currentFocusRef.current = currentFocus;
        currentItemIndexRef.current = currentItemIndex;
    }, [currentFocus, currentItemIndex]);

    useEffect(() => {
        if (!selectedImage) return;
        let cancelled = false;
        const renderPreview = async () => {
            const focusedCrop = await cropImageWithFocus(
                selectedImage,
                currentFocus.x,
                currentFocus.y,
                currentFocus.zoom,
                {
                    targetWidth: cropViewportWidth,
                    targetHeight: cropViewportHeight,
                    quality: 0.82,
                }
            );
            const roiCrop = await cropImageByRect(focusedCrop, getPixelRoi(currentFocus), {
                quality: 0.86,
                coordinateSpace: "pixel",
            });
            if (!cancelled) {
                setCropPreviewImage(roiCrop);
            }
        };
        renderPreview();
        return () => {
            cancelled = true;
        };
    }, [selectedImage, currentFocus.x, currentFocus.y, currentFocus.zoom, currentFocus.roi, cropViewportHeight]);

    const endFocusDrag = useCallback(() => {
        dragStateRef.current = null;
        roiDragStateRef.current = null;
        setIsDraggingFocus(false);
        if (dragCleanupRef.current) {
            dragCleanupRef.current();
            dragCleanupRef.current = null;
        }
    }, []);

    const startFocusDrag = (clientX: number, clientY: number) => {
        if (dragCleanupRef.current) {
            dragCleanupRef.current();
            dragCleanupRef.current = null;
        }
        const next: DragState = {
            startX: clientX,
            startY: clientY,
            startFocusX: currentFocus.x,
            startFocusY: currentFocus.y,
        };
        dragStateRef.current = next;
        setIsDraggingFocus(true);

        const onMouseMove = (event: MouseEvent) => {
            event.preventDefault();
            moveFocusDrag(event.clientX, event.clientY);
        };
        const onMouseUp = () => endFocusDrag();
        const onTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (!touch) return;
            event.preventDefault();
            moveFocusDrag(touch.clientX, touch.clientY);
        };
        const onTouchEnd = () => endFocusDrag();

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);

        dragCleanupRef.current = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        };
    };

    const moveFocusDrag = (clientX: number, clientY: number) => {
        const activeDrag = dragStateRef.current;
        if (!activeDrag || !focusViewportRef.current) return;
        const rect = focusViewportRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const dx = clientX - activeDrag.startX;
        const dy = clientY - activeDrag.startY;
        const sensitivity = 100 / currentFocusRef.current.zoom;

        const nextX = Math.min(95, Math.max(5, activeDrag.startFocusX - (dx / rect.width) * sensitivity));
        const nextY = Math.min(95, Math.max(5, activeDrag.startFocusY - (dy / rect.height) * sensitivity));
        const activeIndex = currentItemIndexRef.current;

        setFocusCalibrations(prev => ({
            ...prev,
            [activeIndex]: { ...(prev[activeIndex] ?? currentFocusRef.current), x: nextX, y: nextY },
        }));
    };

    const startRoiDrag = (
        mode: 'move' | 'resize',
        clientX: number,
        clientY: number,
        handle?: RoiHandle
    ) => {
        if (dragCleanupRef.current) {
            dragCleanupRef.current();
            dragCleanupRef.current = null;
        }
        roiDragStateRef.current = {
            mode,
            handle,
            startX: clientX,
            startY: clientY,
            startRoi: currentFocus.roi,
        };
        setIsDraggingFocus(true);

        const onMouseMove = (event: MouseEvent) => {
            event.preventDefault();
            moveRoiDrag(event.clientX, event.clientY);
        };
        const onMouseUp = () => endFocusDrag();
        const onTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (!touch) return;
            event.preventDefault();
            moveRoiDrag(touch.clientX, touch.clientY);
        };
        const onTouchEnd = () => endFocusDrag();

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);

        dragCleanupRef.current = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        };
    };

    const moveRoiDrag = (clientX: number, clientY: number) => {
        const active = roiDragStateRef.current;
        if (!active || !focusViewportRef.current) return;
        const rect = focusViewportRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const dxPx = ((clientX - active.startX) / rect.width) * cropViewportWidth;
        const dyPx = ((clientY - active.startY) / rect.height) * cropViewportHeight;
        const minSizePx = 120;
        const startPixelRoi = {
            x: (active.startRoi.x / 100) * cropViewportWidth,
            y: (active.startRoi.y / 100) * cropViewportHeight,
            width: (active.startRoi.width / 100) * cropViewportWidth,
            height: (active.startRoi.height / 100) * cropViewportHeight,
        };
        const nextPixelRoi = { ...startPixelRoi };

        const next = { ...active.startRoi };
        if (active.mode === 'move') {
            nextPixelRoi.x = Math.min(cropViewportWidth - nextPixelRoi.width, Math.max(0, startPixelRoi.x + dxPx));
            nextPixelRoi.y = Math.min(cropViewportHeight - nextPixelRoi.height, Math.max(0, startPixelRoi.y + dyPx));
        } else {
            const h = active.handle;
            if (!h) return;
            const horizontalDelta = h.includes('w') ? -dxPx : dxPx;
            const verticalDelta = h.includes('n') ? -dyPx : dyPx;
            const sizeDelta = Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta;
            const maxSizeX = h.includes('w')
                ? startPixelRoi.x + startPixelRoi.width
                : cropViewportWidth - startPixelRoi.x;
            const maxSizeY = h.includes('n')
                ? startPixelRoi.y + startPixelRoi.height
                : cropViewportHeight - startPixelRoi.y;
            const nextSize = Math.max(minSizePx, Math.min(maxSizeX, maxSizeY, startPixelRoi.width + sizeDelta));

            nextPixelRoi.width = nextSize;
            nextPixelRoi.height = nextSize;
            if (h.includes('w')) {
                nextPixelRoi.x = startPixelRoi.x + startPixelRoi.width - nextSize;
            }
            if (h.includes('n')) {
                nextPixelRoi.y = startPixelRoi.y + startPixelRoi.height - nextSize;
            }
        }

        next.x = (nextPixelRoi.x / cropViewportWidth) * 100;
        next.y = (nextPixelRoi.y / cropViewportHeight) * 100;
        next.width = (nextPixelRoi.width / cropViewportWidth) * 100;
        next.height = (nextPixelRoi.height / cropViewportHeight) * 100;

        const activeIndex = currentItemIndexRef.current;
        setFocusCalibrations(prev => ({
            ...prev,
            [activeIndex]: { ...(prev[activeIndex] ?? currentFocusRef.current), roi: next },
        }));
    };


    // Pre-fill editable fields from a detected item
    const prefillFromItem = (item: DetectedClothingItem, fromIntakeFallback?: boolean) => {
        if (fromIntakeFallback) {
            setItemName('Unknown');
            setSelectedSeasons([]);
            setSelectedMoods([]);
        } else {
            setItemName(`${item.color} ${item.subcategory}`);
            setSelectedSeasons(item.season as string[]);
            setSelectedMoods(normalizeMoodIds(item.userMoods, item.aiTags));
        }
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

    useEffect(() => {
        if (!currentItem) return;
        setFocusCalibrations(prev => {
            if (prev[currentItemIndex]) return prev;
            return { ...prev, [currentItemIndex]: defaultFocusForItem(currentItem) };
        });
    }, [currentItem, currentItemIndex, totalItems]);

    useEffect(() => () => endFocusDrag(), [endFocusDrag]);

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
                const previewItems = await Promise.all(
                    result.items.map(async (item) => {
                        const previewCrop = await cropImageToBoundingBox(
                            base64,
                            item.detectionBox,
                            item.detectionConfidence,
                            {
                                paddingRatio: 0.05,
                                zoomInFactor: 1.35,
                            }
                        );
                        return {
                            ...item,
                            imageUrl: previewCrop.image,
                            thumbnailUrl: previewCrop.image,
                            sourceImageUrl: base64,
                        };
                    })
                );
                prodDiag.scannerAnalyzeEnd(true);
                setDetectedItems(previewItems);
                setCurrentItemIndex(0);
                const seededFocus: Record<number, FocusCalibration> = {};
                previewItems.forEach((_, index) => {
                    seededFocus[index] = defaultFocusForItem(previewItems[index]);
                });
                setFocusCalibrations(seededFocus);
                prefillFromItem(previewItems[0], result.usedFallback === true);
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
            const calibrationBaseImage = selectedImage;
            const bboxCrop = await cropImageToBoundingBox(
                selectedImage,
                currentItem.detectionBox,
                currentItem.detectionConfidence,
                {
                    paddingRatio: 0.04,
                    zoomInFactor: 1.55,
                }
            );
            const focusedCrop = await cropImageWithFocus(
                calibrationBaseImage,
                currentFocus.x,
                currentFocus.y,
                currentFocus.zoom,
                { targetWidth: cropViewportWidth, targetHeight: cropViewportHeight, quality: 0.88 }
            );
            const roiCropped = await cropImageByRect(focusedCrop, getPixelRoi(currentFocus), {
                quality: 0.9,
                coordinateSpace: "pixel",
            });
            const primaryImage = await compressImage(
                roiCropped,
                640,
                0.85
            );

            const warnings: string[] = [];
            if (bboxCrop.usedFallback) {
                warnings.push('Retake recommended: this item could not be isolated reliably.');
            }
            if (hasHeavyOverlap) {
                warnings.push('Retake recommended: this item overlaps heavily with another detected item.');
            }
            const mergedNotes = [currentItem.userNotes, ...warnings].filter(Boolean).join(' ').trim();
            const moodIds = selectedMoods.length > 0
                ? selectedMoods
                : normalizeMoodIds(currentItem.userMoods, currentItem.aiTags);

            const itemToSave: Omit<ClothingItem, 'id' | 'dateAdded'> = {
                imageUrl: primaryImage,
                category: currentItem.category || ClothingCategory.Tops,
                subcategory: itemName || currentItem.subcategory || "Unknown",
                color: currentItem.color || "Unknown",
                colorHex: currentItem.colorHex || "#000000",
                aiColor: currentItem.aiColor,
                colorSource: currentItem.colorSource,
                // Default to Spring when no seasons are selected — matches the
                // fallback in agentOutputGuards.ts:164. Empty arrays silently fail
                // the season.includes(currentSeason) filters in BehavioralAgent and
                // would exclude the item from insights and least-worn computation.
                season: selectedSeasons.length > 0 ? (selectedSeasons as Season[]) : [Season.Spring],
                wearFrequency: 0,
                lastWorn: null,
                aiTags: normalizeMoodIds(currentItem.aiTags, moodIds),
                userMoods: moodIds,
                userNotes: mergedNotes || "",
                detectionBox: currentItem.detectionBox,
                detectionConfidence: currentItem.detectionConfidence,
                thumbnailUrl: primaryImage,
                thumbnailVersion: 2,
                scanItemCount: totalItems,
                focusPoint: { x: currentFocus.x, y: currentFocus.y },
                focusZoom: currentFocus.zoom,
                focusRoi: currentFocus.roi,
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
        setFocusCalibrations({});
        setIsCropEditorOpen(false);
        setCropPreviewImage(null);
        setConfirmedCropItems({});
        setIsAnalyzing(false);
        setCameraError(null);
        startCamera();
    };

    const openCropEditor = () => {
        if (!currentItem) return;
        cropSnapshotRef.current = focusCalibrations[currentItemIndex] ?? defaultFocusForItem(currentItem);
        setIsCropEditorOpen(true);
    };

    const confirmCropEditor = () => {
        cropSnapshotRef.current = null;
        setConfirmedCropItems(prev => ({ ...prev, [currentItemIndex]: true }));
        setIsCropEditorOpen(false);
    };

    const cancelCropEditor = () => {
        if (cropSnapshotRef.current) {
            setFocusCalibrations(prev => ({
                ...prev,
                [currentItemIndex]: cropSnapshotRef.current as FocusCalibration,
            }));
        }
        cropSnapshotRef.current = null;
        setIsCropEditorOpen(false);
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
                    <img
                        src={selectedImage}
                        alt="Captured"
                        className="w-full h-full object-cover"
                        onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                                setOriginalImageAspect(img.naturalWidth / img.naturalHeight);
                            }
                        }}
                    />
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
            <div
                className="relative z-50 flex items-center justify-between bg-white/90 backdrop-blur-md px-4 pb-3 border-b border-olive-100 shadow-sm"
                style={{ paddingTop: `calc(${safeAreaTop} + 8px)` }}
            >
                <button
                    onClick={handleClose}
                    className="flex items-center justify-center w-10 h-10 text-primary hover:bg-olive-50 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-primary text-lg font-bold tracking-tight text-center px-2 truncate">Your Wardrobe Scanner</h2>
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
                            <p><strong className="text-primary">1. Start with your 5 staples</strong> Pick your most-worn pieces first to unlock better suggestions quickly.</p>
                            <p><strong className="text-primary">2. Batch capture</strong> Lay multiple items on your bed or shelf and take one clear photo. AI can detect up to 3 items per shot.</p>
                            <p><strong className="text-primary">3. Review and save</strong> Confirm names, seasons, and moods, then add each detected item.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Results Overlay */}
            {selectedImage && (
                <div className="relative z-50 flex-1 flex items-center justify-center px-6">
                    {isAnalyzing ? (
                        <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md text-center border border-white/10 shadow-xl">
                            <Loader2 className="w-10 h-10 text-secondary animate-spin mx-auto mb-3" />
                            <p className="text-white font-medium">AI is analyzing your clothing...</p>
                            <p className="text-white/50 text-sm mt-1">Detecting items, colors, and styles.</p>
                        </div>
                    ) : currentItem ? (
                        <div className="bg-black/60 backdrop-blur-xl rounded-2xl w-full max-w-md border border-white/10 max-h-[82vh] overflow-y-auto no-scrollbar shadow-2xl">
                            {/* Header with counter */}
                            <div className="flex items-center justify-between p-5 pb-3">
                                <div className="flex items-center gap-3 text-white">
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
                                {(hasHeavyOverlap || (currentItem.detectionConfidence ?? 1) < 0.45) && (
                                    <div className="rounded-xl border border-amber-300/40 bg-amber-300/15 px-3 py-2 text-xs text-amber-100">
                                        Detection may be ambiguous for this item. Retake is recommended for a cleaner catalog thumbnail.
                                    </div>
                                )}
                                {/* Compact crop entry point */}
                                {selectedImage && (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-white/60">What you have in the wardrobe</label>
                                        <button
                                            type="button"
                                            onClick={openCropEditor}
                                            className="group flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:bg-white/15 active:scale-[0.98]"
                                        >
                                            <span className="relative block h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black/40">
                                                <img
                                                    src={confirmedCropItems[currentItemIndex] && cropPreviewImage ? cropPreviewImage : currentItem.imageUrl || selectedImage}
                                                    alt="Detected item crop"
                                                    className="h-full w-full object-cover"
                                                />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-white">Adjust the image</span>
                                                <span className="mt-1 block text-xs leading-relaxed text-white/60">
                                                    Tap the photo to adjust the image.
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                )}
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
                                                updated[currentItemIndex] = { ...currentItem, category: e.target.value as ClothingCategory };
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
                                    <button
                                        type="button"
                                        onClick={() => setColorSheetOpen((o) => !o)}
                                        className="w-full flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-secondary/40 h-[30px] hover:bg-white/20 transition-colors"
                                    >
                                        <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: currentItem.colorHex || '#000' }} />
                                        <span className="text-xs font-semibold uppercase tracking-wide capitalize">{currentItem.color}</span>
                                        <ChevronDown className="w-3 h-3 text-white/60" />
                                    </button>
                                </div>

                                {/* Color palette — editable (snap-to-name, no hex shown); logs correction on save */}
                                {colorSheetOpen && (
                                    <div className="grid grid-cols-4 gap-2">
                                        {COLOR_PALETTE.map((c) => {
                                            const selected = currentItem.color === c.name;
                                            return (
                                                <button
                                                    key={c.name}
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...detectedItems];
                                                        updated[currentItemIndex] = { ...currentItem, color: c.name, colorHex: c.hex, colorSource: 'user' };
                                                        setDetectedItems(updated);
                                                        setColorSheetOpen(false);
                                                    }}
                                                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${selected ? 'border-secondary bg-white/15' : 'border-white/15 hover:bg-white/10'}`}
                                                >
                                                    <span className="w-6 h-6 rounded-md border border-white/20" style={{ backgroundColor: c.hex }} />
                                                    <span className="text-[10px] font-semibold text-white/80">{c.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

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

            {isCropEditorOpen && selectedImage && currentItem && (
                <div className="absolute inset-0 z-[120] flex flex-col bg-black">
                    <div
                        className="relative z-10 flex items-center justify-between px-4 pb-3"
                        style={{ paddingTop: `calc(${safeAreaTop} + 8px)` }}
                    >
                        <button
                            onClick={cancelCropEditor}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-[0.96]"
                            aria-label="Cancel crop"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-white">Crop for wardrobe grid</p>
                            <p className="text-xs text-white/60">Drag the photo to position. Drag corners to resize.</p>
                        </div>
                        <button
                            onClick={confirmCropEditor}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-white shadow-lg transition-transform active:scale-[0.96]"
                            aria-label="Confirm crop"
                        >
                            <Check className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="relative z-10 flex flex-1 items-center justify-center px-4">
                        <div
                            ref={focusViewportRef}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                startFocusDrag(e.clientX, e.clientY);
                            }}
                            onTouchStart={(e) => {
                                const firstTouch = e.touches[0];
                                if (!firstTouch) return;
                                e.preventDefault();
                                startFocusDrag(firstTouch.clientX, firstTouch.clientY);
                            }}
                            className={`relative max-h-[64vh] overflow-hidden rounded-2xl border border-white/20 bg-black touch-none select-none ${isDraggingFocus ? 'cursor-grabbing' : 'cursor-grab'}`}
                            style={{
                                aspectRatio: `${originalImageAspect} / 1`,
                                width: `min(100%, 28rem, calc(64vh * ${originalImageAspect}))`,
                            }}
                        >
                            <img
                                src={selectedImage}
                                alt="Crop source"
                                className="h-full w-full object-contain pointer-events-none select-none"
                                style={{
                                    objectPosition: `${currentFocus.x}% ${currentFocus.y}%`,
                                    transform: `scale(${currentFocus.zoom})`,
                                    transformOrigin: `${currentFocus.x}% ${currentFocus.y}%`,
                                }}
                            />
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)',
                                    backgroundSize: '33.333% 33.333%',
                                }}
                            />
                            <div
                                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]"
                                style={{
                                    left: `${currentFocus.roi.x}%`,
                                    top: `${currentFocus.roi.y}%`,
                                    width: `${currentFocus.roi.width}%`,
                                    height: `${currentFocus.roi.height}%`,
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    startRoiDrag('move', e.clientX, e.clientY);
                                }}
                                onTouchStart={(e) => {
                                    const firstTouch = e.touches[0];
                                    if (!firstTouch) return;
                                    e.stopPropagation();
                                    e.preventDefault();
                                    startRoiDrag('move', firstTouch.clientX, firstTouch.clientY);
                                }}
                            >
                                {(['nw', 'ne', 'se', 'sw'] as RoiHandle[]).map((handle) => {
                                    const positions: Record<RoiHandle, string> = {
                                        nw: 'left-0 top-0',
                                        ne: 'right-0 top-0',
                                        se: 'right-0 bottom-0',
                                        sw: 'left-0 bottom-0',
                                        n: '',
                                        e: '',
                                        s: '',
                                        w: '',
                                    };
                                    return (
                                        <button
                                            key={handle}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                startRoiDrag('resize', e.clientX, e.clientY, handle);
                                            }}
                                            onTouchStart={(e) => {
                                                const firstTouch = e.touches[0];
                                                if (!firstTouch) return;
                                                e.stopPropagation();
                                                e.preventDefault();
                                                startRoiDrag('resize', firstTouch.clientX, firstTouch.clientY, handle);
                                            }}
                                            className={`absolute h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/30 ${positions[handle]}`}
                                            style={{
                                                transform:
                                                    handle === 'nw' ? 'translate(-50%, -50%)' :
                                                        handle === 'ne' ? 'translate(50%, -50%)' :
                                                            handle === 'se' ? 'translate(50%, 50%)' :
                                                                'translate(-50%, 50%)',
                                            }}
                                            aria-label={`Resize crop ${handle}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div
                        className="relative z-10 px-5 pt-4"
                        style={{ paddingBottom: `calc(${safeAreaBottom} + 16px)` }}
                    >
                        <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md">
                            <span className="text-sm font-semibold text-white/80">-</span>
                            <input
                                type="range"
                                min={1}
                                max={2.2}
                                step={0.02}
                                value={currentFocus.zoom}
                                onChange={(e) => {
                                    const next = Number(e.target.value);
                                    setFocusCalibrations(prev => ({
                                        ...prev,
                                        [currentItemIndex]: { ...currentFocus, zoom: next },
                                    }));
                                }}
                                className="flex-1"
                            />
                            <span className="text-sm font-semibold text-white/80">+</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Controls — camera live view */}
            {!selectedImage && (
                <div
                    className="relative z-50 mt-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 px-8"
                    style={{ paddingBottom: `calc(${safeAreaBottom} + 28px)` }}
                >
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
