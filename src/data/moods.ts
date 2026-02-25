import { type FashionMood } from '../types';

export const MOODS: FashionMood[] = [
    {
        id: 'professional',
        name: 'Professional',
        description: 'Clean and polished for the office',
        colorPalette: ['#2D3A2D', '#3F4F37', '#F4F5F0'],
        previewImageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&q=80&w=500',
        tags: ['work', 'office', 'formal']
    },
    {
        id: 'casual',
        name: 'Casual',
        description: 'Relaxed and comfortable everyday look',
        colorPalette: ['#6B7F5E', '#A8B89A', '#E8EBE4'],
        previewImageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=500',
        tags: ['relax', 'comfortable', 'daily']
    },
    {
        id: 'sporty',
        name: 'Sporty',
        description: 'Active and energetic athleisure',
        colorPalette: ['#556849', '#8A9E78', '#D1D8C9'],
        previewImageUrl: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=500',
        tags: ['active', 'gym', 'run']
    },
    {
        id: 'creative',
        name: 'Creative',
        description: 'Bold and expressive combinations',
        colorPalette: ['#3F4F37', '#6B7F5E', '#D1D8C9'],
        previewImageUrl: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80&w=500',
        tags: ['art', 'bold', 'color']
    },
    {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Sleek and understated elegance',
        colorPalette: ['#1A2419', '#2D3A2D', '#E8EBE4'],
        previewImageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&q=80&w=500',
        tags: ['clean', 'simple', 'sleek']
    },
    {
        id: 'cozy',
        name: 'Cozy',
        description: 'Warm and layered comfort',
        colorPalette: ['#8A9E78', '#A8B89A', '#F4F5F0'],
        previewImageUrl: 'https://images.unsplash.com/photo-1520006403909-838d6b92c22e?auto=format&fit=crop&q=80&w=500',
        tags: ['winter', 'autumn', 'layer']
    },
    {
        id: 'elegant',
        name: 'Elegant',
        description: 'Sophisticated evening attire',
        colorPalette: ['#2D3A2D', '#556849', '#D1D8C9'],
        previewImageUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=500',
        tags: ['night', 'date', 'formal']
    },
    {
        id: 'streetwear',
        name: 'Streetwear',
        description: 'Urban and trendy looks',
        colorPalette: ['#1A2419', '#3F4F37', '#A8B89A'],
        previewImageUrl: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=500',
        tags: ['city', 'trend', 'hype']
    },
    {
        id: 'romantic',
        name: 'Romantic',
        description: 'Soft and elegant date-night looks',
        colorPalette: ['#556849', '#A8B89A', '#F4F5F0'],
        previewImageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=500',
        tags: ['date', 'evening', 'soft', 'romantic']
    },
];
