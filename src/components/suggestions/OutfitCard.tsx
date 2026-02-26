import React from 'react';
import { type OutfitSuggestion } from '../../types';
import { ThumbsUp, Shirt, CloudSun, Smile, X } from 'lucide-react';

interface OutfitCardProps {
    suggestion: OutfitSuggestion;
    onWear: () => void;
    onSkip?: () => void;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({ suggestion, onWear, onSkip }) => {
    return (
        <div className="bg-white rounded-2xl border border-muted shadow-sm overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-5 border-b border-olive-100">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-primary">Outfit Suggestion</h3>
                    {(suggestion as any).matchScore && (
                        <span className="px-3 py-1 bg-olive-100 text-secondary text-xs font-semibold rounded-full">
                            {(suggestion as any).matchScore}% match
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestion.mood && (
                        <span className="inline-flex items-center px-2.5 py-1 bg-olive-50 text-olive-700 text-xs font-medium rounded-full capitalize">
                            <Smile className="w-3 h-3 mr-1" />
                            {typeof suggestion.mood === 'string' ? suggestion.mood : suggestion.mood.name}
                        </span>
                    )}
                    {suggestion.weatherMatch && (
                        <span className="inline-flex items-center px-2.5 py-1 bg-olive-50 text-olive-700 text-xs font-medium rounded-full">
                            <CloudSun className="w-3 h-3 mr-1" />
                            Weather Appropriate
                        </span>
                    )}
                </div>
            </div>

            {/* Items Grid */}
            <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {suggestion.items.map((item, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden bg-olive-50 aspect-square group">
                            {item.imageUrl ? (
                                <img
                                    src={item.imageUrl}
                                    alt={item.subcategory}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Shirt className="w-8 h-8 text-olive-300" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Explanation */}
                {suggestion.explanation && (
                    <div className="mt-4 p-3.5 bg-olive-50 rounded-xl border border-olive-100">
                        <p className="text-sm text-olive-700 leading-relaxed">
                            <span className="font-semibold text-primary">Why this works:</span>{' '}
                            {suggestion.explanation}
                        </p>
                    </div>
                )}
            </div>

            {/* Actions — Maybe Next Time | Wear This */}
            <div className="flex border-t border-olive-100">
                {onSkip && (
                    <>
                        <button
                            onClick={onSkip}
                            className="flex-1 flex items-center justify-center py-4 bg-white text-olive-500 font-semibold text-sm hover:bg-olive-50 transition-colors active:scale-[0.97] rounded-bl-2xl"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Maybe Next Time
                        </button>
                        <div className="w-px bg-olive-100"></div>
                    </>
                )}
                <button
                    onClick={onWear}
                    className={`flex-1 flex items-center justify-center py-4 bg-primary text-white font-semibold text-sm hover:bg-olive-700 transition-colors active:scale-[0.97] ${onSkip ? 'rounded-br-2xl' : 'rounded-b-2xl'}`}
                >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Wear This
                </button>
            </div>
        </div>
    );
};
