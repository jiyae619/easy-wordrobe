import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { buildCatalogItem, buildStarterDeck, catalogImageUrl, type StarterDeckCard } from '../../data/starterCatalog';
import { COLOR_PALETTE } from '../../data/colorPalette';
import { recordPickerEvent } from '../../services/agents/agentTelemetry';
import { ClothingCategory, type ClothingItem } from '../../types';

/**
 * Starter Closet Picker. Listens for the global `open-starter-picker` event and walks the user
 * through the STARTER_CATALOG deck one card at a time: toggle every color you own (multi-select —
 * each color becomes its own item), answer with "I have this" / "Don't have it". Accepts are held
 * locally and committed as ONE Firestore batch on finish, so abandoning mid-deck writes nothing.
 * Tap-only by design (no swipe): gestures can't express which colors are selected.
 */

const DOT_HINT_KEY = 'starter-picker-color-hint-v1';

type Phase = 'idle' | 'deck' | 'saving' | 'done';
type DeckCard = StarterDeckCard;

const CATEGORY_LABELS: Record<string, string> = {
    [ClothingCategory.Tops]: 'Tops',
    [ClothingCategory.Bottoms]: 'Bottoms',
    [ClothingCategory.Outerwear]: 'Outerwear',
    [ClothingCategory.Dresses]: 'Dresses',
    [ClothingCategory.Shoes]: 'Shoes',
};

function paletteHex(name: string): string {
    return COLOR_PALETTE.find((c) => c.name === name)?.hex ?? '#1C1C1C';
}

