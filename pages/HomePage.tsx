import { isAlias, isTool, useUsage } from '../utils/usage';
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Resource, ResourceType, MainCategory, Tag } from '../types';
import SearchBar from '../components/SearchBar';
import FilterButtons from '../components/FilterButtons';
import { ChevronDownIcon } from '../components/icons';
import ResourceCard from '../components/ResourceCard';
import DownloadModal from '../components/DownloadModal';
import { getSubscriberEmail } from '../utils/emailGate';

interface HomePageProps {
  resources: Resource[];
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }, triggerFileDownload?: boolean) => Promise<void>;
  onGoogleDriveClick: (resourceId: string) => void;
  showManage?: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ resources, onDownload, onGoogleDriveClick, showManage }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<MainCategory | null>(null);
  const [activeTags, setActiveTags] = useState<Tag[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterToggle = useRef<HTMLButtonElement>(null);
  const filterCount = activeTags.length + (activeCategory ? 1 : 0);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const usage = useUsage();
  const rankKey = JSON.stringify([searchTerm, activeCategory, activeTags, usage.live]);
  const ranks = useRef({ key: rankKey, counts: usage.counts });
  if (ranks.current.key !== rankKey) ranks.current = { key: rankKey, counts: usage.counts };
  const rankCounts = ranks.current.counts;

  // Filter out hidden/future items first
  const visibleResources = useMemo(() => {
    return resources.filter(resource => {
      // Exclude hidden resources from the public view
      if (isAlias(resource.id) || (resource.isHidden && !showManage)) {
        return false;
      }

      return true;
    });
  }, [resources, showManage]);

  // Unified filter engine matching title, description, tags, type, or category with smart relevancy scoring
  const filteredResources = useMemo(() => {
    return visibleResources
      .map(resource => {
        let score = 0;
        const query = searchTerm.toLowerCase().trim();
        const searchWords = query.split(/\s+/).filter(Boolean);

        if (searchWords.length > 0) {
          const titleLower = (resource.title || '').toLowerCase();
          const descLower = (resource.description || '').toLowerCase();
          const typeLower = (resource.type || '').toLowerCase();
          const categoryLower = (resource.category || '').toLowerCase();
          const tagsLower = (resource.tags || []).map(t => t.toLowerCase());

          // Base Keyword Scoring
          let matchesAllWords = true;
          for (const word of searchWords) {
            let matchedWord = false;
            
            if (titleLower.includes(word)) {
              matchedWord = true;
              if (titleLower === word) {
                score += 50;
              } else if (titleLower.startsWith(word)) {
                score += 30;
              } else {
                score += 20;
              }
            }
            if (tagsLower.some(t => t.includes(word))) {
              matchedWord = true;
              score += 15;
            }
            if (descLower.includes(word)) {
              matchedWord = true;
              score += 8;
            }
            if (typeLower.includes(word)) {
              matchedWord = true;
              score += 10;
            }
            if (categoryLower.includes(word)) {
              matchedWord = true;
              score += 5;
            }

            if (!matchedWord) {
              matchesAllWords = false;
            }
          }

          // If it matches search words or synonyms, we can proceed
          if (!matchesAllWords) {
            // Check synonym fallback/intent match before completely discarding
            const isPfsSearch = ['pfs', 'personal financial', 'financial statement', 'statement', 'balance sheet', 'net worth', 'networth'].some(term => query.includes(term));
            const isPfsResource = titleLower.includes('personal financial statement');
            
            const isSpreadsheetSearch = ['sheet', 'sheets', 'excel', 'xlsx', 'xls', 'spreadsheet', 'spreadsheets', 'app', 'webapp', 'web app'].some(term => query.includes(term));
            const isSpreadsheetResource = resource.type === ResourceType.WEB_APP || (resource.type as any) === 'Spreadsheet';

            const isPdfSearch = ['pdf', 'guide', 'ebook', 'booklet', 'checklist', 'document'].some(term => query.includes(term));
            const isPdfResource = resource.type === 'PDF';

            if ((isPfsSearch && isPfsResource) || (isSpreadsheetSearch && isSpreadsheetResource) || (isPdfSearch && isPdfResource)) {
              score += 10;
            } else {
              return { resource, score: -1 };
            }
          }

          // Synonym / Intent Boosts
          if (['pfs', 'personal financial', 'financial statement', 'statement', 'balance sheet', 'net worth', 'networth'].some(term => query.includes(term))) {
            if (titleLower.includes('personal financial statement')) {
              score += 100;
            }
          }
          if (['sheet', 'sheets', 'excel', 'xlsx', 'xls', 'spreadsheet', 'spreadsheets', 'app', 'webapp', 'web app'].some(term => query.includes(term))) {
            if (resource.type === ResourceType.WEB_APP || (resource.type as any) === 'Spreadsheet') {
              score += 25;
            }
          }
          if (['pdf', 'guide', 'ebook', 'booklet', 'checklist', 'document'].some(term => query.includes(term))) {
            if (resource.type === 'PDF') {
              score += 25;
            }
          }
          if (['tax', 'taxes', 'irs', 'bracket', 'brackets'].some(term => query.includes(term))) {
            if (titleLower.includes('tax') || descLower.includes('tax')) {
              score += 30;
            }
          }
          if (['budget', 'spend', 'saving', 'savings', 'expense', 'expenses', 'cashflow', 'cash flow'].some(term => query.includes(term))) {
            if (titleLower.includes('budget') || descLower.includes('budget') || titleLower.includes('cash flow')) {
              score += 30;
            }
          }
          if (['retire', 'retirement', 'fire', 'fi', 'independence'].some(term => query.includes(term))) {
            if (titleLower.includes('retirement') || descLower.includes('retirement') || titleLower.includes('freedom')) {
              score += 30;
            }
          }
          if (['mortgage', 'loan', 'payoff', 'amortization', 'house', 'home'].some(term => query.includes(term))) {
            if (titleLower.includes('mortgage') || descLower.includes('mortgage') || titleLower.includes('payoff')) {
              score += 30;
            }
          }
        }

        return { resource, score };
      })
      .filter(({ resource, score }) => {
        if (searchTerm && score < 0) return false;

        const matchesCategory = activeCategory ? resource.category === activeCategory : true;
        const matchesTags = activeTags.length > 0 
          ? activeTags.every(tag => (resource.tags || []).includes(tag))
          : true;

        return matchesCategory && matchesTags;
      })
      .sort((a, b) => {
        // Sort by smart relevancy score first if active search
        if (searchTerm) {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
        }

        if (isTool(a.resource.id) !== isTool(b.resource.id)) return isTool(a.resource.id) ? -1 : 1;
        return ((rankCounts[b.resource.id] || 0) - (rankCounts[a.resource.id] || 0)) ||
          a.resource.title.localeCompare(b.resource.title);

      })
      .map(({ resource }) => resource);
  }, [visibleResources, searchTerm, activeCategory, activeTags, rankCounts]);

  // Determine if filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(searchTerm || activeCategory || activeTags.length > 0);
  }, [searchTerm, activeCategory, activeTags]);

  const groups = searchTerm.trim() ? [{ title: '', items: filteredResources }] : [
    { title: 'Web tools', items: filteredResources.filter(r => isTool(r.id)) },
    { title: 'Downloads and templates', items: filteredResources.filter(r => !isTool(r.id)) }
  ];

  const handleTagToggle = (tag: Tag) => {
    setActiveTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setActiveCategory(null);
    setActiveTags([]);
    setSearchTerm('');
  };

  const [modalActionType, setModalActionType] = useState<'download' | 'gdrive'>('download');

  const handleDownloadClick = (resource: Resource) => {
    const email = getSubscriberEmail();
    if (email) {
      onDownload(resource.id, {
        firstName: 'Subscribed User',
        email,
        hasConsented: true
      });
    } else {
      if (!resource.isComingSoon) {
        onDownload(resource.id, {
          firstName: 'Anonymous User',
          email: 'anonymous@subscriber.direct',
          hasConsented: false
        }, true);
      }
      setModalActionType('download');
      setSelectedResource(resource);
      setIsModalOpen(true);
    }
  };

  const handleGoogleDriveClick = (resource: Resource, e: React.MouseEvent) => {
    const email = getSubscriberEmail();
    if (email) {
      onDownload(resource.id, {
        firstName: 'Subscribed User',
        email,
        hasConsented: true
      }, false);
      onGoogleDriveClick(resource.id);
    } else {
      e.preventDefault();
      if (resource.googleDriveUrl) {
        window.open(resource.googleDriveUrl, '_blank', 'noopener,noreferrer');
      }
      onDownload(resource.id, {
        firstName: 'Anonymous User',
        email: 'anonymous@subscriber.direct',
        hasConsented: false
      }, false);
      onGoogleDriveClick(resource.id);

      setModalActionType('gdrive');
      setSelectedResource(resource);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedResource(null);
  };

  const handleModalDownload = async (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }) => {
    await onDownload(resourceId, lead, false);
  };

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 relative z-10 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-4 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink tracking-tight">
              BiggerPockets Money <span className="text-primary">Resource Library</span>
            </h1>
            <p className="mt-2 text-sm text-ink2 leading-relaxed">
              Free calculators, worksheets, and sample financial plans.
            </p>
        </div>
        
        {/* Main Interface Wrapper */}
        <div className="w-full">
            <div className="max-w-3xl mx-auto mb-4">
              <div className="flex items-stretch gap-2">
                <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                <button
                  type="button"
                  ref={filterToggle}
                  aria-expanded={filtersOpen}
                  aria-controls="library-filters"
                  onClick={() => setFiltersOpen(open => !open)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-forest hover:bg-card focus-visible:outline-primary"
                >
                  Filters{filterCount > 0 && ` (${filterCount})`}
                  <ChevronDownIcon className={`h-4 w-4 ${filtersOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <section
                id="library-filters"
                aria-label="Resource filters"
                hidden={!filtersOpen}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setFiltersOpen(false);
                    filterToggle.current?.focus();
                  }
                }}
                className="mt-2 rounded-xl border border-line2 bg-card p-3 sm:p-4"
              >
                <FilterButtons
                  resources={visibleResources}
                  activeCategory={activeCategory}
                  activeTags={activeTags}
                  onCategoryChange={setActiveCategory}
                  onTagToggle={handleTagToggle}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line2 pt-2">
                  <span className="text-xs font-semibold text-ink2">Suggested searches</span>
                  {['Retirement', 'Web App', 'Calculator', 'Budget', 'Taxes', 'Checklist'].map(term => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setSearchTerm(term)}
                      className="rounded-md px-1.5 py-1 text-sm text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Main Listing Section */}
            <div>
              {/* Results Title Bar */}
              <div className="mb-3 flex items-center justify-between">
                <span aria-live="polite" className="text-xs font-semibold text-ink2">
                  {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'}
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs font-black text-primary hover:text-primary-dark transition-colors cursor-pointer flex items-center gap-1.5 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Grid Layout - Compact 4-Column on Desktop */}
              {filteredResources.length > 0 ? groups.filter(g => g.items.length).map(group => (
                <section key={group.title} className="mb-6">
                  {group.title && <h2 className="mb-2 text-lg font-semibold text-forest">{group.title}</h2>}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-fr">
                  {group.items.map((resource) => (
                    <ResourceCard 
                      key={resource.id} 
                      resource={resource} 
                      onDownloadClick={handleDownloadClick} 
                      onGoogleDriveClick={handleGoogleDriveClick} 
                    />
                  ))}
                </div>
                </section>
              )) : (
                <div className="text-center py-20 bg-card border border-line2 rounded-3xl shadow-md max-w-md mx-auto p-8">
                  <div className="h-16 w-16 rounded-2xl bg-paper border border-line flex items-center justify-center mx-auto mb-5 text-ink2 shadow-inner font-mono text-xl font-bold">
                    ?
                  </div>
                  <h3 className="text-lg font-serif font-bold text-ink leading-tight">No Matching Resources</h3>
                  <p className="text-ink2 mt-2 text-sm leading-relaxed">We couldn't find any resources that match your active search terms or tag criteria.</p>
                  <button 
                    onClick={handleClearFilters}
                    className="mt-6 bg-primary hover:bg-primary-hover text-white font-black py-3 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer active:scale-95"
                  >
                    Reset Search & Filters
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>

      <DownloadModal
        resource={selectedResource}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onDownload={handleModalDownload}
        onGoogleDriveClick={onGoogleDriveClick}
        actionType={modalActionType}
      />

    </>
  );
};

export default HomePage;
