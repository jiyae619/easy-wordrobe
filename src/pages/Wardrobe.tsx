import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Plus, Sparkles, Info } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { CardFan } from '../components/closet/CardFan';
import { ItemDetailModal } from '../components/wardrobe/ItemDetailModal';
import { GarmentImage } from '../components/common/GarmentImage';
import { PageHeader } from '../components/common/PageHeader';
import { useShortScreen } from '../hooks/useShortScreen';
import { ClothingCategory, type ClothingItem } from '../types';
import { computeSeasonalLeastWornIds } from '../services/agents/agentOutputGuards';
import { daysIdle, lightness } from '../utils/outfitSlots';

const DECKS: Array<{ category: ClothingCategory; label: string }> = [
    { category: ClothingCategory.Tops, label: 'Tops' },
    { category: ClothingCategory.Bottoms, label: 'Bottoms' },
    { category: ClothingCategory.Outerwear, label: 'Layers' },
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
 * Closet — every category is a deck of cards. Tap a deck to deal it into a fanned hand, drag to
 * sweep through it, tap the raised card for its details, or "Style it" to build today's outfit
 * around it. Neglected pieces (in season, unworn 3+ weeks) carry a "days idle" badge.
 */
const Wardrobe: React.FC = () => {
    const { clothes, outfits, isLoading } = useWardrobe();
    const navigate = useNavigate();
    const compact = useShortScreen();
    const [deck, setDeck] = useState<ClothingCategory>(ClothingCategory.Tops);
    const [sort, setSort] = useState<SortId>('dusty');
    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [selected, setSelected] = useState<ClothingItem | null>(null);

    const dustyDays = useMemo(() => {
        const byId = new Map(clothes.map((c) => [c.id, c]));
        const ids = computeSeasonalLeastWornIds(clothes, outfits, clothes.length);
        return new Map(ids.map((id) => [id, byId.get(id) ? daysIdle(byId.get(id)!) : 0] as const));
    }, [clothes, outfits]);

    const decks = useMemo(() => {
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
        return DECKS.map((d) => ({ ...d, items: clothes.filter((c) => c.category === d.category && matches(c)).sort(order) }));
    }, [clothes, search, sort, dustyDays]);

    // Show the chosen deck, or the first non-empty one when it has no cards (e.g. after a search).
    const active = decks.find((d) => d.category === deck && d.items.length > 0) ?? decks.find((d) => d.items.length > 0) ?? null;
    const focused = (active && focusedId ? active.items.find((i) => i.id === focusedId) : null) ?? active?.items[0] ?? null;
    const dealKey = `${active?.category}|${sort}|${search.trim().toLowerCase()}`;

    const onFocus = useCallback((item: ClothingItem) => setFocusedId(item.id), []);
    const onOpen = useCallback((item: ClothingItem) => setSelected(item), []);

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
                <div className="skeleton h-[300px] w-full rounded-[28px]" />
                <div className="flex justify-between">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton w-14 h-20 rounded-xl" />)}</div>
            </div>
        );
    }

    if (clothes.length === 0) {
        return (
            <div className="space-y-6">
                {header}
                <div className="flex flex-col items-center text-center px-6 py-10 rounded-[28px] border-2 border-dashed border-ink/40">
                    <div className="relative w-20 h-24 mb-5" aria-hidden="true">
                        <span className="absolute inset-0 rounded-xl border-2 border-ink/40 -rotate-12" />
                        <span className="absolute inset-0 rounded-xl border-2 border-ink/60 rotate-6" />
                        <span className="absolute inset-0 rounded-xl border-2 border-dashed border-ink bg-paper" />
                    </div>
                    <h2 className="font-display text-xl font-extrabold text-ink">Nothing here yet</h2>
                    <p className="text-sm text-ink/60 mt-1 mb-5">Deal yourself a closet. Pick a few basics or scan your own.</p>
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

            {!active ? (
                <p className="text-sm text-ink/60 text-center py-16">Nothing matches “{search}”.</p>
            ) : (
                <>
                    {/* The dealt hand */}
                    <div className={`-mx-4 ${compact ? 'h-[236px]' : 'h-[372px]'}`}>
                        <CardFan
                            key={dealKey}
                            label={active.label}
                            items={active.items}
                            dustyDays={dustyDays}
                            onOpen={onOpen}
                            onFocus={onFocus}
                            onAdd={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
                            compact={compact}
                        />
                    </div>

                    {/* Focused card */}
                    {focused && (
                        <div className="flex items-end gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-[20px] font-extrabold leading-tight text-ink">{focused.color} {focused.subcategory}</p>
                                <p className="text-xs mt-1 text-ink/60 flex items-center gap-1.5">
                                    {dustyDays.has(focused.id) ? (
                                        <><span className="px-1.5 h-[18px] rounded-full bg-ink text-lime text-[10px] font-extrabold inline-flex items-center">DUSTY</span>resting for {dustyDays.get(focused.id)} days</>
                                    ) : (
                                        `Worn ${focused.wearFrequency}× · ${focused.lastWorn ? `last worn ${daysIdle(focused)} days ago` : 'not worn yet'}`
                                    )}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(focused)}
                                aria-label={`Details for ${focused.color} ${focused.subcategory}`}
                                className="flex-none w-11 h-11 rounded-full border-[1.5px] border-ink text-ink flex items-center justify-center"
                            >
                                <Info className="w-[18px] h-[18px]" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/', { state: { lockItemId: focused.id } })}
                                className="flex-none h-11 px-4 rounded-full bg-ink text-paper text-xs font-bold inline-flex items-center gap-1.5"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Style it
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Deck piles */}
            <div className="flex justify-between items-end pt-1" role="tablist" aria-label="Decks">
                {decks.map((d) => {
                    const on = active?.category === d.category;
                    const top = d.items[0];
                    return (
                        <button
                            key={d.category}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            disabled={d.items.length === 0}
                            onClick={() => { setDeck(d.category); setFocusedId(null); }}
                            aria-label={`${d.label} deck, ${d.items.length} cards`}
                            className={`relative w-[64px] ${compact ? 'h-[104px]' : 'h-[118px]'} p-0 border-0 bg-transparent text-ink disabled:opacity-35`}
                        >
                            <span className={`absolute ${compact ? 'left-2 w-12 h-[58px]' : 'left-1 w-14 h-[72px]'} rounded-xl border-[1.5px] border-ink -rotate-[9deg] transition-[top] duration-300 ${on ? 'bg-lime' : 'bg-white'}`} style={{ top: on ? 0 : 14 }} />
                            <span className={`absolute ${compact ? 'left-2 w-12 h-[58px]' : 'left-1 w-14 h-[72px]'} rounded-xl border-[1.5px] border-ink rotate-6 transition-[top] duration-300 ${on ? 'bg-lime' : 'bg-white'}`} style={{ top: on ? 0 : 14 }} />
                            <span className={`absolute ${compact ? 'left-2 w-12 h-[58px]' : 'left-1 w-14 h-[72px]'} rounded-xl bg-white overflow-hidden transition-[top] duration-300 ${on ? 'border-2 border-ink' : 'border-[1.5px] border-ink'}`} style={{ top: on ? 0 : 14 }}>
                                {top && <GarmentImage item={top} className="w-full h-full" />}
                            </span>
                            <span className="absolute inset-x-0 bottom-4 text-[11px] font-extrabold text-center">{d.label}</span>
                            <span className="absolute inset-x-0 bottom-0 text-[10px] font-semibold text-ink/50 text-center">{d.items.length}</span>
                        </button>
                    );
                })}
            </div>

            {selected && <ItemDetailModal item={selected} onClose={() => setSelected(null)} />}
        </div>
    );
};

export default Wardrobe;
