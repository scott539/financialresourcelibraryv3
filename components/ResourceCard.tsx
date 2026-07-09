import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Resource, ResourceType } from '../types';
import { PdfIcon, SpreadsheetIcon, DocumentIcon, PresentationIcon, ImageIcon, VideoIcon, AudioIcon, DownloadIcon, LinkIcon, EyeIcon } from './icons';

interface ResourceCardProps {
  resource: Resource;
  onDownloadClick: (resource: Resource) => void;
  onGoogleDriveClick: (resource: Resource, e: React.MouseEvent) => void;
  layout?: 'horizontal' | 'vertical';
}

const formatDate = (timestamp: any): string | null => {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return null;
  }
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

// Returns a sensible default button label based on the resource's file type.
// Used only when a resource does not define an explicit actionLabel.
const getOpenLabel = (type: ResourceType): string => {
  switch (type) {
    case ResourceType.PDF: return 'Read Guide';
    case ResourceType.SPREADSHEET: return 'Open Spreadsheet';
    case ResourceType.PRESENTATION: return 'Open Presentation';
    case ResourceType.DOCUMENT: return 'Open Document';
    case ResourceType.WEB_APP: return 'Open Tool';
    default: return 'Open Resource';
  }
};

const ResourceCard: React.FC<ResourceCardProps> = ({ 
  resource, 
  onDownloadClick, 
  onGoogleDriveClick,
  layout = 'vertical'
}) => {
  const { 
    title, 
    description, 
    type, 
    tags = [], 
    imageUrl, 
    downloadCount, 
    isComingSoon, 
    googleDriveUrl, 
    fileUrl, 
    isOpenDirectly, 
    actionLabel, 
    updatedAt 
  } = resource;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const descriptionLimit = layout === 'horizontal' ? 180 : 70;
  const isLongDescription = description.length > descriptionLimit;

  const displayedDescription = isLongDescription && !isExpanded
    ? `${description.substring(0, descriptionLimit)}...`
    : description;

  const lastUpdated = formatDate(updatedAt);

  // Type-specific colors for badges and accents
  const getTypeTheme = () => {
    switch (type) {
      case ResourceType.WEB_APP:
      case ResourceType.SPREADSHEET:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          dot: 'bg-emerald-500',
          text: 'text-emerald-700',
          icon: <SpreadsheetIcon />
        };
      case ResourceType.PDF:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-100',
          dot: 'bg-rose-500',
          text: 'text-rose-700',
          icon: <PdfIcon />
        };
      case ResourceType.PRESENTATION:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-100',
          dot: 'bg-amber-500',
          text: 'text-amber-700',
          icon: <PresentationIcon />
        };
      default:
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-100',
          dot: 'bg-blue-500',
          text: 'text-blue-700',
          icon: <DocumentIcon />
        };
    }
  };

  const theme = getTypeTheme();

  if (layout === 'horizontal') {
    return (
      <div className="w-full bg-card rounded-3xl border border-line2 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-350 overflow-hidden flex flex-col md:flex-row min-h-[300px]">
        {/* Left Side: Featured Image */}
        <Link 
          to={`/preview/${resource.id}`} 
          className="relative md:w-5/12 bg-slate-50 overflow-hidden min-h-[220px] md:min-h-full block cursor-pointer"
        >
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-black/5 pointer-events-none" />
          
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            {resource.isFeatured && (!resource.featuredUntil || new Date(resource.featuredUntil) > new Date()) && (
              <span className="bg-primary px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-md backdrop-blur-sm">
                Featured Tool
              </span>
            )}
            {isComingSoon && (
              <span className="bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">
                Coming Soon
              </span>
            )}
          </div>
        </Link>

        {/* Right Side: Content Details */}
        <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Header / Type Meta */}
            <div className="flex items-center justify-between text-xs mb-3.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                {type}
              </span>
              <div className="flex items-center gap-3 text-slate-600 font-semibold text-[11px] bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-full shadow-2xs">
                <span className="flex items-center gap-1">
                  {isOpenDirectly ? (
                    <EyeIcon className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <DownloadIcon className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="font-bold text-slate-800">{(downloadCount || 0).toLocaleString()}</span>
                  <span className="text-slate-500">{isOpenDirectly ? 'Views' : 'Downloads'}</span>
                </span>
                {lastUpdated && (
                  <span className="text-slate-400 border-l border-slate-200 pl-2.5">
                    Updated {lastUpdated}
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <Link to={`/preview/${resource.id}`} className="block hover:text-primary transition-colors duration-250 mb-3 cursor-pointer">
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink leading-tight">
                {title}
              </h3>
            </Link>

            {/* Description */}
            <p className="text-ink2 text-sm leading-relaxed mb-4">
              {displayedDescription}
            </p>
            
            {isLongDescription && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-primary font-black text-xs hover:underline mb-4 cursor-pointer block"
              >
                {isExpanded ? 'Read less' : 'Read more'}
              </button>
            )}

            {/* Custom tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              {tags.map(tag => (
                <span key={tag} className="text-[10px] font-bold tracking-wide py-1 px-3 uppercase rounded-xl text-primary bg-primary/5 border border-primary/10">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row gap-3">
            {isOpenDirectly ? (
              <a
                href={googleDriveUrl || fileUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadClick(resource);
                }}
                className="flex-1 text-center bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-[0.98] font-bold text-xs uppercase tracking-wider"
                title={actionLabel || getOpenLabel(type)}
              >
                <LinkIcon className="w-4 h-4 text-white" />
                <span>{actionLabel || getOpenLabel(type)}</span>
              </a>
            ) : (
              <>
                {googleDriveUrl && (
                  <a
                    href={googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoogleDriveClick(resource, e);
                    }}
                    className="flex-1 text-center bg-white text-slate-700 hover:text-primary hover:border-primary/40 border border-slate-200 px-5 py-3 rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-[0.98] font-bold text-xs uppercase tracking-wider"
                    title="Open in Google Drive"
                  >
                    <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                    <span>Google Drive Link</span>
                  </a>
                )}
                <a
                  href="#open-2f902835bb"
                  onClick={(e) => {
                    e.preventDefault();
                    onDownloadClick(resource);
                  }}
                  className="flex-1 text-center bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-[0.98] font-bold text-xs uppercase tracking-wider"
                  title={isComingSoon ? 'Notify Me' : 'Download File'}
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>{isComingSoon ? 'Notify Me' : 'Download'}</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group h-full flex flex-col">
      <div className="bg-card rounded-2xl border border-line2 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-line transition-all duration-300 ease-out overflow-hidden h-full flex flex-col">
        {/* Top Image & Badge Container */}
        <Link 
          to={`/preview/${resource.id}`} 
          className="relative overflow-hidden aspect-[16/10] bg-slate-50 border-b border-slate-100/80 block cursor-pointer"
        >
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5 pointer-events-none" />
          
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {resource.isFeatured && (!resource.featuredUntil || new Date(resource.featuredUntil) > new Date()) && (
              <span className="bg-primary/95 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                Featured
              </span>
            )}
            {isComingSoon && (
              <span className="bg-amber-400 text-slate-900 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                Coming Soon
              </span>
            )}
          </div>
          
          <div className="absolute bottom-2.5 right-2.5 bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1.5 font-sans tracking-tight">
            {isOpenDirectly ? (
              <EyeIcon className="w-3.5 h-3.5 text-white/95" />
            ) : (
              <DownloadIcon className="w-3.5 h-3.5 text-white/95" />
            )}
            <span>{(downloadCount || 0).toLocaleString()} {isComingSoon ? 'Signups' : isOpenDirectly ? 'Views' : 'Downloads'}</span>
          </div>
        </Link>

        {/* Content Body */}
        <div className="p-4 sm:p-4.5 flex flex-col flex-grow">
          {/* Badge & Stat Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${theme.bg}`}>
              <span className={`w-1 h-1 rounded-full ${theme.dot}`} />
              {type}
            </span>
            {lastUpdated && (
              <span className="text-[9px] text-slate-400 font-medium">Updated {lastUpdated}</span>
            )}
          </div>

          <Link to={`/preview/${resource.id}`} className="block hover:text-primary transition-colors duration-250 mb-1.5 cursor-pointer">
            <h3 className="text-sm sm:text-base font-serif font-semibold text-ink leading-snug tracking-tight line-clamp-2 min-h-[2.5rem]">
              {title}
            </h3>
          </Link>
          
          <div className="flex-grow flex flex-col justify-between">
            <p className="text-ink2 text-[11px] leading-relaxed mb-3 line-clamp-3">
              {displayedDescription}
            </p>
            
            {isLongDescription && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-primary font-black text-[10px] hover:underline mb-3 cursor-pointer block text-left"
              >
                {isExpanded ? 'Read less' : 'Read more'}
              </button>
            )}

            {/* Custom tags */}
            <div className="flex flex-wrap items-center gap-1 mt-auto">
              {tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[8px] font-bold tracking-wide py-0.5 px-2 uppercase rounded text-primary bg-primary/5 border border-primary/10">
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-[8px] font-bold text-slate-400 py-0.5 px-1 bg-slate-50 rounded border border-slate-100">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            {isOpenDirectly ? (
              <a
                href={googleDriveUrl || fileUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadClick(resource);
                }}
                className="w-full text-center bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-[0.98] text-[11px] font-bold uppercase tracking-wider"
                title={actionLabel || getOpenLabel(type)}
              >
                <LinkIcon className="w-3 h-3 text-white" />
                <span>{actionLabel || getOpenLabel(type)}</span>
              </a>
            ) : (
              <>
                {googleDriveUrl && (
                  <a
                    href={googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoogleDriveClick(resource, e);
                    }}
                    className="w-full text-center bg-white text-slate-700 hover:text-primary hover:border-primary/30 border border-slate-200 px-3 py-2 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-[0.98] text-[11px] font-bold uppercase tracking-wider"
                    title="Open in Google Drive"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Google Drive Link</span>
                  </a>
                )}
                <a
                  href="#open-2f902835bb"
                  onClick={(e) => {
                    e.preventDefault();
                    onDownloadClick(resource);
                  }}
                  className="w-full text-center bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-[0.98] text-[11px] font-bold uppercase tracking-wider"
                  title={isComingSoon ? 'Notify Me' : 'Download File'}
                >
                  <DownloadIcon className="w-3 h-3" />
                  <span>{isComingSoon ? 'Notify Me' : 'Download'}</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
