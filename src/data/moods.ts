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
        id: 'sporty',
        name: 'Sporty',
        description: 'Active and energetic athleisure',
        colorPalette: ['#556849', '#8A9E78', '#D1D8C9'],
        previewImageUrl: '/demo-images/mood-sporty.jpg',
        tags: ['active', 'gym', 'run']
    },
    {
        id: 'creative',
        name: 'Creative',
        description: 'Bold and expressive combinations',
        colorPalette: ['#3F4F37', '#6B7F5E', '#D1D8C9'],
        previewImageUrl: '/demo-images/mood-creative.jpg',
        tags: ['art', 'bold', 'color']
    },
    {
        id: 'romantic',
        name: 'Romantic',
        description: 'Soft and elegant date-night looks',
        colorPalette: ['#556849', '#A8B89A', '#F4F5F0'],
        previewImageUrl: '/demo-images/mood-romantic.jpg',
        tags: ['date', 'evening', 'soft', 'romantic']
    },
];
