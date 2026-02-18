import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoodCard } from '../components/mood/MoodCard';
import { Smile, ArrowRight } from 'lucide-react';

import { MOODS } from '../data/moods';

const moodOptions = MOODS.map(mood => ({
    ...mood,
    icon: getMoodIcon(mood.id),
    colors: mood.colorPalette
}));

function getMoodIcon(id: string): string {
    switch (id) {
        case 'professional': return '💼';
        case 'casual': return '☕';
        case 'sporty': return '🏃';
        case 'creative': return '🎨';
        case 'minimalist': return '◻️';
        case 'cozy': return '🧣';
        case 'elegant': return '✨';
        case 'streetwear': return '🔥';
        default: return '✨';
    }
}

const Mood: React.FC = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleContinue = () => {
        if (selectedId) {
            navigate(`/suggest?mood=${selectedId}`);
        }
    };

    return (
        <div className="space-y-5 md:space-y-8">
            <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-olive-100 rounded-xl">
                    <Smile className="w-5 h-5 text-secondary" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary">
                        How's Your Mood?
                    </h1>
                    <p className="text-sm text-gray-500">Pick a vibe for today's outfit</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                {moodOptions.map((mood) => (
                    <MoodCard
                        key={mood.id}
                        mood={mood}
                        isSelected={selectedId === mood.id}
                        onClick={() => setSelectedId(mood.id)}
                    />
                ))}
            </div>

            {selectedId && (
                <div className="fixed bottom-20 md:bottom-8 left-0 right-0 flex justify-center z-40 px-4 animate-fade-in-up">
                    <button
                        onClick={handleContinue}
                        className="w-full md:w-auto bg-primary text-white px-8 py-4 rounded-full shadow-xl hover:bg-olive-700 transition-all active:scale-[0.97] flex items-center justify-center text-base md:text-lg font-semibold"
                    >
                        Continue to Suggestions
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Mood;
