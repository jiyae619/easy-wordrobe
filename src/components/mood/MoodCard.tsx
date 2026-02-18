import React from 'react';

interface MoodOption {
    id: string;
    name: string;
    description: string;
    icon: string;
    colors: string[];
}

interface MoodCardProps {
    mood: MoodOption;
    isSelected: boolean;
    onClick: () => void;
}

export const MoodCard: React.FC<MoodCardProps> = ({ mood, isSelected, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`
                relative text-left p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 group
                ${isSelected
                    ? 'border-primary bg-olive-50 shadow-lg shadow-olive-200/50 scale-[1.02]'
                    : 'border-muted bg-white hover:border-olive-300 hover:shadow-md'
                }
                active:scale-[0.97]
            `}
        >
            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            <span className="text-2xl md:text-3xl mb-3 block">{mood.icon}</span>
            <h3 className={`font-semibold text-sm md:text-base mb-1 ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                {mood.name}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{mood.description}</p>

            {/* Color swatches */}
            <div className="flex space-x-1.5 mt-3">
                {mood.colors.map((color, i) => (
                    <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
        </button>
    );
};
