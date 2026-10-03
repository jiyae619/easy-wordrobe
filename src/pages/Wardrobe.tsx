import React, { useCallback, useMemo, useState } from 'react';
import { Search, X, Plus, ChevronRight } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { HangerRail } from '../components/closet/HangerRail';
import { ItemDetailModal } from '../components/wardrobe/ItemDetailModal';
import { GarmentImage } from '../components/common/GarmentImage';
import { ClothingCategory, type ClothingItem } from '../types';
import { computeSeasonalLeastWornIds } from '../services/agents/agentOutputGuards';
import { daysIdle, lightness } from '../utils/outfitSlots';

const RAILS: Array<{ category: ClothingCategory; label: string; shelf?: boolean }> = [
    { category: ClothingCategory.Outerwear, label: 'Layers' },
    { category: ClothingCategory.Tops, label: 'Tops' },
    { category: ClothingCategory.Bottoms, label: 'Bottoms' },
    { category: ClothingCategory.Dresses, label: 'Dresses' },
    { category: ClothingCategory.Shoes, label: 'Shoe shelf', shelf: true },
];

type SortId = 'recent' | 'dusty' | 'mostWorn' | 'light';
const SORTS: Array<{ id: SortId; label: string }> = [
    { id: 'recent', label: 'Newest' },
    { id: 'dusty', label: 'Dusty first' },
    { id: 'mostWorn', label: 'Most worn' },
    { id: 'light', label: 'Light → dark' },
];

/**
 * Closet — the wardrobe as hanger rails, one per category (shoes on a shelf). Swipe a rail to
 * browse, tap the centred piece to open its details. Neglected pieces (in season, unworn 3+ weeks)
 * carry a swinging "days idle" tag.
 */
const Wardrobe: React.FC = () => {
    const { clothes, outfits, isLoading } = useWardrobe();
    const [sort, setSort] = useState<SortId>('recent');
    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [focused, setFocused] = useState<ClothingItem | null>(null);
    const [selected, setSelected] = useState<ClothingItem | null>(null);

    const dustyDays = useMemo(() => {
        const ids = computeSeasonalLeastWornIds(clothes, outfits, clothes.length);
        return new Map(ids.map((id) => {
            const item = clothes.find((c) => c.id === id);
            return [id, item ? daysIdle(item) : 0] as const;
        }));
    }, [clothes, outfits]);

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
        return RAILS
            .map((r) => ({ ...r, items: clothes.filter((c) => c.category === r.category && matches(c)).sort(order) }))
            .filter((r) => r.items.length > 0);
    }, [clothes, search, sort, dustyDays]);

    const peek = (focused && clothes.find((c) => c.id === focused.id)) || rails[0]?.items[0] || null;
    const railKey = `${sort}|${search.trim().toLowerCase()}`;
    const onFocus = useCallback((item: ClothingItem) => setFocused(item), []);
    const onOpen = useCallback((item: ClothingItem) => setSelected(item), []);

    const header = (
        <div className="pr-12">
            <h1 className="font-display text-[34px] font-extrabold leading-none tracking-tight text-ink">Closet</h1>
            <p className="text-xs font-semibold text-olive-600 mt-1.5">
                {clothes.length} {clothes.length === 1 ? 'piece' : 'pieces'}
                {dustyDays.size > 0 && <span className="text-[#7A5A12]"> · {dustyDays.size} gathering dust</span>}
            </p>
        </div>
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                {header}
                {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                        <div className="skeleton h-3 w-24" />
                        <div className="skeleton h-28 w-full rounded-2xl" />
                    </div>
                ))}
            </div>
        );
    }

    if (clothes.length === 0) {
        return (
            <div className="space-y-6">
                {header}
                <div className="flex flex-col items-center text-center px-6 py-10 rounded-[28px] border-2 border-dashed border-ink/40">
                    <svg width="72" height="36" viewBox="0 0 56 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink mb-4" aria-hidden="true">
                        <path d="M25 6a3 3 0 1 1 3 3v3L5 20h46L28 12" />
                    </svg>
                    <h2 className="font-display text-xl font-extrabold text-ink">An empty rail</h2>
                    <p className="text-sm text-olive-600 mt-1 mb-5">Hang your first pieces — pick common basics or scan your own.</p>
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
                            onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
                            className="h-12 rounded-full border-[1.5px] border-ink text-ink font-bold text-sm active:scale-[0.97]"
                        >
                            Scan my items
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {header}

            <div className="flex items-center gap-2 -mx-4 px-4 overflow-x-auto no-scrollbar">
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
                    className="w-full h-11 px-4 rounded-full bg-white border-[1.5px] border-ink text-sm text-ink placeholder:text-olive-400 outline-none focus:ring-2 focus:ring-lime"
                />
            )}

            {rails.length === 0 ? (
                <p className="text-sm text-olive-600 text-center py-12">Nothing on the rails matches “{search}”.</p>
            ) : (
                <div key={railKey} className="space-y-3">
                    {rails.map((r) => (
                        <HangerRail
                            key={r.category}
                            label={r.label}
                            items={r.items}
                            shelf={r.shelf}
                            dustyDays={dustyDays}
                            onOpen={onOpen}
                            onFocus={onFocus}
                        />
                    ))}
                </div>
            )}

            {peek && (
                <div className="sticky bottom-[92px] z-30 pt-2">
                    <button
                        type="button"
                        onClick={() => setSelected(peek)}
                        className="w-full flex items-center gap-3 p-2 pr-3 rounded-[20px] bg-white border-[1.5px] border-ink shadow-[0_10px_24px_rgba(21,26,20,0.14)] text-left active:scale-[0.99]"
                    >
                        <span className="w-12 h-12 flex-none rounded-xl bg-paper overflow-hidden flex items-center justify-center">
                            <GarmentImage item={peek} className="w-full h-full" rounded="rounded-xl" />
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block font-bold text-sm text-ink truncate">{peek.color} {peek.subcategory}</span>
                            <span className={`block text-xs truncate ${dustyDays.has(peek.id) ? 'text-[#7A5A12] font-semibold' : 'text-olive-600'}`}>
                                {dustyDays.has(peek.id)
                                    ? `${dustyDays.get(peek.id)} days on the rail — wear me?`
                                    : `Worn ${peek.wearFrequency}× · ${peek.lastWorn ? `last ${daysIdle(peek)}d ago` : 'not worn yet'}`}
                            </span>
                        </span>
                        <span className="flex-none h-10 px-3.5 rounded-full bg-ink text-paper text-xs font-bold flex items-center gap-1">
                            Details <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                    </button>
                </div>
            )}

            {selected && <ItemDetailModal item={selected} onClose={() => setSelected(null)} />}
        </div>
    );
};

export default Wardrobe;
