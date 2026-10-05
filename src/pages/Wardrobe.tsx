import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Plus, Sparkles, Info, Star } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { ClosetRail } from '../components/closet/ClosetRail';
import { ItemDetailModal } from '../components/wardrobe/ItemDetailModal';
import { GarmentImage } from '../components/common/GarmentImage';
import { PageHeader } from '../components/common/PageHeader';
import { useShortScreen } from '../hooks/useShortScreen';
import { dustyLine, wornLine } from '../copy/voice';
import { ClothingCategory, type ClothingItem } from '../types';
import { computeSeasonalLeastWornIds } from '../services/agents/agentOutputGuards';
import { daysIdle, lightness } from '../utils/outfitSlots';
import { itemName } from '../utils/itemName';
import type { TodayRouteState } from './Today';

/** Rails top to bottom in the order an outfit is put together. */
const RAILS: Array<{ category: ClothingCategory; label: string }> = [
    { category: ClothingCategory.Outerwear, label: 'Layers' },
    { category: ClothingCategory.Tops, label: 'Tops' },
    { category: ClothingCategory.Bottoms, label: 'Bottoms' },
    { category: ClothingCategory.Dresses, label: 'Dresses' },
    { category: ClothingCategory.Shoes, label: 'Shoes' },
];

type SortId = 'dusty' | 'recent' | 'mostWorn' | 'light';
const SORTS: Array<{ id: SortId; label: string }> = [
    { id: 'dusty', label: 'Dusty first' },
    { id: 'recent', label: 'Newest' },
    { id: 'mostWorn', label: 'Most worn' },
    { id: 'light', label: 'Light → dark' },
];

/**
 * Closet — the bird's-eye view: every category hangs on its own rail, stacked, so the whole closet
 * is visible at once. Tap a piece to see it, tag it "Wear more", or "Style it" (Today builds a look
 * around it). Neglected pieces (in season, unworn 3+ weeks) carry a "days idle" badge.
 */
