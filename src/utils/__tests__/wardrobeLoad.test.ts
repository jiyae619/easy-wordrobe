import { describe, expect, it } from 'vitest';
import { isWardrobePending, mergeLoadedClothes } from '../wardrobeLoad';

describe('isWardrobePending', () => {
    it('is pending from sign-in until that user\'s closet has loaded', () => {
        expect(isWardrobePending('u1', null)).toBe(true);
        expect(isWardrobePending('u1', 'u1')).toBe(false);
    });

    it('is pending again when a different user signs in', () => {
        expect(isWardrobePending('u2', 'u1')).toBe(true);
    });

    it('is never pending when signed out', () => {
        expect(isWardrobePending(null, null)).toBe(false);
        expect(isWardrobePending(null, 'u1')).toBe(false);
    });
});

describe('mergeLoadedClothes', () => {
    it('keeps pieces added while the load was in flight', () => {
        const loaded = [{ id: 'a' }, { id: 'b' }];
        expect(mergeLoadedClothes(loaded, [{ id: 'new' }])).toEqual([{ id: 'new' }, { id: 'a' }, { id: 'b' }]);
    });

    it('prefers the loaded copy when a piece is in both', () => {
        const loaded = [{ id: 'a', v: 'server' }];
        expect(mergeLoadedClothes(loaded, [{ id: 'a', v: 'local' }])).toEqual([{ id: 'a', v: 'server' }]);
    });

    it('returns the loaded closet when nothing was added locally', () => {
        const loaded = [{ id: 'a' }];
        expect(mergeLoadedClothes(loaded, [])).toEqual(loaded);
    });
});
