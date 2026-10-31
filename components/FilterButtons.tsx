import React from 'react';
import { MainCategory, ResourceType, Tag, Resource } from '../types';

interface FilterButtonsProps {
  resources: Resource[];
  activeCategory: MainCategory | null;
  activeFormat: ResourceType | null;
  activeTags: Tag[];
  onCategoryChange: (category: MainCategory | null) => void;
  onFormatChange: (format: ResourceType | null) => void;
  onTagToggle: (tag: Tag) => void;
}
const topics: [Tag, string][] = [
  [Tag.BUDGETING, 'Budgeting & cash flow'], [Tag.RETIREMENT_PLANNING, 'Retirement planning'],
  [Tag.TAX_PLANNING, 'Taxes'], [Tag.HEALTHCARE, 'Healthcare'], [Tag.INVESTING, 'Investing'],
  [Tag.GOAL_SETTING, 'Goals & lifestyle'], [Tag.FAMILIES, 'Family finances'], [Tag.BUSINESS, 'Business'],
];
const formats: [ResourceType, string][] = [
  [ResourceType.WEB_APP, 'Web tools'], [ResourceType.SPREADSHEET, 'Spreadsheets'],
  [ResourceType.DOCUMENT, 'Documents'], [ResourceType.PDF, 'PDFs'], [ResourceType.PRESENTATION, 'Slides'],
];
export default function FilterButtons({ resources, activeCategory, activeFormat, activeTags, onCategoryChange, onFormatChange, onTagToggle }: FilterButtonsProps) {
  const available = resources.filter(resource => !resource.isHidden &&
    (!resource.liveDate?.toDate || resource.liveDate.toDate() <= new Date()));
  const countTag = (tag: Tag) => available.filter(resource => resource.tags?.includes(tag)).length;
  const plans = available.filter(resource => resource.category === MainCategory.PLANS).length;
  const chip = (selected: boolean) => `min-h-11 rounded-lg border px-2.5 py-2 text-sm font-semibold focus-visible:outline-primary ${selected
    ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink hover:border-primary'}`;
  return <div className="space-y-4">
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-ink2">Topics <span className="font-normal">· match all selected</span></legend>
      <div className="flex flex-wrap gap-1.5">
        {topics.filter(([tag]) => countTag(tag) || activeTags.includes(tag)).map(([tag, label]) => (
          <label key={tag} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink">
            <input type="checkbox" checked={activeTags.includes(tag)} onChange={() => onTagToggle(tag)} className="accent-primary" />
            {label} ({countTag(tag)})
          </label>
        ))}
        {activeTags.filter(tag => !topics.some(([topic]) => topic === tag)).map(tag => (
          <label key={tag} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line px-2.5 text-sm">
            <input type="checkbox" checked onChange={() => onTagToggle(tag)} className="accent-primary" />{tag} ({countTag(tag)})
          </label>
        ))}
      </div>
    </fieldset>
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-ink2">Format</legend>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={!activeFormat} onClick={() => onFormatChange(null)} className={chip(!activeFormat)}>All formats ({available.length})</button>
        {formats.map(([type, label]) => {
          const count = available.filter(resource => resource.type === type).length;
          return count || activeFormat === type ? <button key={type} type="button" aria-pressed={activeFormat === type} onClick={() => onFormatChange(type)} className={chip(activeFormat === type)}>{label} ({count})</button> : null;
        })}
      </div>
    </fieldset>
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={activeCategory === MainCategory.PLANS} onChange={() => onCategoryChange(activeCategory ? null : MainCategory.PLANS)} className="accent-primary" />
      Sample plans only ({plans})
    </label>
  </div>;
}
