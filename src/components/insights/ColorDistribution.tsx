import React from 'react';
import { type ClothingItem } from '../../types';

interface ColorDistributionProps {
    items: ClothingItem[];
}

export const ColorDistribution: React.FC<ColorDistributionProps> = ({ items }) => {
    const colorCounts = items.reduce((acc, item) => {
        const color = item.colorHex || '#000000';
        acc[color] = (acc[color] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const total = items.length;

    const sortedColors = Object.entries(colorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    let currentPercentage = 0;
    const gradientParts = sortedColors.map(([color, count]) => {
        const start = currentPercentage;
        const percentage = (count / total) * 100;
        currentPercentage += percentage;
        return `${color} ${start}% ${currentPercentage}%`;
    });

    const background = total > 0
        ? `conic-gradient(${gradientParts.join(', ')})`
        : '#E8EBE4';

    return (
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-muted flex flex-col items-center">
            <h3 className="text-lg font-bold text-primary mb-6 self-start">Color Palette</h3>

            <div className="relative w-44 h-44 rounded-full shadow-inner mb-6" style={{ background }}>
                <div className="absolute inset-0 m-11 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-2xl font-bold text-primary">{total}</span>
                </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 text-sm">
                {sortedColors.map(([color, count]) => (
                    <div key={color} className="flex items-center space-x-2">
                        <div className="w-3.5 h-3.5 rounded-full border border-olive-100 flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-gray-600">
                            {Math.round((count / total) * 100)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
