import { type FashionMood } from '../types';

export const MOODS: FashionMood[] = [
    {
        id: 'professional',
        name: 'Professional',
        description: 'Clean and polished for the office',
        colorPalette: ['#2D3A2D', '#3F4F37', '#F4F5F0'],
        previewImageUrl: '/demo-images/mood-professional.jpg',
        tags: ['work', 'office', 'formal']
    },
    {
        id: 'casual',
        name: 'Casual',
        description: 'Relaxed and comfortable everyday look',
        colorPalette: ['#6B7F5E', '#A8B89A', '#E8EBE4'],
        previewImageUrl: '/demo-images/mood-casual.jpg',
        tags: ['relax', 'comfortable', 'daily']
    },
    {
        id: 'occasion',
        name: 'Special day',
        description: 'Dressed up for a celebration, dinner, date or event',
        colorPalette: ['#556849', '#A8B89A', '#F4F5F0'],
        previewImageUrl: '/demo-images/mood-elegant.jpg',
        tags: ['celebration', 'dinner', 'date', 'event', 'dressy']
    },
];

/**
 * Moods that were offered once and may still be stored: in sessionStorage (selected mood), user
 * settings (preferredVibe), item userMoods/aiTags and past wear records. Never selectable again;
 * kept only so history can still show a readable name.
 */
const RETIRED_MOOD_NAMES: Record<string, string> = {
    creative: 'Creative',
    sporty: 'Sporty',
    romantic: 'Romantic',
};

/**
 * Retired moods whose pieces belong to a current one: Romantic (silk, dresses, heels) became the
 * gender-neutral Special day. Stored selections, favourites, deep links and item tags follow it.
 */
const MOOD_ALIASES: Record<string, string> = {
    romantic: 'occasion',
};

/** True for a mood id that can be selected today. */
export function isMoodId(id: unknown): id is string {
    return typeof id === 'string' && MOODS.some((m) => m.id === id);
}

/** A stored mood id as a selectable one: itself, its successor (romantic → occasion), or undefined. */
export function resolveMoodId(id: unknown): string | undefined {
    if (isMoodId(id)) return id;
    const successor = typeof id === 'string' ? MOOD_ALIASES[id] : undefined;
    return isMoodId(successor) ? successor : undefined;
}

/** Display name for any stored mood id, including retired ones. */
export function moodLabel(id: string): string {
    const known = MOODS.find((m) => m.id === id)?.name ?? RETIRED_MOOD_NAMES[id];
    return known ?? (id ? id.charAt(0).toUpperCase() + id.slice(1) : '');
}
