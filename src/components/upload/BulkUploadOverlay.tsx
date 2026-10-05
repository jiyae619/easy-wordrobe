import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, ImageOff, Star, X, Sparkles } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { awsNovaService } from '../../services/awsNova';
import { compressImage, cropImageToBoundingBox } from '../../utils/imageUtils';
import { ClothingCategory, type ClothingItem } from '../../types';
import { itemName } from '../../utils/itemName';

/**
 * Multi-photo intake. Opened from the scanner when several gallery photos are picked (the
 * `open-bulk-upload` event carries the files; without files it opens its own picker). Every photo
 * runs through the same analyze → crop-to-bbox pipeline as the scanner, then the AI-filled pieces
 * are listed for one quick look: fix a name or category, tag "Wear more", drop a piece, or just
 * "Add all".
 */
const MAX_PHOTOS = 10;

const CATEGORIES: Array<{ id: ClothingCategory; label: string }> = [
    { id: ClothingCategory.Tops, label: 'Top' },
    { id: ClothingCategory.Bottoms, label: 'Bottom' },
    { id: ClothingCategory.Outerwear, label: 'Layer' },
    { id: ClothingCategory.Dresses, label: 'Dress' },
    { id: ClothingCategory.Shoes, label: 'Shoes' },
];

type Phase = 'idle' | 'reading' | 'review' | 'saving' | 'done';

interface Draft {
    key: string;
    item: Omit<ClothingItem, 'id' | 'dateAdded'>;
    wearMore: boolean;
    /** Low confidence or unknown: worth a glance before saving. */
    flagged: boolean;
}

export interface BulkUploadDetail {
    files?: File[];
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
    const { addClothingItem, addTryItItem } = useWardrobe();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [total, setTotal] = useState(0);
    const [read, setRead] = useState(0);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [skipped, setSkipped] = useState(0);
    const [truncated, setTruncated] = useState(false);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [firstSaved, setFirstSaved] = useState<Draft | null>(null);
    const [failed, setFailed] = useState(0);
    const processRef = useRef<(files: File[]) => void>(() => {});

    const process = async (selected: File[]) => {
        const files = selected.slice(0, MAX_PHOTOS);
        if (files.length === 0) return;
        setPhase('reading');
        setTotal(files.length);
        setRead(0);
        setDrafts([]);
        setSkipped(0);
        setTruncated(selected.length > MAX_PHOTOS);

        const found: Draft[] = [];
        let restricted = 0;
        for (const [f, file] of files.entries()) {
            try {
                const dataUrl = await fileToDataUrl(file);
                // Compress the source before analysis to keep the upstream payload small.
                const source = await compressImage(dataUrl, 1024, 0.85);
                const result = await awsNovaService.analyzeClothingImage(source);
                if (!result.success) {
                    restricted += 1; // RESTRICTED_CONTENT: skip this photo
                    continue;
                }
                for (const [d, detected] of result.items.entries()) {
                    const crop = await cropImageToBoundingBox(
                        source,
                        detected.detectionBox,
                        detected.detectionConfidence,
                        { targetWidth: 510, targetHeight: 680, paddingRatio: 0.08, zoomInFactor: 1.15 },
                    );
                    const image = await compressImage(crop.image, 510, 0.85);
                    const { id: _id, dateAdded: _added, ...rest } = detected;
                    void _id; void _added;
                    found.push({
                        key: `${f}-${d}`,
                        item: { ...rest, imageUrl: image, thumbnailUrl: image, sourceImageUrl: source, wearFrequency: 0, lastWorn: null },
                        wearMore: false,
                        flagged: Boolean(result.usedFallback) || detected.subcategory === 'Unknown',
                    });
                }
            } catch (err) {
                console.error('[BulkUpload] Failed to process a photo:', err);
            } finally {
                setRead((n) => n + 1);
            }
        }
        setDrafts(found);
        setSkipped(restricted);
        setPhase('review');
    };
    useEffect(() => { processRef.current = (files) => { void process(files); }; });

