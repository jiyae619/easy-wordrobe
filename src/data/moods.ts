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
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Sleek and understated elegance',
        colorPalette: ['#1A2419', '#2D3A2D', '#E8EBE4'],
        previewImageUrl: '/demo-images/mood-minimalist.jpg',
        tags: ['clean', 'simple', 'sleek']
    },
    {
        id: 'cozy',
        name: 'Cozy',
        description: 'Warm and layered comfort',
        colorPalette: ['#8A9E78', '#A8B89A', '#F4F5F0'],
        previewImageUrl: '/demo-images/mood-cozy.jpg',
        tags: ['winter', 'autumn', 'layer']
    },
    {
        id: 'elegant',
        name: 'Elegant',
        description: 'Sophisticated evening attire',
        colorPalette: ['#2D3A2D', '#556849', '#D1D8C9'],
        previewImageUrl: '/demo-images/mood-elegant.jpg',
        tags: ['night', 'date', 'formal']
    },
    {
        id: 'streetwear',
        name: 'Streetwear',
        description: 'Urban and trendy looks',
        colorPalette: ['#1A2419', '#3F4F37', '#A8B89A'],
        previewImageUrl: '/demo-images/mood-streetwear.jpg',
        tags: ['city', 'trend', 'hype']
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
