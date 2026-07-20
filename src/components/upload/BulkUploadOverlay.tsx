import React, { useEffect, useRef, useState } from 'react';
import { useWardrobe } from '../../context/WardrobeContext';
import { awsNovaService } from '../../services/awsNova';
import { compressImage, cropImageToBoundingBox } from '../../utils/imageUtils';
import { Loader2, CheckCircle2, ImageOff } from 'lucide-react';

/**
 * Bulk gallery intake. Listens for the global `open-bulk-upload` event, opens a multi-file picker
 * (up to MAX_PHOTOS), and runs each photo through the same analyze → crop-to-bbox → save pipeline
 * the single-item scanner uses — auto-saving with the AI's labels. Low-friction onboarding: any item
 * that came back low-confidence / "Unknown" keeps the existing "needs attention" badge for later fix-up
 * in the wardrobe. Kept separate from CameraScannerOverlay so the complex single-item flow is untouched.
 */
const MAX_PHOTOS = 10;

type Phase = 'idle' | 'processing' | 'done';

interface BulkSummary {
    added: number;
    photos: number;
    restricted: number;
    flagged: number;
    truncated: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

export const BulkUploadOverlay: React.FC = () => {
    const { addClothingItem } = useWardrobe();
    const inputRef = useRef<HTMLInputElement>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [total, setTotal] = useState(0);
    const [done, setDone] = useState(0);
    const [summary, setSummary] = useState<BulkSummary | null>(null);

    useEffect(() => {
        const open = () => inputRef.current?.click();
        window.addEventListener('open-bulk-upload', open);
        return () => window.removeEventListener('open-bulk-upload', open);
    }, []);

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []);
        e.target.value = ''; // allow re-selecting the same files later
        const files = selected.slice(0, MAX_PHOTOS);
        if (files.length === 0) return;

        setPhase('processing');
        setTotal(files.length);
        setDone(0);

        let added = 0;
        let restricted = 0;
        let flagged = 0;

        for (const file of files) {
            try {
                const dataUrl = await fileToDataUrl(file);
                // Compress the source before analysis to keep the upstream payload small.
                const source = await compressImage(dataUrl, 1024, 0.85);
                const result = await awsNovaService.analyzeClothingImage(source);

                if (!result.success) {
                    restricted += 1; // RESTRICTED_CONTENT — skip this photo
                } else {
                    for (const detected of result.items) {
                        // Save each detected item independently so one failure doesn't drop its siblings.
                        try {
                            const crop = await cropImageToBoundingBox(
                                source,
                                detected.detectionBox,
                                detected.detectionConfidence,
                                { targetWidth: 510, targetHeight: 680, paddingRatio: 0.08, zoomInFactor: 1.15 },
                            );
                            const finalImage = await compressImage(crop.image, 510, 0.85);
                            // addClothingItem re-generates id/dateAdded, so the detected values are ignored.
                            await addClothingItem({ ...detected, imageUrl: finalImage, sourceImageUrl: source });
                            added += 1;
                            if (result.usedFallback || detected.subcategory === 'Unknown') flagged += 1;
                        } catch (itemErr) {
                            console.error('[BulkUpload] Failed to save a detected item:', itemErr);
                        }
                    }
                }
            } catch (err) {
                console.error('[BulkUpload] Failed to process a photo:', err);
            } finally {
                setDone((d) => d + 1);
            }
        }

        setSummary({ added, photos: files.length, restricted, flagged, truncated: selected.length > MAX_PHOTOS });
        setPhase('done');
    };

    const close = () => {
        setPhase('idle');
        setSummary(null);
    };

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFiles}
            />

            {phase !== 'idle' && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden animate-scale-in">
                        {phase === 'processing' && (
                            <div className="p-8 text-center">
                                <Loader2 className="w-8 h-8 text-secondary animate-spin mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-primary mb-1">Adding your wardrobe</h3>
                                <p className="text-sm text-olive-500">
                                    Analyzing photo {Math.min(done + 1, total)} of {total}…
                                </p>
                                <div className="h-2 rounded-full bg-olive-100 overflow-hidden mt-4">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-olive-400 mt-3">Hang tight — this can take a moment per photo.</p>
                            </div>
                        )}

                        {phase === 'done' && summary && (
                            <div className="p-6 text-center">
                                <CheckCircle2 className="w-10 h-10 text-secondary mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-primary mb-1">
                                    Added {summary.added} item{summary.added === 1 ? '' : 's'}
                                </h3>
                                <p className="text-sm text-olive-500 mb-2">
                                    from {summary.photos} photo{summary.photos === 1 ? '' : 's'}.
                                </p>
                                {summary.flagged > 0 && (
                                    <p className="text-xs text-amber-700 mb-1">
                                        {summary.flagged} need a quick review — look for the badge in your wardrobe.
                                    </p>
                                )}
                                {summary.restricted > 0 && (
                                    <p className="text-xs text-olive-400 mb-1 inline-flex items-center gap-1">
                                        <ImageOff className="w-3 h-3" /> {summary.restricted} photo{summary.restricted === 1 ? '' : 's'} skipped.
                                    </p>
                                )}
                                {summary.truncated && (
                                    <p className="text-xs text-olive-400 mb-1">Only the first {MAX_PHOTOS} photos were used.</p>
                                )}
                                <button
                                    onClick={close}
                                    className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-olive-700 transition-colors active:scale-[0.98]"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
