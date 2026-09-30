// In-memory Firestore stand-in, seeded with a believable 3-week wardrobe history.
import type { ClothingItem, WearRecord, ColorCorrection, SuggestionEvent } from '/src/types/index';
import { buildWardrobe, buildOutfits } from './seed';
import { demoDelay } from './demoUser';

export interface InsightsCache { nudges: string[]; signature: string; computedAt: string; }
export interface UserSettings {
    bookmarkedItems: string[];
    tryItItemIds?: string[];
    gender?: string;
    height?: string;
    weight?: string;
    preferredVibe?: string;
    city?: string;
}

const clone = <T,>(v: T): T => (v instanceof Date ? new Date(v.getTime()) as any : Array.isArray(v) ? v.map(clone) as any : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) as T : v);

const state = {
    wardrobe: new Map<string, ClothingItem>(),
    outfits: new Map<string, WearRecord>(),
    settings: { bookmarkedItems: [], tryItItemIds: ['dress-olive-slip'], preferredVibe: 'casual', city: 'New York', gender: 'Female', height: "5'5\"" } as UserSettings,
    events: [] as SuggestionEvent[],
    insights: null as InsightsCache | null,
};
buildWardrobe().forEach((i) => state.wardrobe.set(i.id, i));
buildOutfits().forEach((o) => state.outfits.set(o.id, o));
(window as any).__DEMO_STATE__ = state;

export const firestoreService = {
    async getWardrobe(_uid: string): Promise<ClothingItem[]> { await demoDelay('data'); return [...state.wardrobe.values()].map(clone); },
    async addClothingItem(_uid: string, item: ClothingItem) { state.wardrobe.set(item.id, clone(item)); },
    async addClothingItems(_uid: string, items: ClothingItem[]) { items.forEach((i) => state.wardrobe.set(i.id, clone(i))); },
    async updateClothingItem(_uid: string, itemId: string, updates: Partial<ClothingItem>) {
        const cur = state.wardrobe.get(itemId); if (cur) state.wardrobe.set(itemId, { ...cur, ...clone(updates) });
    },
    async deleteClothingItem(_uid: string, itemId: string) { state.wardrobe.delete(itemId); },
    async logColorCorrection(_uid: string, _c: ColorCorrection) { },
    async getOutfits(_uid: string) { return [...state.outfits.values()].map(clone); },
    async getRecentOutfits(_uid: string, days: number): Promise<WearRecord[]> {
        await demoDelay('data');
        const since = Date.now() - days * 86400000;
        return [...state.outfits.values()].filter((o) => o.date.getTime() >= since)
            .sort((a, b) => b.date.getTime() - a.date.getTime()).map(clone);
    },
    async addOutfit(_uid: string, record: WearRecord) { state.outfits.set(record.id, clone(record)); },
    async setOutfitFavorite(_uid: string, outfitId: string, favorite: boolean) {
        const cur = state.outfits.get(outfitId); if (cur) state.outfits.set(outfitId, { ...cur, favorite });
    },
    async deleteAllOutfits(_uid: string) { state.outfits.clear(); },
    async getUserSettings(_uid: string): Promise<UserSettings> { return clone(state.settings); },
    async updateUserSettings(_uid: string, updates: Partial<UserSettings>) { state.settings = { ...state.settings, ...clone(updates) }; },
    async addTryItItem(_uid: string, itemId: string): Promise<string[]> {
        const cur = state.settings.tryItItemIds ?? [];
        if (!cur.includes(itemId)) state.settings.tryItItemIds = [...cur, itemId];
        return [...(state.settings.tryItItemIds ?? [])];
    },
    async removeTryItItem(_uid: string, itemId: string): Promise<string[]> {
        state.settings.tryItItemIds = (state.settings.tryItItemIds ?? []).filter((i) => i !== itemId);
        return [...state.settings.tryItItemIds];
    },
    async logSuggestionEvent(_uid: string, event: SuggestionEvent) { state.events.push(clone(event)); },
    async getRecentSuggestionEvents(_uid: string, _days: number): Promise<SuggestionEvent[]> { return state.events.map(clone); },
    async getInsightsCache(_uid: string): Promise<InsightsCache | null> { return state.insights ? clone(state.insights) : null; },
    async saveInsightsCache(_uid: string, nudges: string[], signature: string) {
        state.insights = { nudges, signature, computedAt: new Date().toISOString() };
    },
    async recordAgentHealth() { },
    async migrateFromLocalStorage(_uid: string) { return { migratedItems: 0, migratedOutfits: 0 }; },
};
