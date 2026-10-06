import React, { useEffect, useRef, useState } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ArrowRight, CheckCircle2, ImageOff, Loader2, Plus, X } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { useMood } from '../../hooks/useMood';
import { awsNovaService } from '../../services/awsNova';
import { compressImage, cropImageToBoundingBox } from '../../utils/imageUtils';
import { bestClosetMatch, matchScore } from '../../utils/matchCloset';
import { readPhotoDate } from '../../utils/photoDate';
import { itemName } from '../../utils/itemName';
import type { ClothingItem } from '../../types';

const MAX_PHOTOS = 12;

type Detected = Omit<ClothingItem, 'id' | 'dateAdded'>;

interface Row {
    key: string;
    crop: string;
    detected: Detected;
    /** A closet piece id, 'new' to add it, `same:<rowKey>` for a new piece already found on another day, or 'skip'. */
    choice: string;
}

/** Where a day came from: the photo's own date, the file's date, the day the user tapped, or a default. */
type DaySource = 'photo' | 'file' | 'picked' | 'today';

interface Group {
    key: string;
    day: Date;
    source: DaySource;
    rows: Row[];
}

type Phase = 'reading' | 'review' | 'saving' | 'done';

interface OutfitPhotoLogProps {
    files: File[];
    /** The day the user tapped, used for photos without a date. Null when started from the calendar. */
    fallbackDay: Date | null;
    onClose: () => void;
}

const SOURCE_NOTE: Record<DaySource, string> = {
    photo: 'Date from the photo',
    file: 'Date from the file',
    picked: 'No date in the photo',
    today: 'No date found',
};

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

const asPiece = (row: Row): ClothingItem => ({ ...row.detected, id: row.key, dateAdded: new Date() });
const dayLabel = (day: Date) => (isSameDay(day, new Date()) ? 'Today' : format(day, 'EEE d MMM'));
const toInputValue = (day: Date) => format(day, 'yyyy-MM-dd');

/**
 * Log forgotten days from photos. Each photo lands on the day it was taken (EXIF date, else the
 * file date, else the day the user tapped), so a batch of old photos fills several days at once.
 * The AI spots each piece, matches it to the closet (or offers it as new, recognising the same new
 * piece across days), the user checks the matches and dates, and every day is logged.
 */
