import React, { useState, useRef, useEffect } from 'react';
import { MainCategory, Tag, ALL_TAGS } from '../types';
import { FilterIcon, ChevronDownIcon } from './icons';

interface FilterButtonsProps {
  activeCategory: MainCategory | null;
  activeTags: Tag[];
  onCategoryChange: (category: MainCategory | null) => void;
  onTagToggle: (tag: Tag) => void;
  onClear: () => void;
}

const FilterButtons: React.FC<FilterButtonsProps> = ({ activeCategory, activeTags, onCategoryChange, onTagToggle, onClear }) => {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const tagButtonRef = useRef<HTMLDivElement>(null);

  const baseButtonClass = "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary";
  const inactiveButtonClass = "bg-white text-slate hover:bg-background-medium shadow-sm border border-gray-200";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagButtonRef.current && !tagButtonRef.current.contains(event.target as Node)) {
        setIsTagPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tagButtonRef]);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Category Filters */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <span className="text-sm font-semibold text-slate hidden md:inline">Category:</span>
        <div className="flex items-center bg-gray-200 p-1 rounded-lg w-full">
           <button onClick={() => onCategoryChange(null)} className={`flex-1 text-center px-3 py-1 text-sm rounded-md transition-shadow ${!activeCategory ? 'bg-white shadow' : 'bg-transparent text-gray-600 hover:bg-white/50'}`}>All</button>
           <button onClick={() => onCategoryChange(MainCategory.TOOLKIT)} className={`flex-1 text-center px-3 py-1 text-sm rounded-md transition-shadow ${activeCategory === MainCategory.TOOLKIT ? 'bg-white shadow' : 'bg-transparent text-gray-600 hover:bg-white/50'}`}>Toolkit</button>
           <button onClick={() => onCategoryChange(MainCategory.PLANS)} className={`flex-1 text-center px-3 py-1 text-sm rounded-md transition-shadow ${activeCategory === MainCategory.PLANS ? 'bg-white shadow' : 'bg-transparent text-gray-600 hover:bg-white/50'}`}>Sample Plans</button>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Tags Filter */}
          <div className="relative" ref={tagButtonRef}>
              <button
                  onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
                  className={`${baseButtonClass} ${activeTags.length > 0 ? 'bg-secondary text-primary' : inactiveButtonClass} flex items-center gap-2`}
              >
                  <FilterIcon className="w-4 h-4" />
                  Tags
                  {activeTags.length > 0 && <span className="bg-primary text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{activeTags.length}</span>}
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${isTagPopoverOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTagPopoverOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-2xl border z-50 p-4">
                  <h4 className="font-semibold text-slate mb-3">Filter by Tags</h4>
                  <div className="space-y-2">
                      {ALL_TAGS.map((tag) => (
                          <label key={tag} className="flex items-center space-x-3 cursor-pointer p-1 rounded hover:bg-gray-100">
                              <input
                                  type="checkbox"
                                  checked={activeTags.includes(tag)}
                                  onChange={() => onTagToggle(tag)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-gray-700">{tag}</span>
                          </label>
                      ))}
                  </div>
                  </div>
              )}
          </div>

          {/* Clear Button */}
          <div>
          <button
              onClick={onClear}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate bg-slate text-white hover:bg-slate/80"
          >
              Clear
          </button>
          </div>
      </div>
    </div>
  );
};

export default FilterButtons;