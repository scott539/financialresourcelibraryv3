import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MainCategory, Tag, ALL_TAGS, Resource } from '../types';
import { FilterIcon, ChevronDownIcon } from './icons';

interface FilterButtonsProps {
  resources: Resource[];
  activeCategory: MainCategory | null;
  activeTags: Tag[];
  onCategoryChange: (category: MainCategory | null) => void;
  onTagToggle: (tag: Tag) => void;
  onClear: () => void;
}

const FilterButtons: React.FC<FilterButtonsProps> = ({ 
  resources, 
  activeCategory, 
  activeTags, 
  onCategoryChange, 
  onTagToggle, 
  onClear 
}) => {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const tagButtonRef = useRef<HTMLDivElement>(null);

  // Filter visible resources first (exclude hidden or future scheduled ones)
  const visibleResources = useMemo(() => {
    return resources.filter(resource => {
      if (resource.isHidden) return false;
      if (resource.liveDate && typeof resource.liveDate.toDate === 'function') {
        const liveDate = resource.liveDate.toDate();
        if (liveDate > new Date()) return false;
      }
      return true;
    });
  }, [resources]);

  // Dynamic counts
  const counts = useMemo(() => {
    const all = visibleResources.length;
    const toolkits = visibleResources.filter(r => r.category === MainCategory.TOOLKIT).length;
    const plans = visibleResources.filter(r => r.category === MainCategory.PLANS).length;

    // Tag counts
    const tags: Record<string, number> = {};
    ALL_TAGS.forEach(tag => {
      tags[tag] = visibleResources.filter(r => (r.tags || []).includes(tag)).length;
    });

    return { all, toolkits, plans, tags };
  }, [visibleResources]);

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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      {/* Category Segmented Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Filter Category
        </span>
        <div className="flex p-1 bg-slate-100 rounded-2xl w-full sm:w-auto border border-slate-200/40 shadow-inner">
          <button 
            onClick={() => onCategoryChange(null)} 
            className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              !activeCategory 
                ? 'bg-white text-slate-850 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <span>All Tools</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              !activeCategory ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/50 text-slate-500'
            }`}>
              {counts.all}
            </span>
          </button>
          
          <button 
            onClick={() => onCategoryChange(MainCategory.TOOLKIT)} 
            className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              activeCategory === MainCategory.TOOLKIT 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <span>Toolkits</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeCategory === MainCategory.TOOLKIT ? 'bg-primary/10 text-primary' : 'bg-slate-200/50 text-slate-500'
            }`}>
              {counts.toolkits}
            </span>
          </button>
          
          <button 
            onClick={() => onCategoryChange(MainCategory.PLANS)} 
            className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              activeCategory === MainCategory.PLANS 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <span>Sample Plans</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeCategory === MainCategory.PLANS ? 'bg-primary/10 text-primary' : 'bg-slate-200/50 text-slate-500'
            }`}>
              {counts.plans}
            </span>
          </button>
        </div>
      </div>

      {/* Tags Dropdown and Clear Button */}
      <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
        <div className="relative w-full sm:w-auto" ref={tagButtonRef}>
          <button
            onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
            className={`w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/10 border flex items-center justify-center gap-2.5 cursor-pointer shadow-sm ${
              activeTags.length > 0 
                ? 'bg-primary/5 text-primary border-primary/25 hover:bg-primary/10' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" />
            <span>Filter by Tags</span>
            {activeTags.length > 0 && (
              <span className="bg-primary text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-pulse">
                {activeTags.length}
              </span>
            )}
            <ChevronDownIcon className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${isTagPopoverOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTagPopoverOpen && (
            <div className="absolute top-full right-0 mt-2.5 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100/80 z-50 p-4 scrollbar-thin">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400">
                  Select Tags
                </h4>
                {activeTags.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear();
                    }}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Reset Tags
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {ALL_TAGS.map((tag) => {
                  const count = counts.tags[tag] || 0;
                  const isSelected = activeTags.includes(tag);
                  
                  return (
                    <label 
                      key={tag} 
                      className={`flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary/5' : ''
                      } ${count === 0 ? 'opacity-40 hover:bg-transparent cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={count === 0}
                          onChange={() => onTagToggle(tag)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className={`text-xs font-semibold ${
                          isSelected ? 'text-primary font-bold' : 'text-slate-600'
                        }`}>
                          {tag}
                        </span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        isSelected 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Clear Button */}
        {(activeCategory || activeTags.length > 0) && (
          <button
            onClick={onClear}
            className="px-4.5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-slate-400/10 bg-slate-100 text-slate-700 hover:bg-slate-200/80 cursor-pointer border border-slate-200/30 shadow-sm"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterButtons;
