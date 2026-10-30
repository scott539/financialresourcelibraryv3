import React, { useMemo } from 'react';
import { MainCategory, Tag, ALL_TAGS, Resource } from '../types';

interface FilterButtonsProps {
  resources: Resource[];
  activeCategory: MainCategory | null;
  activeTags: Tag[];
  onCategoryChange: (category: MainCategory | null) => void;
  onTagToggle: (tag: Tag) => void;
}

const FilterButtons: React.FC<FilterButtonsProps> = ({ 
  resources, 
  activeCategory, 
  activeTags, 
  onCategoryChange, 
  onTagToggle
}) => {
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

  const categories = [
    { label: 'All resources', value: null, count: counts.all },
    { label: 'Toolkits', value: MainCategory.TOOLKIT, count: counts.toolkits },
    { label: 'Sample Plans', value: MainCategory.PLANS, count: counts.plans },
  ];

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-ink2">Category</legend>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(({ label, value, count }) => (
            <button
              key={label}
              type="button"
              aria-pressed={activeCategory === value}
              onClick={() => onCategoryChange(value)}
              className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${activeCategory === value
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-white text-ink hover:border-primary'}`}
            >
              {label} <span>({count})</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-ink2">Tags</legend>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TAGS.filter(tag => counts.tags[tag] || activeTags.includes(tag)).map(tag => (
            <label key={tag} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={activeTags.includes(tag)}
                onChange={() => onTagToggle(tag)}
                className="accent-primary"
              />
              {tag} ({counts.tags[tag] || 0})
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
};

export default FilterButtons;
