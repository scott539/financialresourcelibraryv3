import { useUsage, usageLabel, usageDescription, isTool } from '../utils/usage';
import { isActiveFeature } from '../utils/catalogOrder';
import React from 'react';
import { resourceFormat } from '../data/catalogEditorial';
import ResourceActions from './ResourceActions';
import { Link } from 'react-router-dom';
import { Resource, ResourceType } from '../types';
import { DownloadIcon, EyeIcon } from './icons';

interface ResourceCardProps {
  resource: Resource;
  onDownloadClick: (resource: Resource) => void;
  onGoogleDriveClick: (resource: Resource, e: React.MouseEvent) => void;
  layout?: 'horizontal' | 'vertical';
  featured?: boolean;
  // When true, the card is rendered inside an external embed. The image and title
  // become inert (no navigation to internal pages); only the download / Drive action
  // remains interactive. Prevents embeds from opening in-app routes.
  embed?: boolean;
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

const MediaWrap: React.FC<{ to: string; embed: boolean; className?: string; children: React.ReactNode }> = ({ to, embed, className, children }) =>
  embed ? <div className={className}>{children}</div> : <Link to={to} className={className}>{children}</Link>;

const ResourceCard: React.FC<ResourceCardProps> = ({ 
  resource, 
  onDownloadClick, 
  onGoogleDriveClick,
  layout = 'vertical',
  featured = isActiveFeature(resource),
  embed = false
}) => {
  const { 
    title, 
    description, 
    type, 
    imageUrl, 
    isComingSoon, 
    updatedAt 
  } = resource;
  
  const metric = usageLabel(resource.id, useUsage());
  const lastUpdated = formatDate(updatedAt);

  // Type-specific colors for badges and accents
  const getTypeTheme = () => {
    switch (type) {
      case ResourceType.WEB_APP:
      case ResourceType.SPREADSHEET:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          dot: 'bg-emerald-500',
          text: 'text-emerald-700'
        };
      case ResourceType.PDF:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-100',
          dot: 'bg-rose-500',
          text: 'text-rose-700'
        };
      case ResourceType.PRESENTATION:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-100',
          dot: 'bg-amber-500',
          text: 'text-amber-700'
        };
      default:
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-100',
          dot: 'bg-blue-500',
          text: 'text-blue-700'
        };
    }
  };

  const theme = getTypeTheme();

  if (layout === 'horizontal') {
    return (
      <div className={`w-full bg-card rounded-3xl border border-line2 shadow-md transition-all duration-350 overflow-hidden flex flex-col md:flex-row min-h-[300px] ${embed ? '' : 'hover:shadow-lg hover:-translate-y-1'}`}>
        {/* Left Side: Featured Image */}
        <MediaWrap embed={embed} 
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
            {featured && (
              <span className="bg-primary px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-md backdrop-blur-sm">
                Featured Resource
              </span>
            )}
            {isComingSoon && (
              <span className="bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">
                Coming Soon
              </span>
            )}
          </div>
        </MediaWrap>

        {/* Right Side: Content Details */}
        <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Header / Type Meta */}
            <div className="flex items-center justify-between text-xs mb-3.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                {resourceFormat(resource)}
              </span>
              <div className="flex items-center gap-3 text-slate-600 font-semibold text-[11px] bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-full shadow-2xs">
                <span className="flex items-center gap-1">
                  {isTool(resource.id) ? (
                    <EyeIcon className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <DownloadIcon className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span title={usageDescription(resource.id)} className="font-bold text-slate-800">{metric}</span>
                </span>
                {lastUpdated && (
                  <span className="text-slate-400 border-l border-slate-200 pl-2.5">
                    Updated {lastUpdated}
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <MediaWrap embed={embed} to={`/preview/${resource.id}`} className="block hover:text-primary transition-colors duration-250 mb-3 cursor-pointer">
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink leading-tight">
                {title}
              </h3>
            </MediaWrap>

            {/* Description */}
            <p className="text-ink2 text-sm leading-relaxed mb-4">
              {description}
            </p>
          </div>

          {/* Action Buttons Section */}
          <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResourceActions resource={resource} onDownloadClick={onDownloadClick} onGoogleDriveClick={onGoogleDriveClick} compact={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group h-full flex flex-col">
      <div className={`bg-card rounded-2xl border border-line2 shadow-sm transition-all duration-300 ease-out overflow-hidden h-full flex flex-col ${embed ? '' : 'hover:shadow-lg hover:-translate-y-1 hover:border-line'}`}>
        {/* Top Image & Badge Container */}
        <MediaWrap embed={embed} 
          to={`/preview/${resource.id}`} 
          className="relative overflow-hidden aspect-[16/9] bg-slate-50 border-b border-slate-100/80 block cursor-pointer"
        >
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5 pointer-events-none" />
          
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {featured && (
              <span className="bg-primary/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                Featured
              </span>
            )}
            {isComingSoon && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                Coming Soon
              </span>
            )}
          </div>
          
          <div
            data-pill-version="v2-solid"
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 font-sans"
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.28)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
              letterSpacing: '-0.01em',
              lineHeight: 1.4,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {isTool(resource.id) ? (
              <EyeIcon className="w-3.5 h-3.5" />
            ) : (
              <DownloadIcon className="w-3.5 h-3.5" />
            )}
            <span title={usageDescription(resource.id)}>{metric}</span>
          </div>
        </MediaWrap>

        {/* Content Body */}
        <div className="p-4 sm:p-4.5 flex flex-col flex-grow">
          {/* Badge & Stat Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${theme.bg}`}>
              <span className={`w-1 h-1 rounded-full ${theme.dot}`} />
              {resourceFormat(resource)}
            </span>

          </div>

          <MediaWrap embed={embed} to={`/preview/${resource.id}`} className="block hover:text-primary transition-colors duration-250 mb-1.5 cursor-pointer">
            <h3 className="text-base font-serif font-semibold text-ink leading-snug tracking-tight">
              {title}
            </h3>
          </MediaWrap>
          
          <div className="flex-grow flex flex-col justify-between">
            <p className="text-ink2 text-[13px] leading-relaxed mb-2">
              {description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <ResourceActions resource={resource} onDownloadClick={onDownloadClick} onGoogleDriveClick={onGoogleDriveClick} compact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