const Wardrobe: React.FC = () => {
    const { clothes, outfits, isLoading, tryItItemIds, addTryItItem, removeTryItItem } = useWardrobe();
    const navigate = useNavigate();
    const compact = useShortScreen();
    const [sort, setSort] = useState<SortId>('dusty');
    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [swayKey, setSwayKey] = useState(0);
    const [detail, setDetail] = useState<ClothingItem | null>(null);

    const dustyDays = useMemo(() => {
        const byId = new Map(clothes.map((c) => [c.id, c]));
        const ids = computeSeasonalLeastWornIds(clothes, outfits, clothes.length);
        return new Map(ids.map((id) => [id, byId.get(id) ? daysIdle(byId.get(id)!) : 0] as const));
    }, [clothes, outfits]);
    const wearMoreIds = useMemo(() => new Set(tryItItemIds), [tryItItemIds]);

    const rails = useMemo(() => {
        const q = search.trim().toLowerCase();
        const matches = (item: ClothingItem) => !q ||
            item.subcategory.toLowerCase().includes(q) ||
            item.color.toLowerCase().includes(q) ||
            item.aiTags?.some((tag) => tag.toLowerCase().includes(q));
        const order = (a: ClothingItem, b: ClothingItem) => {
            switch (sort) {
                case 'dusty': {
                    const da = dustyDays.has(a.id) ? 1 : 0;
                    const db = dustyDays.has(b.id) ? 1 : 0;
                    return db - da || daysIdle(b) - daysIdle(a);
                }
                case 'mostWorn': return b.wearFrequency - a.wearFrequency;
                case 'light': return lightness(b.colorHex) - lightness(a.colorHex);
                default: return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
            }
        };
        return RAILS.map((r) => ({ ...r, items: clothes.filter((c) => c.category === r.category && matches(c)).sort(order) }));
    }, [clothes, search, sort, dustyDays]);

    const selected = selectedId ? clothes.find((c) => c.id === selectedId) ?? null : null;
    const searching = search.trim().length > 0;
    const visibleRails = searching ? rails.filter((r) => r.items.length > 0) : rails;
    const openScanner = () => window.dispatchEvent(new CustomEvent('open-scanner'));
    const select = (item: ClothingItem) => {
        setSelectedId(item.id);
        setSwayKey((k) => k + 1);
    };
    const toggleWearMore = (item: ClothingItem) => {
        if (wearMoreIds.has(item.id)) void removeTryItItem(item.id);
        else void addTryItItem(item.id);
    };
    const styleIt = (item: ClothingItem) => navigate('/', { state: { lockItemId: item.id } satisfies TodayRouteState });

    const header = (
        <PageHeader
            title="Closet"
            eyebrow={<>{clothes.length} {clothes.length === 1 ? 'piece' : 'pieces'}{dustyDays.size > 0 && ` · ${dustyDays.size} gathering dust`}</>}
        />
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                {header}
                {[0, 1, 2].map((i) => <div key={i} className="skeleton h-[96px] w-full rounded-[22px]" />)}
            </div>
        );
    }

    if (clothes.length === 0) {
        return (
            <div className="space-y-6">
                {header}
                <div className="flex flex-col items-center text-center px-6 py-10 rounded-[28px] border-2 border-dashed border-ink/40">
                    <h2 className="font-display text-xl font-extrabold text-ink">Nothing on the rails yet</h2>
                    <p className="text-sm text-ink/60 mt-1 mb-5">Pick a few basics, or snap your closet. One photo can catch several pieces.</p>
                    <div className="flex flex-col w-full gap-2.5">
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-starter-picker'))}
                            className="h-12 rounded-full bg-ink text-paper font-bold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.97]"
                        >
                            <Plus className="w-4 h-4" /> Pick my basics
                        </button>
                        <button
                            type="button"
                            onClick={openScanner}
                            className="h-12 rounded-full border-[1.5px] border-ink text-ink font-bold text-sm active:scale-[0.97]"
                        >
                            Scan my clothes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const sizeFor = (category: ClothingCategory) =>
        category === ClothingCategory.Shoes ? (compact ? 52 : 60) : (compact ? 64 : 76);

    return (
        <div className="space-y-4 pb-2">
            {header}

            <div className="flex items-center gap-2 -mx-4 px-4 overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,black_88%,transparent)]">
                <button
                    type="button"
                    onClick={() => { setSearchOpen((o) => !o); if (searchOpen) setSearch(''); }}
                    aria-label={searchOpen ? 'Close search' : 'Search the closet'}
                    aria-expanded={searchOpen}
                    className={`flex-none w-9 h-9 rounded-full border-[1.5px] border-ink flex items-center justify-center ${searchOpen ? 'bg-ink text-lime' : 'text-ink'}`}
                >
                    {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                </button>
                {SORTS.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setSort(s.id)}
                        aria-pressed={sort === s.id}
                        className={`flex-none h-9 px-3.5 rounded-full border-[1.5px] border-ink text-xs font-bold whitespace-nowrap ${sort === s.id ? 'bg-lime' : ''}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {searchOpen && (
                <input
                    type="search"
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search pieces, colours, tags…"
                    aria-label="Search pieces, colours, tags"
                    className="w-full h-11 px-4 rounded-full bg-white border-[1.5px] border-ink text-sm text-ink placeholder:text-ink/40 outline-none focus:ring-2 focus:ring-lime"
                />
            )}

            {visibleRails.length === 0 ? (
                <p className="text-sm text-ink/60 text-center py-16">Nothing matches “{search}”.</p>
            ) : (
                <div className="space-y-2">
                    {visibleRails.map((r) => (
                        <ClosetRail
                            key={r.category}
                            label={r.label}
                            items={r.items}
                            dustyDays={dustyDays}
                            wearMoreIds={wearMoreIds}
                            selectedId={selectedId}
                            swayKey={swayKey}
                            onSelect={select}
                            onAdd={openScanner}
                            shelf={r.category === ClothingCategory.Shoes}
                            size={sizeFor(r.category)}
                        />
                    ))}
                </div>
            )}

            {/* The picked piece: pinned above the nav so its actions stay in thumb reach */}
            <div className="sticky z-30 -mx-4 px-4 pt-1 pb-2 bg-paper/95 backdrop-blur-sm" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
                {selected ? (
                    <div className="rounded-[22px] bg-white border-[1.5px] border-ink p-3 animate-fade-in-up">
                        <div className="flex items-center gap-3">
                            <div className="flex-none w-11 h-11 rounded-xl overflow-hidden bg-paper">
                                <GarmentImage item={selected} className="w-full h-full" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-extrabold leading-tight text-ink truncate">{itemName(selected)}</p>
                                <p className="text-xs text-ink/60 truncate">
                                    {dustyDays.has(selected.id) ? dustyLine(selected, dustyDays.get(selected.id) ?? 21) : wornLine(selected)}
                                </p>
                            </div>
                            <button type="button" onClick={() => setSelectedId(null)} aria-label="Close" className="flex-none w-8 h-8 rounded-full text-ink/50 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-2.5">
                            <button
                                type="button"
                                onClick={() => setDetail(selected)}
                                aria-label={`Details for ${itemName(selected)}`}
                                className="flex-none w-10 h-10 rounded-full border-[1.5px] border-ink flex items-center justify-center"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleWearMore(selected)}
                                aria-pressed={wearMoreIds.has(selected.id)}
                                className={`flex-1 h-10 rounded-full border-[1.5px] border-ink text-xs font-bold inline-flex items-center justify-center gap-1.5 ${wearMoreIds.has(selected.id) ? 'bg-lime' : ''}`}
                            >
                                <Star className={`w-3.5 h-3.5 ${wearMoreIds.has(selected.id) ? 'fill-ink' : ''}`} /> Wear more
                            </button>
                            <button
                                type="button"
                                onClick={() => styleIt(selected)}
                                className="flex-1 h-10 rounded-full bg-ink text-paper text-xs font-bold inline-flex items-center justify-center gap-1.5"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Style it
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-xs font-semibold text-ink/50 py-2">Tap a piece to style it or wear it more.</p>
                )}
            </div>

            {detail && <ItemDetailModal item={detail} onClose={() => setDetail(null)} />}
        </div>
    );
};

export default Wardrobe;
