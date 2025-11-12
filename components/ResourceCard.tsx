import React, { useState } from 'react';
import { Resource, ResourceType } from '../types';
import { PdfIcon, SpreadsheetIcon, DocumentIcon, PresentationIcon, ImageIcon, VideoIcon, AudioIcon, DownloadIcon, LinkIcon } from './icons';

interface ResourceCardProps {
  resource: Resource;
  onDownloadClick: (resource: Resource) => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onDownloadClick }) => {
  const { title, description, type, tags = [], imageUrl, downloadCount, isComingSoon, googleDriveUrl } = resource;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const descriptionLimit = 100;
  const isLongDescription = description.length > descriptionLimit;

  const displayedDescription = isLongDescription && !isExpanded
    ? `${description.substring(0, descriptionLimit)}...`
    : description;

  const getTypeIcon = () => {
    switch (type) {
      case ResourceType.PDF:
        return <PdfIcon />;
      case ResourceType.SPREADSHEET:
        return <SpreadsheetIcon />;
      case ResourceType.DOCUMENT:
        return <DocumentIcon />;
      case ResourceType.PRESENTATION:
        return <PresentationIcon />;
      case ResourceType.IMAGE:
        return <ImageIcon />;
      case ResourceType.VIDEO:
        return <VideoIcon />;
      case ResourceType.AUDIO:
        return <AudioIcon />;
      default:
        return null;
    }
  };

  return (
    <div className="block group h-full">
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden h-full flex flex-col">
        <div className="relative">
          <img src={imageUrl} alt={title} className="w-full aspect-square object-cover" />
          {isComingSoon && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full z-10">
              Coming Soon
            </div>
          )}
          <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
            {(downloadCount || 0).toLocaleString()} {isComingSoon ? 'Signups' : 'Downloads'}
          </div>
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-center text-sm text-gray-500 mb-1">
            {getTypeIcon()}
            <span>{type}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate mb-2 group-hover:text-primary transition-colors duration-300">{title}</h3>
          
          <div className="flex-grow">
            <p className="text-gray-600 text-sm">{displayedDescription}</p>
            {isLongDescription && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-primary font-semibold text-sm mt-1 hover:underline focus:outline-none"
              >
                {isExpanded ? 'Read less' : 'Read more'}
              </button>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-xs font-semibold inline-block py-0.5 px-2 uppercase rounded-full text-primary bg-secondary/30">
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                  <span className="text-xs font-medium text-gray-500">
                      +{tags.length - 2} more
                  </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2">
            {googleDriveUrl && (
              <a
                href={googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full text-center bg-white text-blue-600 px-4 py-2 rounded-md shadow-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-blue-50 border border-gray-300"
                title="Open in Google Drive"
              >
                <LinkIcon className="w-5 h-5" />
                <span className="text-sm font-bold">Open in Google Drive</span>
              </a>
            )}
            <button
              onClick={() => onDownloadClick(resource)}
              className="w-full text-center bg-primary text-white px-4 py-2 rounded-md shadow-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-primary-dark"
              title={isComingSoon ? 'Notify Me' : 'Download'}
            >
                <DownloadIcon className="w-5 h-5" />
                <span className="text-sm font-bold">{isComingSoon ? 'Notify Me' : 'Download'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;