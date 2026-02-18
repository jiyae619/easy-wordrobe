import React from 'react';
import { type ClothingItem } from '../../types';

interface WearFrequencyChartProps {
    items: ClothingItem[];
}

export const WearFrequencyChart: React.FC<WearFrequencyChartProps> = ({ items }) => {
    const sortedItems = [...items]
        .sort((a, b) => b.wearFrequency - a.wearFrequency)
        .slice(0, 10);

    const maxFrequency = Math.max(...sortedItems.map(i => i.wearFrequency), 1);

    return (
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-muted">
            <h3 className="text-lg font-bold text-primary mb-6">Most Worn Items</h3>
            <div className="space-y-4">
                {sortedItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 group">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-olive-100">
                            <img src={item.imageUrl} alt={item.subcategory} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-primary capitalize">{item.subcategory}</span>
                                <span className="text-gray-500">{item.wearFrequency} wears</span>
                            </div>
                            <div className="h-2 w-full bg-olive-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${(item.wearFrequency / maxFrequency) * 100}%`,
                                        backgroundColor: item.colorHex || '#6B7F5E'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <p className="text-gray-500 text-center text-sm py-4">No data available yet.</p>
                )}
            </div>
        </div>
    );
};
