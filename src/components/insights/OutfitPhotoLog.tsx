import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ArrowRight, CheckCircle2, ImageOff, Loader2, Plus, X } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { useMood } from '../../hooks/useMood';
import { awsNovaService } from '../../services/awsNova';
import { compressImage, cropImageToBoundingBox } from '../../utils/imageUtils';
import { bestClosetMatch, matchScore } from '../../utils/matchCloset';
import { itemName } from '../../utils/itemName';
import type { ClothingItem } from '../../types';

const MAX_PHOTOS = 4;

type Detected = Omit<ClothingItem, 'id' | 'dateAdded'>;

interface Row {
    key: string;
    crop: string;
    detected: Detected;
    /** A closet piece id, 'new' to add it to the closet, or 'skip' to leave it out. */
    choice: string;
}

type Phase = 'reading' | 'review' | 'saving' | 'done';

interface OutfitPhotoLogProps {
    files: File[];
    day: Date;
    isToday: boolean;
    onClose: () => void;
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Log a forgotten day from its photos: the AI finds each piece in the outfit photo(s), each piece is
 * matched to the closet (or offered as a new piece), the user checks the matches, and the outfit is
 * logged for that day.
 */
export const OutfitPhotoLog: React.FC<OutfitPhotoLogProps> = ({ files, day, isToday, onClose }) => {
    const { clothes, addClothingItem, logOutfitWear } = useWardrobe();
    const [mood] = useMood();
    const [phase, setPhase] = useState<Phase>('reading');
    const [rows, setRows] = useState<Row[]>([]);
    const [skippedPhotos, setSkippedPhotos] = useState(0);
    const [result, setResult] = useState<{ logged: boolean; added: number; saved: boolean } | null>(null);
    const started = useRef(false);
    const dayLabel = isToday ? 'today' : format(day, 'EEE d MMM');

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        void (async () => {
            const found: Row[] = [];
            const taken = new Set<string>();
            let skipped = 0;
            for (const [f, file] of files.slice(0, MAX_PHOTOS).entries()) {
                try {
                    const source = await compressImage(await fileToDataUrl(file), 1024, 0.85);
                    const res = await awsNovaService.analyzeClothingImage(source);
                    if (!res.success) { skipped += 1; continue; }
                    for (const [d, item] of res.items.entries()) {
                        const crop = await cropImageToBoundingBox(source, item.detectionBox, item.detectionConfidence,
                            { targetWidth: 510, targetHeight: 680, paddingRatio: 0.08, zoomInFactor: 1.15 });
                        const image = await compressImage(crop.image, 510, 0.85);
                        const { id: _id, dateAdded: _added, ...detected } = item;
                        void _id; void _added;
                        // Several photos of one outfit: never match one closet piece twice.
                        const match = bestClosetMatch(detected, clothes, taken);
                        if (match) taken.add(match.id);
                        found.push({ key: `${f}-${d}`, crop: image, detected, choice: match ? match.id : 'new' });
                    }
                } catch (err) {
                    console.error('[OutfitPhotoLog] Failed to read a photo:', err);
                    skipped += 1;
                }
            }
            setRows(found);
            setSkippedPhotos(skipped);
            setPhase('review');
        })();
        // Reads the photos once, against the closet as it was when the sheet opened.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const byId = new Map(clothes.map((c) => [c.id, c]));
    const included = rows.filter((r) => r.choice !== 'skip');

    const logIt = async () => {
        setPhase('saving');
        // Midday on that day, so time zones never tip it into another date.
        const when = isToday ? new Date() : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
        const ids: string[] = [];
        let added = 0;
        for (const row of included) {
            if (row.choice !== 'new') { ids.push(row.choice); continue; }
            try {
                // A piece first seen in this photo was worn that day: it arrives with that wear.
                const id = await addClothingItem({ ...row.detected, imageUrl: row.crop, thumbnailUrl: row.crop, wearFrequency: 1, lastWorn: when });
                if (id) { ids.push(id); added += 1; }
            } catch (err) {
                console.error('[OutfitPhotoLog] Failed to add a piece:', err);
            }
        }
        const logged = ids.length > 0 && await logOutfitWear(ids, mood.id, null, isToday ? undefined : when);
        setResult({ logged, added, saved: ids.length > 0 });
        setPhase('done');
    };

    const optionsFor = (row: Row) =>
        clothes
            .map((c) => ({ c, s: matchScore(row.detected, c) }))
            .filter(({ s }) => s > 0)
            .sort((a, b) => b.s - a.s)
            .map(({ c }) => c);

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-paper rounded-[28px] border-[1.5px] border-ink overflow-hidden animate-scale-in max-h-[90dvh] flex flex-col">
                {phase === 'reading' && (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-ink animate-spin mx-auto mb-4" />
                        <h3 className="font-display text-xl font-extrabold text-ink">Spotting your outfit</h3>
                        <p className="text-sm text-ink/50 mt-1">Matching it to your closet…</p>
                    </div>
                )}

                {phase === 'review' && (
                    <>
                        <div className="flex-none px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold text-ink/50">Logging {dayLabel}</p>
                                <h3 className="font-display text-xl font-extrabold text-ink">
                                    {rows.length === 0 ? 'No clothes found' : `Found ${rows.length} ${rows.length === 1 ? 'piece' : 'pieces'}`}
                                </h3>
                                <p className="text-xs text-ink/60 mt-0.5">
                                    {rows.length === 0 ? 'Try a photo where the outfit is in clear view.' : 'Check the matches from your closet, then log it.'}
                                </p>
                            </div>
                            <button type="button" onClick={onClose} aria-label="Close" className="flex-none w-8 h-8 rounded-full bg-ink/80 text-white flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {skippedPhotos > 0 && (
                            <p className="flex-none px-5 pb-2 text-[11px] text-ink/50 inline-flex items-center gap-1">
                                <ImageOff className="w-3 h-3" /> {skippedPhotos} photo{skippedPhotos === 1 ? '' : 's'} couldn’t be read.
                            </p>
                        )}
                        <ul className="flex-1 overflow-y-auto px-5 pb-3 space-y-2">
                            {rows.map((row) => {
                                const match = byId.get(row.choice);
                                return (
                                    <li key={row.key} className={`flex items-center gap-2.5 p-2 rounded-2xl bg-white border border-ink/10 ${row.choice === 'skip' ? 'opacity-50' : ''}`}>
                                        <img src={row.crop} alt="" className="flex-none w-12 h-12 rounded-xl object-cover bg-paper" />
                                        <ArrowRight className="flex-none w-3.5 h-3.5 text-ink/40" />
                                        {match ? (
                                            <img src={match.thumbnailUrl || match.imageUrl} alt="" className="flex-none w-12 h-12 rounded-xl object-cover bg-paper ring-2 ring-lime" />
                                        ) : (
                                            <span className="flex-none w-12 h-12 rounded-xl border-2 border-dashed border-ink/30 flex items-center justify-center text-ink/50">
                                                {row.choice === 'skip' ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            </span>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-ink truncate">
                                                {match ? itemName(match) : row.choice === 'skip' ? 'Left out' : `New: ${itemName(row.detected)}`}
                                            </p>
                                            {/* A native picker behind a small label: easy on phones, no oversized text */}
                                            <span className="relative inline-flex items-center gap-0.5 text-[11px] font-semibold text-ink/60">
                                                {match ? 'From your closet' : row.choice === 'skip' ? 'Not logged' : 'Joins your closet'} · <span className="underline underline-offset-2">Change</span>
                                                <select
                                                    value={row.choice}
                                                    onChange={(e) => setRows((all) => all.map((r) => (r.key === row.key ? { ...r, choice: e.target.value } : r)))}
                                                    aria-label="Which piece is this?"
                                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                                >
                                                    {optionsFor(row).map((c) => <option key={c.id} value={c.id}>{itemName(c)}</option>)}
                                                    <option value="new">Add as a new piece</option>
                                                    <option value="skip">Leave it out</option>
                                                </select>
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="flex-none border-t border-ink/10 px-4 py-3">
                            <button
                                type="button"
                                onClick={() => void logIt()}
                                disabled={included.length === 0}
                                className="w-full h-12 rounded-full bg-ink text-paper text-sm font-bold disabled:opacity-50"
                            >
                                Log it for {dayLabel}
                            </button>
                        </div>
                    </>
                )}

                {phase === 'saving' && (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-ink animate-spin mx-auto mb-4" />
                        <h3 className="font-display text-xl font-extrabold text-ink">Logging it…</h3>
                    </div>
                )}

                {phase === 'done' && result && (
                    <div className="p-6 text-center">
                        <CheckCircle2 className="w-10 h-10 text-ink mx-auto mb-3" />
                        <h3 className="font-display text-xl font-extrabold text-ink">
                            {result.logged ? `Logged for ${dayLabel}` : result.saved ? 'Already logged' : 'Couldn’t save that'}
                        </h3>
                        <p className="text-sm text-ink/60 mt-1">
                            {result.logged
                                ? result.added > 0 ? `${result.added} new ${result.added === 1 ? 'piece' : 'pieces'} joined your closet too.` : 'Your stats are up to date.'
                                : result.saved ? `That outfit was already in the log for ${dayLabel}.` : 'Check your connection and try again.'}
                        </p>
                        <button type="button" onClick={onClose} className="mt-5 w-full h-12 rounded-full bg-ink text-paper text-sm font-bold">Done</button>
                    </div>
                )}
            </div>
        </div>
    );
};