    useEffect(() => {
        const open = (e: Event) => {
            const files = (e as CustomEvent<BulkUploadDetail | undefined>).detail?.files;
            if (files && files.length > 0) processRef.current(files);
            else inputRef.current?.click();
        };
        window.addEventListener('open-bulk-upload', open);
        return () => window.removeEventListener('open-bulk-upload', open);
    }, []);

    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []);
        e.target.value = ''; // allow re-selecting the same files later
        void process(selected);
    };

    const update = (key: string, patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) =>
        setDrafts((all) => all.map((d) => (d.key === key ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch) } : d)));

    const addAll = async () => {
        setPhase('saving');
        const ids: string[] = [];
        let first: Draft | null = null;
        let failures = 0;
        for (const draft of drafts) {
            // Save each piece independently so one failure doesn't drop its siblings.
            try {
                const id = await addClothingItem(draft.item);
                if (id) {
                    ids.push(id);
                    first ??= draft;
                    if (draft.wearMore) await addTryItItem(id);
                }
            } catch (err) {
                failures += 1;
                console.error('[BulkUpload] Failed to save a piece:', err);
            }
        }
        setSavedIds(ids);
        setFirstSaved(first);
        setFailed(failures);
        setPhase('done');
    };

    const close = () => {
        setPhase('idle');
        setDrafts([]);
        setSavedIds([]);
    };
    const styleFirst = () => {
        const id = savedIds[0];
        close();
        if (id) navigate('/', { state: { lockItemId: id } });
    };

    return (
        <>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

            {phase !== 'idle' && (
                <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-paper rounded-[28px] border-[1.5px] border-ink shadow-xl overflow-hidden animate-scale-in max-h-[90dvh] flex flex-col">
                        {phase === 'reading' && (
                            <div className="p-8 text-center">
                                <Loader2 className="w-8 h-8 text-ink animate-spin mx-auto mb-4" />
                                <h3 className="font-display text-xl font-extrabold text-ink mb-1">Reading your photos</h3>
                                <p className="text-sm text-ink/50">Photo {Math.min(read + 1, total)} of {total}…</p>
                                <div className="h-2 rounded-full bg-ink/5 overflow-hidden mt-4">
                                    <div className="h-full bg-ink transition-all duration-300" style={{ width: `${total ? Math.round((read / total) * 100) : 0}%` }} />
                                </div>
                                <p className="text-[11px] text-ink/50 mt-3">Each photo can hold several pieces.</p>
                            </div>
                        )}

                        {phase === 'review' && (
                            <>
                                <div className="flex-none px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-display text-xl font-extrabold text-ink">
                                            {drafts.length === 0 ? 'No clothes found' : `Found ${drafts.length} ${drafts.length === 1 ? 'piece' : 'pieces'}`}
                                        </h3>
                                        <p className="text-xs text-ink/60 mt-0.5">
                                            {drafts.length === 0 ? 'Try photos with the clothes in clear view.' : 'AI filled these in. Fix anything that’s off, or just add them.'}
                                        </p>
                                    </div>
                                    <button type="button" onClick={close} aria-label="Close" className="flex-none w-8 h-8 rounded-full bg-ink/80 text-white flex items-center justify-center">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                {(skipped > 0 || truncated) && (
                                    <div className="flex-none px-5 pb-2 space-y-0.5">
                                        {skipped > 0 && <p className="text-[11px] text-ink/50 inline-flex items-center gap-1"><ImageOff className="w-3 h-3" /> {skipped} photo{skipped === 1 ? '' : 's'} skipped (we only read clothes).</p>}
                                        {truncated && <p className="text-[11px] text-ink/50">We read the first {MAX_PHOTOS} photos. Add the rest next round.</p>}
                                    </div>
                                )}
                                <ul className="flex-1 overflow-y-auto px-5 pb-3 space-y-2">
                                    {drafts.map((d) => (
                                        <li key={d.key} className={`flex items-center gap-3 p-2 rounded-2xl bg-white border ${d.flagged ? 'border-amber-400' : 'border-ink/10'}`}>
                                            <img src={d.item.imageUrl} alt="" className="flex-none w-14 h-14 rounded-xl object-cover bg-paper" />
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <input
                                                    value={d.item.subcategory}
                                                    onChange={(e) => update(d.key, (cur) => ({ item: { ...cur.item, subcategory: e.target.value } }))}
                                                    aria-label="Name"
                                                    className="w-full bg-transparent text-sm font-bold text-ink outline-none border-b border-transparent focus:border-ink/30"
                                                />
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-3 h-3 rounded-full border border-black/10 flex-none" style={{ backgroundColor: d.item.colorHex }} title={d.item.color} />
                                                    <select
                                                        value={d.item.category}
                                                        onChange={(e) => update(d.key, (cur) => ({ item: { ...cur.item, category: e.target.value as ClothingCategory } }))}
                                                        aria-label="Category"
                                                        className="bg-transparent text-[11px] font-semibold text-ink/60 outline-none"
                                                    >
                                                        {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => update(d.key, (cur) => ({ wearMore: !cur.wearMore }))}
                                                aria-pressed={d.wearMore}
                                                aria-label="Wear more"
                                                title="Wear more"
                                                className={`flex-none w-9 h-9 rounded-full border-[1.5px] border-ink flex items-center justify-center ${d.wearMore ? 'bg-lime' : ''}`}
                                            >
                                                <Star className={`w-4 h-4 ${d.wearMore ? 'fill-ink' : ''}`} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}
                                                aria-label={`Leave out ${d.item.subcategory}`}
                                                className="flex-none w-8 h-8 rounded-full text-ink/40 flex items-center justify-center"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex-none border-t border-ink/10 px-4 py-3 space-y-1.5">
                                    {drafts.length > 0 ? (
                                        <>
                                            <button type="button" onClick={() => void addAll()} className="w-full h-12 rounded-full bg-ink text-paper text-sm font-bold">
                                                Add all {drafts.length}
                                            </button>
                                            <p className="text-center text-[11px] text-ink/50">Tap the star on pieces you want to wear more.</p>
                                        </>
                                    ) : (
                                        <button type="button" onClick={close} className="w-full h-12 rounded-full bg-ink text-paper text-sm font-bold">Done</button>
                                    )}
                                </div>
                            </>
                        )}

                        {phase === 'saving' && (
                            <div className="p-8 text-center">
                                <Loader2 className="w-8 h-8 text-ink animate-spin mx-auto mb-4" />
                                <h3 className="font-display text-xl font-extrabold text-ink">Hanging them up…</h3>
                            </div>
                        )}

                        {phase === 'done' && (
                            <div className="p-6 text-center">
                                <CheckCircle2 className="w-10 h-10 text-ink mx-auto mb-3" />
                                <h3 className="font-display text-xl font-extrabold text-ink mb-1">
                                    {savedIds.length === 0 ? 'Nothing saved' : `${savedIds.length} new ${savedIds.length === 1 ? 'piece' : 'pieces'}!`}
                                </h3>
                                <p className="text-sm text-ink/50">
                                    {failed > 0 ? `${failed} couldn’t be saved. Try those again later.` : 'Your closet just grew.'}
                                </p>
                                {savedIds.length > 0 && firstSaved && (
                                    <button type="button" onClick={styleFirst} className="mt-4 w-full h-12 rounded-full bg-ink text-paper text-sm font-bold inline-flex items-center justify-center gap-2">
                                        <Sparkles className="w-4 h-4" /> Style the {itemName(firstSaved.item).toLowerCase()}
                                    </button>
                                )}
                                <button type="button" onClick={() => { close(); navigate('/wardrobe'); }} className="mt-2 w-full h-11 rounded-full text-sm font-bold text-ink">
                                    See my closet
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
