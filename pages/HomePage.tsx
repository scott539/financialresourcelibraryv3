import { isAlias, useUsage } from '../utils/usage';
import { isActiveFeature, rankCatalog, selectFeaturedResource } from '../utils/catalogOrder';
import { currentEdition, yearEndFeatureUntil } from '../utils/catalogEditions';
import { scoreResource } from '../utils/catalogSearch';
import { readLibraryQuery } from '../utils/libraryQuery';
import { useSearchParams } from 'react-router-dom';
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  const [params, setParams] = useSearchParams();
  const { searchTerm, activeCategory, activeFormat, activeTags, filtersOpen } = useMemo(() => readLibraryQuery(params), [params]);
  const updateQuery = (values: Record<string, string | string[] | null>) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(values)) {
        next.delete(key);
        for (const item of Array.isArray(value) ? value : value ? [value] : []) next.append(key, item);
      }
      return next;
    }, { replace: true });
  };
  const setSearchTerm = (value: string) => updateQuery({ q: value || null });
  const setActiveCategory = (value: MainCategory | null) => updateQuery({ collection: value === MainCategory.PLANS ? 'plans' : null });
  const setActiveFormat = (value: ResourceType | null) => updateQuery({ format: value });
  const setFiltersOpen = (value: React.SetStateAction<boolean>) => updateQuery({ filters: (typeof value === 'function' ? value(filtersOpen) : value) ? 'open' : null });
  const filterToggle = useRef<HTMLButtonElement>(null);
  const filterCount = activeTags.length + (activeCategory ? 1 : 0) + (activeFormat ? 1 : 0);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const usage = useUsage();
  const rankKey = JSON.stringify([searchTerm, activeCategory, activeFormat, activeTags, usage.live]);
  const scores = usage.rankCounts ?? usage.counts;
  const ranks = useRef({ key: rankKey, counts: scores });
  if (ranks.current.key !== rankKey) ranks.current = { key: rankKey, counts: scores };
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

  const [featureCheck, checkFeature] = useState(Date.now);
  const featured = selectFeaturedResource(visibleResources);
  const featuredId = featured?.id;
  const featuredUntil = featured && (isActiveFeature(featured) ? featured.featuredUntil : yearEndFeatureUntil);
  useEffect(() => {
    if (!featuredUntil) return;
    const delay = Math.min(Math.max(0, Date.parse(featuredUntil) - Date.now()), 2147483647);
    const timer = window.setTimeout(() => checkFeature(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [featuredUntil, featureCheck]);

  // Match every query term; use relevance for searches and the approved order for browsing.
  const filteredResources = useMemo(() => {
    const matches = visibleResources
      .map(resource => ({ resource, score: scoreResource(resource, searchTerm) }))
      .filter(({ resource, score }) => {
        if (searchTerm && score < 0) return false;

        const matchesCategory = activeCategory ? resource.category === activeCategory : true;
        const matchesTags = activeTags.length > 0 
          ? activeTags.every(tag => (resource.tags || []).includes(tag))
          : true;

        return matchesCategory && matchesTags && (!activeFormat || resource.type === activeFormat);
      });
    return rankCatalog(matches, featuredId, rankCounts, Boolean(searchTerm.trim()));
  }, [visibleResources, searchTerm, activeCategory, activeFormat, activeTags, featuredId, rankCounts]);

  const currentResources = filteredResources.filter(resource => !currentEdition(resource, visibleResources));
  const previousEditions = filteredResources.filter(resource => currentEdition(resource, visibleResources));

  // Determine if filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(searchTerm || activeCategory || activeFormat || activeTags.length > 0);
  }, [searchTerm, activeCategory, activeFormat, activeTags]);

  const handleTagToggle = (tag: Tag) => {
    updateQuery({ topic: activeTags.includes(tag) ? activeTags.filter(t => t !== tag) : [...activeTags, tag] });
  };

  const handleClearFilters = () => {
    updateQuery({ q: null, collection: null, format: null, topic: null });
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
                  resources={visibleResources.filter(resource => !currentEdition(resource, visibleResources))}
                  activeCategory={activeCategory}
                  activeTags={activeTags}
                  activeFormat={activeFormat}
                  onFormatChange={setActiveFormat}
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
                  {currentResources.length} {currentResources.length === 1 ? 'resource' : 'resources'}
                  {previousEditions.length > 0 && ` · ${previousEditions.length} previous edition`}
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
              {currentResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 sm:auto-rows-fr">
                  {currentResources.map((resource) => (
                    <ResourceCard 
                      key={resource.id} 
                      resource={resource} 
                      featured={resource.id === featuredId}
                      onDownloadClick={handleDownloadClick} 
                      onGoogleDriveClick={handleGoogleDriveClick} 
                    />
                  ))}
                </div>
              ) : previousEditions.length === 0 ? (
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
              ) : null}
              {previousEditions.length > 0 && (
                <details className="mt-8 border-t border-line2 pt-4" open={searchTerm.trim() ? true : undefined}>
                  <summary className="cursor-pointer text-sm font-semibold text-ink2">Previous editions ({previousEditions.length})</summary>
                  <p className="mt-2 mb-4 text-sm text-ink2">Retained for reference, with their original files and download history.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {previousEditions.map(resource => (
                      <ResourceCard key={resource.id} resource={resource} featured={false}
                        onDownloadClick={handleDownloadClick} onGoogleDriveClick={handleGoogleDriveClick} />
                    ))}
                  </div>
                </details>
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
