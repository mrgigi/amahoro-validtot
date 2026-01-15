import React from 'react';
import { Search, TrendingUp, Clock } from 'lucide-react';

export function SearchFilters({ searchQuery, setSearchQuery, sortBy, setSortBy }) {
  return (
    <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 mb-4">
      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search posts..."
          className="w-full pl-12 pr-4 py-3 border-4 border-black font-bold bg-[#F5F5F5] focus:outline-none focus:bg-[#FFFF00] transition-colors"
        />
      </div>

      {/* Sort Options */}
      <div className="flex gap-2">
        <button
          onClick={() => setSortBy('recent')}
          className={`flex-1 py-2 px-4 border-4 border-black font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            sortBy === 'recent'
              ? 'bg-[#FF006E] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-white hover:bg-[#F5F5F5]'
          }`}
        >
          <Clock className="w-4 h-4" />
          RECENT
        </button>
        <button
          onClick={() => setSortBy('popular')}
          className={`flex-1 py-2 px-4 border-4 border-black font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            sortBy === 'popular'
              ? 'bg-[#FF006E] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-white hover:bg-[#F5F5F5]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          POPULAR
        </button>
      </div>
    </div>
  );
}

export default SearchFilters;
