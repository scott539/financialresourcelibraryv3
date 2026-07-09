import React, { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Resource, ResourceType } from '../types';
import { DownloadIcon, LinkIcon, PdfIcon, SpreadsheetIcon, DocumentIcon, PresentationIcon, ImageIcon, VideoIcon, AudioIcon } from '../components/icons';
import DownloadModal from '../components/DownloadModal';
import { getSubscriberEmail } from '../utils/emailGate';
import { STATIC_RESOURCES } from '../data/staticResources';

interface PreviewResourcePageProps {
  resources: Resource[];
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }, triggerFileDownload?: boolean) => Promise<void>;
  onGoogleDriveClick: (resourceId: string) => void;
}

const formatDate = (timestamp: any): string | null => {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return null;
  }
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const PreviewResourcePage: React.FC<PreviewResourcePageProps> = ({ resources, onDownload, onGoogleDriveClick }) => {
  const { id } = useParams<{ id: string }>();
  
  // Find in state resources first, with fallback to static resources to avoid deep-link routing bails
  const resource = resources.find(r => r.id === id) || STATIC_RESOURCES.find(r => r.id === id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalActionType, setModalActionType] = useState<'download' | 'gdrive'>('download');

  // Scroll to top when page loaded
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!resource) {
    if (resources.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-screen text-slate-500 font-semibold">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading resource preview...</p>
          </div>
        </div>
      );
    }
    return <Navigate to="/" />;
  }

  const handleDownloadClick = () => {
    const email = getSubscriberEmail();
    if (email) {
      onDownload(resource.id, {
        firstName: 'Preview User',
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
      setIsModalOpen(true);
    }
  };

  const handleGoogleDriveClick = (e: React.MouseEvent) => {
    const email = getSubscriberEmail();
    if (email) {
      onDownload(resource.id, {
        firstName: 'Preview User',
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
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalDownload = async (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }) => {
    await onDownload(resourceId, lead, false);
  };

  const getTypeIcon = () => {
    switch (resource.type) {
      case ResourceType.PDF: return <PdfIcon />;
      case ResourceType.WEB_APP:
      case 'Spreadsheet' as any: return <SpreadsheetIcon />;
      case ResourceType.DOCUMENT: return <DocumentIcon />;
      case ResourceType.PRESENTATION: return <PresentationIcon />;
      case ResourceType.IMAGE: return <ImageIcon />;
      case ResourceType.VIDEO: return <VideoIcon />;
      case ResourceType.AUDIO: return <AudioIcon />;
      default: return null;
    }
  };

  const getTypeTheme = () => {
    switch (resource.type) {
      case ResourceType.WEB_APP:
      case 'Spreadsheet' as any:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          dot: 'bg-emerald-500'
        };
      case ResourceType.PDF:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-100',
          dot: 'bg-rose-500'
        };
      case ResourceType.PRESENTATION:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-100',
          dot: 'bg-amber-500'
        };
      default:
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-100',
          dot: 'bg-blue-500'
        };
    }
  };

  const theme = getTypeTheme();
  const lastUpdated = formatDate(resource.updatedAt);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Navigation Breadcrumb */}
      <div className="mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group"
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Resource Library
        </Link>
      </div>

      <div className="bg-white border border-line2 rounded-3xl shadow-sm hover:shadow-md transition-all duration-350 overflow-hidden p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            
            {/* Left Column: Premium Preview Card / Image */}
            <div className="lg:col-span-5 w-full">
              <div className="relative aspect-[16/10] bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center">
                <img 
                  src={resource.imageUrl} 
                  alt={resource.title} 
                  className="w-full h-full object-contain p-4 rounded-2xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                
                {/* Feature/Status badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                  {resource.isFeatured && (!resource.featuredUntil || new Date(resource.featuredUntil) > new Date()) && (
                    <span className="bg-primary/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm">
                      Featured Resource
                    </span>
                  )}
                  {resource.isComingSoon && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>

              {/* Downloads / Views Stats */}
              <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-600">
                <span className="text-slate-400">Resource Statistics</span>
                <span className="flex items-center gap-1.5 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="font-bold">{(resource.downloadCount || 0).toLocaleString()}</span> 
                  {resource.isOpenDirectly ? 'Views' : 'Downloads'}
                </span>
              </div>
            </div>

            {/* Right Column: Resource Details & Action Center */}
            <div className="lg:col-span-7 flex flex-col">
              {/* Header Badge Row */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                  {resource.type}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {resource.category}
                </span>
              </div>

              {/* Resource Title */}
              <h1 className="text-3xl sm:text-4xl font-serif font-black text-ink leading-tight mb-4">
                {resource.title}
              </h1>

              {/* Last Updated Meta */}
              {lastUpdated && (
                <div className="text-xs font-semibold text-slate-400 mb-6">
                  Last updated on {lastUpdated}
                </div>
              )}

              {/* Description Block */}
              <div className="prose prose-slate max-w-none text-ink2 mb-8">
                <p className="text-base leading-relaxed whitespace-pre-line">
                  {resource.longDescription || resource.description}
                </p>
              </div>

              {/* Tag List */}
              {resource.tags && resource.tags.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Topic Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {resource.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="text-xs font-bold tracking-wide py-1.5 px-4 uppercase rounded-xl text-primary bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Section */}
              <div className="mt-auto border-t border-slate-100 pt-6 flex flex-col sm:flex-row gap-4">
                {resource.isOpenDirectly ? (
                  <a
                    href={resource.googleDriveUrl || resource.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadClick();
                    }}
                    className="flex-1 text-center bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all duration-350 cursor-pointer active:scale-[0.98] font-bold text-sm uppercase tracking-wider"
                    title={resource.actionLabel || (resource.type === ResourceType.PDF ? 'Read Strategy Guide' : 'Open Calculator')}
                  >
                    <LinkIcon className="w-4 h-4 text-white" />
                    <span>{resource.actionLabel || (resource.type === ResourceType.PDF ? 'Read Strategy Guide' : 'Open Calculator')}</span>
                  </a>
                ) : (
                  <>
                    {resource.googleDriveUrl && (
                      <a
                        href={resource.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleGoogleDriveClick}
                        className="flex-1 text-center bg-white text-slate-700 hover:text-primary hover:border-primary/40 border border-slate-200 px-6 py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all duration-350 active:scale-[0.98] font-bold text-sm uppercase tracking-wider cursor-pointer"
                        title="Open in Google Drive"
                      >
                        <LinkIcon className="w-4 h-4 text-slate-400" />
                        <span>Google Drive Link</span>
                      </a>
                    )}
                    <a
                      href="#open-download"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownloadClick();
                      }}
                      className="flex-1 text-center bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all duration-350 cursor-pointer active:scale-[0.98] font-bold text-sm uppercase tracking-wider"
                      title={resource.isComingSoon ? 'Notify Me' : 'Download File'}
                    >
                      <DownloadIcon className="w-4 h-4" />
                      <span>{resource.isComingSoon ? 'Notify Me' : 'Download Now'}</span>
                    </a>
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      <DownloadModal
        resource={resource}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onDownload={handleModalDownload}
        onGoogleDriveClick={onGoogleDriveClick}
        actionType={modalActionType}
      />
    </div>
  );
};

export default PreviewResourcePage;