export const StarterPickerOverlay: React.FC = () => {
    const { clothes, addCatalogItems } = useWardrobe();
    const navigate = useNavigate();

    const [phase, setPhase] = useState<Phase>('idle');
    const [deck, setDeck] = useState<DeckCard[]>([]);
    const [idx, setIdx] = useState(0);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [shownColor, setShownColor] = useState<string>('');
    const [leaving, setLeaving] = useState<'yes' | 'no' | null>(null);
    const [showDotHint, setShowDotHint] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const acceptedRef = useRef<Array<Omit<ClothingItem, 'id' | 'dateAdded'>>>([]);
    const [acceptedCount, setAcceptedCount] = useState(0);
    const hintTimer = useRef<number | null>(null);
    const outfitReadyFired = useRef(false);

    // Selection defaults are set imperatively at each advance point (open / next card) rather than
    // in an effect, so a card's default color never causes a cascading render.
    const selectDefaultFor = (deckCard: DeckCard | undefined) => {
        const first = deckCard?.colors[0];
        setSelected(first ? new Set([first]) : new Set());
        setShownColor(first ?? '');
    };

    // Open on the global event; deck is (re)built against the wardrobe at open time. Deep-links may
    // pass a category filter in the event detail, e.g. { categories: ['bottoms'] } from the
    // "add a bottom" readiness callout — the progress bar collapses to the relevant segment(s).
    useEffect(() => {
        const open = (event: Event) => {
            const detail = (event as CustomEvent<{ categories?: ClothingCategory[] }>).detail;
            acceptedRef.current = [];
            outfitReadyFired.current = false;
            setAcceptedCount(0);
            setSaveError(null);
            setIdx(0);
            const built = buildStarterDeck(clothes, detail?.categories);
            setDeck(built);
            selectDefaultFor(built[0]);
            setPhase('deck');
            recordPickerEvent('opened');
        };
        window.addEventListener('open-starter-picker', open);
        return () => window.removeEventListener('open-starter-picker', open);
    }, [clothes]);

    const card = deck[idx];

    // Category progress: contiguous groups in deck order (locked by a catalog test).
    const segments = useMemo(() => {
        const groups: Array<{ category: string; count: number; startIdx: number }> = [];
        deck.forEach((c, i) => {
            const last = groups[groups.length - 1];
            if (last && last.category === c.entry.category) last.count += 1;
            else groups.push({ category: c.entry.category, count: 1, startIdx: i });
        });
        return groups;
    }, [deck]);

    const toggleColor = (color: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(color)) {
                next.delete(color);
                if (shownColor === color) {
                    const fallback = card.colors.find((c) => next.has(c));
                    if (fallback) setShownColor(fallback);
                }
            } else {
                next.add(color);
                setShownColor(color);
            }
            return next;
        });
        // First-time hint: shown once, on the first dot interaction.
        try {
            if (!localStorage.getItem(DOT_HINT_KEY)) {
                localStorage.setItem(DOT_HINT_KEY, '1');
                setShowDotHint(true);
                hintTimer.current = window.setTimeout(() => setShowDotHint(false), 4000);
            }
        } catch { /* private mode — skip the hint */ }
    };

    const finish = async () => {
        setPhase('saving');
        setSaveError(null);
        try {
            await addCatalogItems(acceptedRef.current);
            recordPickerEvent('completed');
            if (acceptedRef.current.length > 0) recordPickerEvent('itemsAdded', acceptedRef.current.length);
            setPhase('done');
        } catch (err) {
            console.error('[StarterPicker] Failed to save picks:', err);
            setSaveError('Could not save your items. Check your connection and try again.');
            setPhase('deck');
        }
    };

    const answer = (yes: boolean) => {
        if (leaving || !card) return;
        if (yes) {
            const picks = [...selected].map((color) => buildCatalogItem(card.entry, color));
            acceptedRef.current = [...acceptedRef.current, ...picks];
            setAcceptedCount(acceptedRef.current.length);

            // Funnel signal: fire once when the in-deck accepts first satisfy the outfit rules.
            if (!outfitReadyFired.current) {
                const cats = new Set(acceptedRef.current.map((p) => p.category));
                const ready = cats.has(ClothingCategory.Dresses) ||
                    ((cats.has(ClothingCategory.Tops) || cats.has(ClothingCategory.Outerwear)) && cats.has(ClothingCategory.Bottoms));
                if (ready) {
                    outfitReadyFired.current = true;
                    recordPickerEvent('outfitReady');
                }
            }
        }
        setShowDotHint(false);
        setLeaving(yes ? 'yes' : 'no');
        window.setTimeout(() => {
            setLeaving(null);
            if (idx + 1 >= deck.length) {
                void finish();
            } else {
                selectDefaultFor(deck[idx + 1]);
                setIdx(idx + 1);
            }
        }, 220);
    };

    const close = () => {
        if (phase === 'deck' && acceptedCount > 0) {
            if (!window.confirm(`Discard the ${acceptedCount} item${acceptedCount === 1 ? '' : 's'} you picked?`)) return;
        }
        if (hintTimer.current) window.clearTimeout(hintTimer.current);
        setPhase('idle');
    };

    if (phase === 'idle') return null;

    const answeredInSegment = (seg: { startIdx: number; count: number }) =>
        Math.max(0, Math.min(seg.count, idx - seg.startIdx));

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden animate-scale-in relative">
                <button
                    onClick={close}
                    aria-label="Close starter picker"
                    className="absolute top-4 right-4 z-10 p-2 rounded-full text-olive-400 hover:bg-olive-50 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {(phase === 'deck' || phase === 'saving') && deck.length > 0 && card && (
                    <div className="p-5 pb-6">
                        <h3 className="text-lg font-bold text-primary pr-10">Do you have these items in your closet?</h3>

                        {/* Category progress bar — one segment per category group */}
                        <div className="mt-4 mb-1 flex gap-1.5">
                            {segments.map((seg) => (
                                <div key={seg.category} className="h-1.5 rounded-full bg-olive-100 overflow-hidden" style={{ flexGrow: seg.count }}>
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${Math.round((answeredInSegment(seg) / seg.count) * 100)}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mb-4 flex gap-1.5">
                            {segments.map((seg) => (
                                <span
                                    key={seg.category}
                                    style={{ flexGrow: seg.count, flexBasis: 0 }}
                                    className={`text-[10px] font-semibold text-center truncate ${card.entry.category === seg.category ? 'text-primary' : 'text-olive-300'}`}
                                >
                                    {CATEGORY_LABELS[seg.category] ?? seg.category}
                                </span>
                            ))}
                        </div>

                        {/* Card stack */}
                        <div className="relative">
                            {idx + 2 < deck.length && <div className="absolute inset-0 translate-y-3 scale-[0.92] rounded-2xl bg-olive-50 border border-olive-100" />}
                            {idx + 1 < deck.length && <div className="absolute inset-0 translate-y-1.5 scale-[0.96] rounded-2xl bg-white border border-olive-100 shadow-sm" />}

                            <div
                                className={`relative rounded-2xl border border-olive-100 bg-white shadow-md overflow-hidden transition-all duration-200 motion-reduce:transition-none ${
                                    leaving === 'yes' ? 'translate-x-[120%] rotate-12 opacity-0' :
                                    leaving === 'no' ? '-translate-x-[120%] -rotate-12 opacity-0' : ''
                                }`}
                            >
                                <img
                                    src={catalogImageUrl(card.entry, shownColor)}
                                    alt={`${shownColor} ${card.entry.label}`}
                                    className="w-full aspect-square object-cover bg-olive-50"
                                    draggable={false}
                                />
                                <div className="px-4 pt-3">
                                    <p className="font-bold text-primary">{card.entry.label}</p>
                                    <p className="text-xs text-secondary">{CATEGORY_LABELS[card.entry.category] ?? card.entry.category}</p>
                                </div>

                                {/* Color dots (multi-select) + first-time hint */}
                                <div className="relative px-2 pt-1 flex items-center">
                                    {showDotHint && (
                                        <div className="absolute -top-9 left-3 z-10 px-3 py-1.5 bg-primary text-white text-[11px] font-medium rounded-lg shadow-md animate-fade-in-up">
                                            Each color you pick becomes its own item
                                            <div className="absolute -bottom-1 left-6 w-2 h-2 bg-primary rotate-45" />
                                        </div>
                                    )}
                                    {card.colors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => toggleColor(color)}
                                            aria-label={`${selected.has(color) ? 'Deselect' : 'Select'} ${color}`}
                                            aria-pressed={selected.has(color)}
                                            className="w-11 h-11 flex items-center justify-center"
                                        >
                                            <span
                                                className={`w-7 h-7 rounded-full border border-black/10 transition-shadow ${
                                                    selected.has(color) ? 'ring-2 ring-secondary ring-offset-2' : ''
                                                }`}
                                                style={{ backgroundColor: paletteHex(color) }}
                                            />
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-3 p-4">
                                    <button
                                        onClick={() => answer(false)}
                                        disabled={phase === 'saving'}
                                        className="flex-1 py-3 rounded-xl bg-olive-100 text-olive-500 text-sm font-bold hover:bg-olive-200 transition-colors active:scale-[0.97] disabled:opacity-50"
                                    >
                                        Don't have it
                                    </button>
                                    <button
                                        onClick={() => answer(true)}
                                        disabled={selected.size === 0 || phase === 'saving'}
                                        className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-olive-700 transition-colors active:scale-[0.97] disabled:bg-olive-200"
                                    >
                                        {selected.size > 1 ? `I have these (${selected.size})` : 'I have this'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {saveError && <p className="mt-3 text-xs text-red-600 text-center">{saveError}</p>}

                        <div className="mt-4 text-center min-h-[20px]">
                            {phase === 'saving' ? (
                                <span className="inline-flex items-center gap-2 text-xs font-semibold text-secondary">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving your closet…
                                </span>
                            ) : acceptedCount > 0 ? (
                                <button onClick={finish} className="text-xs font-bold text-secondary underline underline-offset-2">
                                    Save &amp; finish ({acceptedCount})
                                </button>
                            ) : null}
                        </div>
                    </div>
                )}

                {phase === 'deck' && deck.length === 0 && (
                    <div className="p-8 text-center">
                        <CheckCircle2 className="w-10 h-10 text-secondary mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-primary mb-1">Staples covered!</h3>
                        <p className="text-sm text-olive-500 mb-4">You already have everything in the starter set — scan your own pieces to keep growing.</p>
                        <button onClick={close} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-olive-700 transition-colors active:scale-[0.98]">
                            Done
                        </button>
                    </div>
                )}

                {phase === 'done' && (
                    <div className="p-8 text-center">
                        <CheckCircle2 className="w-10 h-10 text-secondary mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-primary mb-1">
                            {acceptedCount > 0 ? `Added ${acceptedCount} item${acceptedCount === 1 ? '' : 's'} to your closet` : 'No items added'}
                        </h3>
                        <p className="text-sm text-olive-500 mb-5">
                            {acceptedCount > 0 ? 'Your basics are in — let’s put them to work.' : 'No problem — you can scan your own pieces anytime.'}
                        </p>
                        {acceptedCount > 0 ? (
                            <button
                                onClick={() => { setPhase('idle'); navigate('/suggest'); }}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-olive-700 transition-colors active:scale-[0.98]"
                            >
                                Style my first outfit
                            </button>
                        ) : null}
                        <button
                            onClick={() => setPhase('idle')}
                            className={`w-full py-3 font-bold rounded-xl transition-colors active:scale-[0.98] ${
                                acceptedCount > 0 ? 'mt-2 text-secondary hover:bg-olive-50' : 'bg-primary text-white hover:bg-olive-700'
                            }`}
                        >
                            {acceptedCount > 0 ? 'Back to home' : 'Done'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