export const OutfitPhotoLog: React.FC<OutfitPhotoLogProps> = ({ files, fallbackDay, onClose }) => {
    const { clothes, addClothingItem, logOutfitWear } = useWardrobe();
    const [mood] = useMood();
    const [phase, setPhase] = useState<Phase>('reading');
    const [groups, setGroups] = useState<Group[]>([]);
    const [read, setRead] = useState(0);
    const [skippedPhotos, setSkippedPhotos] = useState(0);
    const [result, setResult] = useState<{ days: Date[]; added: number; already: number } | null>(null);
    const started = useRef(false);
    const photoCount = Math.min(files.length, MAX_PHOTOS);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        void (async () => {
            const byDay = new Map<string, Group>();
            const newRows: Row[] = [];
            let skipped = 0;
            for (const [f, file] of files.slice(0, MAX_PHOTOS).entries()) {
                try {
                    const dated = await readPhotoDate(file);
                    const day = startOfDay(dated?.date ?? fallbackDay ?? new Date());
                    const source: DaySource = dated?.source ?? (fallbackDay ? 'picked' : 'today');
                    const source64 = await compressImage(await fileToDataUrl(file), 1024, 0.85);
                    const res = await awsNovaService.analyzeClothingImage(source64);
                    if (!res.success) { skipped += 1; continue; }
                    const group = byDay.get(day.toDateString()) ?? { key: day.toDateString(), day, source, rows: [] };
                    byDay.set(group.key, group);
                    const taken = new Set(group.rows.map((r) => r.choice));
                    for (const [d, item] of res.items.entries()) {
                        const crop = await cropImageToBoundingBox(source64, item.detectionBox, item.detectionConfidence,
                            { targetWidth: 510, targetHeight: 680, paddingRatio: 0.08, zoomInFactor: 1.15 });
                        const image = await compressImage(crop.image, 510, 0.85);
                        const { id: _id, dateAdded: _added, ...detected } = item;
                        void _id; void _added;
                        const row: Row = { key: `${f}-${d}`, crop: image, detected, choice: 'new' };
                        // Same day: never match one closet piece twice. Across days: a new piece
                        // seen before is the same new piece, not another copy.
                        const match = bestClosetMatch(detected, clothes, taken);
                        const seen = match ? null : bestClosetMatch(detected, newRows.map(asPiece));
                        if (match) { row.choice = match.id; taken.add(match.id); }
                        else if (seen) row.choice = `same:${seen.id}`;
                        else newRows.push(row);
                        group.rows.push(row);
                    }
                } catch (err) {
                    console.error('[OutfitPhotoLog] Failed to read a photo:', err);
                    skipped += 1;
                } finally {
                    setRead((n) => n + 1);
                }
            }
            setGroups([...byDay.values()].sort((a, b) => a.day.getTime() - b.day.getTime()));
            setSkippedPhotos(skipped);
            setPhase('review');
        })();
        // Reads the photos once, against the closet as it was when the sheet opened.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const byId = new Map(clothes.map((c) => [c.id, c]));
    const allRows = groups.flatMap((g) => g.rows);
    const rowByKey = new Map(allRows.map((r) => [r.key, r]));
    const newRows = allRows.filter((r) => r.choice === 'new');
    const dayCount = groups.filter((g) => g.rows.some((r) => r.choice !== 'skip')).length;

    const setChoice = (key: string, choice: string) =>
        setGroups((all) => all.map((g) => ({ ...g, rows: g.rows.map((r) => (r.key === key ? { ...r, choice } : r)) })));
    const setDay = (key: string, value: string) => {
        const [y, m, d] = value.split('-').map(Number);
        if (!y || !m || !d) return;
        const day = new Date(y, m - 1, d);
        if (day.getTime() > Date.now()) return;
        setGroups((all) => all.map((g) => (g.key === key ? { ...g, day, source: 'picked' as const } : g)).sort((a, b) => a.day.getTime() - b.day.getTime()));
    };

    const logAll = async () => {
        setPhase('saving');
        const created = new Map<string, string>();
        const createPiece = async (row: Row) => {
            const existing = created.get(row.key);
            if (existing) return existing;
            const id = await addClothingItem({ ...row.detected, imageUrl: row.crop, thumbnailUrl: row.crop, wearFrequency: 0, lastWorn: null });
            if (id) created.set(row.key, id);
            return id;
        };
        const logged: Date[] = [];
        let already = 0;
        for (const group of [...groups].sort((a, b) => a.day.getTime() - b.day.getTime())) {
            const ids: string[] = [];
            for (const row of group.rows) {
                try {
                    if (row.choice === 'skip') continue;
                    if (row.choice === 'new') {
                        const id = await createPiece(row);
                        if (id) ids.push(id);
                    } else if (row.choice.startsWith('same:')) {
                        const target = rowByKey.get(row.choice.slice(5));
                        const id = target ? await createPiece(target) : undefined;
                        if (id) ids.push(id);
                    } else {
                        ids.push(row.choice);
                    }
                } catch (err) {
                    console.error('[OutfitPhotoLog] Failed to add a piece:', err);
                }
            }
            const unique = [...new Set(ids)];
            if (unique.length === 0) continue;
            const today = isSameDay(group.day, new Date());
            // Midday on that day, so time zones never tip it into another date.
            const when = new Date(group.day.getFullYear(), group.day.getMonth(), group.day.getDate(), 12);
            if (await logOutfitWear(unique, mood.id, null, today ? undefined : when)) logged.push(group.day);
            else already += 1;
        }
        setResult({ days: logged, added: created.size, already });
        setPhase('done');
    };

    const optionsFor = (row: Row) =>
        clothes
            .map((c) => ({ c, s: matchScore(row.detected, c) }))
            .filter(({ s }) => s > 0)
            .sort((a, b) => b.s - a.s)
            .map(({ c }) => c);

    const describe = (row: Row) => {
        const match = byId.get(row.choice);
        if (match) return { name: itemName(match), note: 'From your closet', thumb: match.thumbnailUrl || match.imageUrl };
        if (row.choice === 'skip') return { name: 'Left out', note: 'Not logged', thumb: null };
        if (row.choice.startsWith('same:')) {
            const target = rowByKey.get(row.choice.slice(5));
            return { name: `New: ${target ? itemName(target.detected) : itemName(row.detected)}`, note: 'Same new piece', thumb: target?.crop ?? null };
        }
        return { name: `New: ${itemName(row.detected)}`, note: 'Joins your closet', thumb: null };
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-paper rounded-[28px] border-[1.5px] border-ink overflow-hidden animate-scale-in max-h-[90dvh] flex flex-col">
                {phase === 'reading' && (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-ink animate-spin mx-auto mb-4" />
                        <h3 className="font-display text-xl font-extrabold text-ink">Spotting your outfits</h3>
                        <p className="text-sm text-ink/50 mt-1">Photo {Math.min(read + 1, photoCount)} of {photoCount}…</p>
                    </div>
                )}

                {phase === 'review' && (
                    <>
                        <div className="flex-none px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-display text-xl font-extrabold text-ink">
                                    {allRows.length === 0 ? 'No clothes found' : groups.length === 1 ? `Found ${allRows.length} ${allRows.length === 1 ? 'piece' : 'pieces'}` : `${groups.length} days found`}
                                </h3>
                                <p className="text-xs text-ink/60 mt-0.5">
                                    {allRows.length === 0 ? 'Try a photo where the outfit is in clear view.' : 'Check the days and the matches, then log them.'}
                                </p>
                            </div>
                            <button type="button" onClick={onClose} aria-label="Close" className="flex-none w-8 h-8 rounded-full bg-ink/80 text-white flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {(skippedPhotos > 0 || files.length > MAX_PHOTOS) && (
                            <div className="flex-none px-5 pb-2 space-y-0.5">
                                {skippedPhotos > 0 && <p className="text-[11px] text-ink/50 inline-flex items-center gap-1"><ImageOff className="w-3 h-3" /> {skippedPhotos} photo{skippedPhotos === 1 ? '' : 's'} couldn’t be read.</p>}
                                {files.length > MAX_PHOTOS && <p className="text-[11px] text-ink/50">We read the first {MAX_PHOTOS} photos. Add the rest next round.</p>}
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
                            {groups.map((group) => (
                                <section key={group.key} aria-label={dayLabel(group.day)}>
                                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                        <h4 className="font-display text-base font-extrabold text-ink">{dayLabel(group.day)}</h4>
                                        <span className="relative text-[11px] font-semibold text-ink/55">
                                            {SOURCE_NOTE[group.source]} · <span className="underline underline-offset-2">Change</span>
                                            <input
                                                type="date"
                                                value={toInputValue(group.day)}
                                                max={toInputValue(new Date())}
                                                onChange={(e) => setDay(group.key, e.target.value)}
                                                onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* not supported */ } }}
                                                aria-label={`Change the day for ${dayLabel(group.day)}`}
                                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                            />
                                        </span>
                                    </div>
                                    <ul className="space-y-2">
                                        {group.rows.map((row) => {
                                            const info = describe(row);
                                            return (
                                                <li key={row.key} className={`flex items-center gap-2.5 p-2 rounded-2xl bg-white border border-ink/10 ${row.choice === 'skip' ? 'opacity-50' : ''}`}>
                                                    <img src={row.crop} alt="" className="flex-none w-12 h-12 rounded-xl object-cover bg-paper" />
                                                    <ArrowRight className="flex-none w-3.5 h-3.5 text-ink/40" />
                                                    {info.thumb ? (
                                                        <img src={info.thumb} alt="" className="flex-none w-12 h-12 rounded-xl object-cover bg-paper ring-2 ring-lime" />
                                                    ) : (
                                                        <span className="flex-none w-12 h-12 rounded-xl border-2 border-dashed border-ink/30 flex items-center justify-center text-ink/50">
                                                            {row.choice === 'skip' ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                        </span>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-ink truncate">{info.name}</p>
                                                        {/* A native picker behind a small label: easy on phones, no oversized text */}
                                                        <span className="relative inline-flex items-center gap-0.5 text-[11px] font-semibold text-ink/60">
                                                            {info.note} · <span className="underline underline-offset-2">Change</span>
                                                            <select
                                                                value={row.choice}
                                                                onChange={(e) => setChoice(row.key, e.target.value)}
                                                                aria-label="Which piece is this?"
                                                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                                            >
                                                                {optionsFor(row).map((c) => <option key={c.id} value={c.id}>{itemName(c)}</option>)}
                                                                <option value="new">Add as a new piece</option>
                                                                {newRows.filter((n) => n.key !== row.key).map((n) => (
                                                                    <option key={n.key} value={`same:${n.key}`}>Same as new {itemName(n.detected)}</option>
                                                                ))}
                                                                <option value="skip">Leave it out</option>
                                                            </select>
                                                        </span>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            ))}
                        </div>
                        <div className="flex-none border-t border-ink/10 px-4 py-3">
                            <button
                                type="button"
                                onClick={() => void logAll()}
                                disabled={dayCount === 0}
                                className="w-full h-12 rounded-full bg-ink text-paper text-sm font-bold disabled:opacity-50"
                            >
                                {groups.length === 1 ? `Log it for ${isSameDay(groups[0].day, new Date()) ? 'today' : dayLabel(groups[0].day)}` : `Log ${dayCount} days`}
                            </button>
                        </div>
                    </>
                )}

                {phase === 'saving' && (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-ink animate-spin mx-auto mb-4" />
                        <h3 className="font-display text-xl font-extrabold text-ink">Logging…</h3>
                    </div>
                )}

                {phase === 'done' && result && (
                    <div className="p-6 text-center">
                        <CheckCircle2 className="w-10 h-10 text-ink mx-auto mb-3" />
                        <h3 className="font-display text-xl font-extrabold text-ink">
                            {result.days.length === 0
                                ? (result.already > 0 ? 'Already logged' : 'Couldn’t save that')
                                : result.days.length === 1 ? `Logged for ${dayLabel(result.days[0])}` : `${result.days.length} days logged`}
                        </h3>
                        <p className="text-sm text-ink/60 mt-1">
                            {result.days.length > 1 && <>{result.days.map(dayLabel).join(', ')}.<br /></>}
                            {result.added > 0 && `${result.added} new ${result.added === 1 ? 'piece' : 'pieces'} joined your closet. `}
                            {result.already > 0 && `${result.already} ${result.already === 1 ? 'outfit was' : 'outfits were'} already logged.`}
                            {result.days.length === 0 && result.already === 0 && 'Check your connection and try again.'}
                        </p>
                        <button type="button" onClick={onClose} className="mt-5 w-full h-12 rounded-full bg-ink text-paper text-sm font-bold">Done</button>
                    </div>
                )}
            </div>
        </div>
    );
};
