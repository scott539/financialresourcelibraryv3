import React, { useState, useMemo } from 'react';
import { Resource, MainCategory, Tag } from '../types';
import SearchBar from '../components/SearchBar';
import FilterButtons from '../components/FilterButtons';
import ResourceCard from '../components/ResourceCard';
import DownloadModal from '../components/DownloadModal';
import { getSubscriberEmail, saveSubscriberEmail } from '../utils/emailGate';


interface HomePageProps {
  resources: Resource[];
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }) => Promise<void>;
  onGoogleDriveClick: (resourceId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ resources, onDownload, onGoogleDriveClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<MainCategory | null>(null);
  const [activeTags, setActiveTags] = useState<Tag[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredResources = useMemo(() => {
    return resources
      .filter(resource => {
        // Exclude hidden resources from the public view
        if (resource.isHidden) {
          return false;
        }

        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = (resource.title?.toLowerCase() || '').includes(lowercasedSearchTerm) ||
                              (resource.description?.toLowerCase() || '').includes(lowercasedSearchTerm);
        
        const matchesCategory = activeCategory ? resource.category === activeCategory : true;

        const matchesTags = activeTags.length > 0 
          ? activeTags.every(tag => (resource.tags || []).includes(tag))
          : true;

        return matchesSearch && matchesCategory && matchesTags;
      })
      .sort((a, b) => b.downloadCount - a.downloadCount);
  }, [resources, searchTerm, activeCategory, activeTags]);

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

  const handleDownloadClick = (resource: Resource) => {
    const subscriberEmail = getSubscriberEmail();
    if (subscriberEmail) {
      // User is a returning subscriber, bypass the modal for a quick download.
      const lead = { 
        firstName: 'Subscriber', 
        email: subscriberEmail, 
        hasConsented: true 
      };
      onDownload(resource.id, lead);
      if (resource.isComingSoon) {
        alert("Thanks for registering your interest! We'll track demand for this resource.");
      }
    } 
    /*
    // Email gate is currently disabled. All users are treated as subscribers.
    else {
      // New user, open the modal to capture lead info.
      setSelectedResource(resource);
      setIsModalOpen(true);
    }
    */
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedResource(null);
  }

  const handleModalDownload = async (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }) => {
    await onDownload(resourceId, lead);
    // The modal will show a success message, we don't need to do anything else here.
  };

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-slate tracking-tight">Financial Resource Library</h1>
          <p className="mt-2 max-w-2xl mx-auto text-lg text-gray-500">
            Your one-stop toolkit for financial planning and success.
          </p>
        </div>
        
        <div className="mb-6">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>

        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border">
          <FilterButtons 
            activeCategory={activeCategory}
            activeTags={activeTags}
            onCategoryChange={setActiveCategory}
            onTagToggle={handleTagToggle}
            onClear={handleClearFilters}
          />
        </div>

        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} onDownloadClick={handleDownloadClick} onGoogleDriveClick={onGoogleDriveClick} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-slate">No Resources Found</h2>
            <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      <DownloadModal
        resource={selectedResource}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onDownload={handleModalDownload}
        onGoogleDriveClick={onGoogleDriveClick}
      />
    </>
  );
};

export default HomePage;
