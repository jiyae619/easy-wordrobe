import React from 'react';
import { ClothingCategory, Season } from '../../types';
import { Search, SlidersHorizontal } from 'lucide-react';

interface FilterBarProps {
    filters: {
        category: string;
        season: string;
        search: string;
    };
    sort: string;
    onFilterChange: (key: string, value: string) => void;
    onSortChange: (value: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    filters,
    sort,
    onFilterChange,
    onSortChange
}) => {
    return (
        <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-muted flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center justify-between sticky top-0 md:top-4 z-10">

            {/* Search */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-olive-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search items..."
                    value={filters.search}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-olive-200 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary bg-olive-50/50 text-sm"
                />
            </div>

            <div className="flex gap-2 w-full md:w-auto items-center overflow-x-auto scrollbar-hide flex-nowrap">
                <SlidersHorizontal className="w-4 h-4 text-olive-400 mr-1 hidden md:block flex-shrink-0" />

                {/* Category Filter */}
                <select
                    value={filters.category}
                    onChange={(e) => onFilterChange('category', e.target.value)}
                    className="px-3 py-2 rounded-full border border-olive-200 bg-olive-50 text-sm focus:outline-none focus:border-secondary font-medium text-primary"
                >
                    <option value="">All Categories</option>
                    {Object.values(ClothingCategory).map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                </select>

                {/* Season Filter */}
                <select
                    value={filters.season}
                    onChange={(e) => onFilterChange('season', e.target.value)}
                    className="px-3 py-2 rounded-full border border-olive-200 bg-olive-50 text-sm focus:outline-none focus:border-secondary font-medium text-primary"
                >
                    <option value="">All Seasons</option>
                    {Object.values(Season).map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>

                {/* Sort */}
                <select
                    value={sort}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="px-3 py-2 rounded-full border border-olive-200 bg-olive-50 text-sm focus:outline-none focus:border-secondary font-medium text-primary"
                >
                    <option value="recent">Recently Added</option>
                    <option value="oldest">Oldest Added</option>
                    <option value="mostWorn">Most Worn</option>
                    <option value="leastWorn">Least Worn</option>
                </select>
            </div>
        </div>
    );
};
