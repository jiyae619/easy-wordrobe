import React, { useState, useMemo } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import { WardrobeGrid } from '../components/wardrobe/WardrobeGrid';
import { Search, SlidersHorizontal, Plus, ArrowDownAZ } from 'lucide-react';
import { ClothingCategory } from '../types';

const categoryChips = [
    { label: 'All', value: '' },
    { label: 'Tops', value: ClothingCategory.Tops },
    { label: 'Bottoms', value: ClothingCategory.Bottoms },
    { label: 'Outerwear', value: ClothingCategory.Outerwear },
    { label: 'Dresses', value: ClothingCategory.Dresses },
    { label: 'Shoes', value: ClothingCategory.Shoes },
    { label: 'Accessories', value: ClothingCategory.Accessories },
    { label: 'Bags', value: ClothingCategory.Bags },
];

const sortOptions = [
    { label: 'Recent', value: 'recent' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Most Worn', value: 'mostWorn' },
    { label: 'Least Worn', value: 'leastWorn' },
];

const Wardrobe: React.FC = () => {
    const { clothes, isLoading } = useWardrobe();
    const [activeCategory, setActiveCategory] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('recent');
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    const filteredItems = useMemo(() => {
        let items = [...clothes];

        if (activeCategory) {
            items = items.filter(item => item.category === activeCategory);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            items = items.filter(item =>
                item.subcategory.toLowerCase().includes(searchLower) ||
                item.color.toLowerCase().includes(searchLower) ||
                item.aiTags?.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        switch (sort) {
            case 'oldest':
                items.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
                break;
            case 'mostWorn':
                items.sort((a, b) => b.wearFrequency - a.wearFrequency);
                break;
            case 'leastWorn':
                items.sort((a, b) => a.wearFrequency - b.wearFrequency);
                break;
            default:
                items.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        }
        return items;
    }, [clothes, activeCategory, search, sort]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                    Wardrobe Explorer
                </h1>
                <p className="text-sm text-olive-500 mt-0.5">
                    {clothes.length} items in your collection
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search items, colors, tags..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-olive-50 border border-olive-200/60 text-sm text-primary placeholder:text-olive-400 focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none transition-all"
                />
            </div>

            {/* Category Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {categoryChips.map(chip => (
                    <button
                        key={chip.value}
                        onClick={() => setActiveCategory(chip.value)}
                        className={`flex-none px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.95] whitespace-nowrap ${activeCategory === chip.value
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-olive-100 text-secondary hover:bg-olive-200'
                            }`}
                    >
                        {chip.label}
                    </button>
                ))}
            </div>

            {/* Sort Row */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-olive-400 font-medium">
                    {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
                </p>
                <div className="relative">
                    <button
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
                    >
                        <ArrowDownAZ className="w-3.5 h-3.5" />
                        {sortOptions.find(s => s.value === sort)?.label || 'Sort'}
                    </button>
                    {showSortDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-muted py-1 min-w-[140px]">
                                {sortOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setSort(opt.value); setShowSortDropdown(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-olive-50 transition-colors ${sort === opt.value ? 'text-primary font-semibold' : 'text-olive-600'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Grid */}
            <WardrobeGrid items={filteredItems} isLoading={isLoading} />

            {/* FAB */}
            <a
                href="/"
                className="fixed bottom-24 md:bottom-8 right-5 md:right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform z-30 active:scale-95"
            >
                <Plus className="w-6 h-6" />
            </a>
        </div>
    );
};

export default Wardrobe;
