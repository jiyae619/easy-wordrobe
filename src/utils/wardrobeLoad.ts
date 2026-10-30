/**
 * The closet's first read for a signed-in user. Until it lands, an empty `clothes` array means
 * "not loaded yet", not "empty closet", so pages must show a loading state rather than the
 * cold-start prompts.
 */
export const isWardrobePending = (uid: string | null, loadedUid: string | null): boolean =>
    uid !== null && loadedUid !== uid;

/**
 * Merge a freshly loaded closet with pieces added locally while that read was in flight (the
 * scanner is reachable before it lands). The loaded copy wins when both have the same id.
 */
export function mergeLoadedClothes<T extends { id: string }>(loaded: T[], local: T[]): T[] {
    const loadedIds = new Set(loaded.map((item) => item.id));
    return [...local.filter((item) => !loadedIds.has(item.id)), ...loaded];
}
