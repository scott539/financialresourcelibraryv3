import React from 'react';
import { Resource, ResourceType } from '../types';
import { PdfIcon, SpreadsheetIcon, DocumentIcon, PresentationIcon, ImageIcon, VideoIcon, AudioIcon, DownloadIcon } from './icons';

interface ResourceCardProps {
  resource: Resource;
  onDownloadClick: (resource: Resource) => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onDownloadClick }) => {
  const { id, title, description, type, tags = [], imageUrl, downloadCount, isComingSoon } = resource;

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
    <div onClick={() => onDownloadClick(resource)} className="block group cursor-pointer h-full">
      <div className="relative bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden h-full flex flex-col">
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
        <div className="p-4 pb-20 flex flex-col flex-grow">
          <div className="flex items-center text-sm text-gray-500 mb-1">
            {getTypeIcon()}
            <span>{type}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate mb-2 group-hover:text-primary transition-colors duration-300">{title}</h3>
          <p className="text-gray-600 text-sm flex-grow">{description}</p>
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
        <div className="absolute bottom-4 right-4">
            <div className="bg-primary text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:bg-primary-dark group-hover:shadow-xl group-hover:scale-105 transform">
                <DownloadIcon className="w-5 h-5" />
                <span className="text-sm font-bold">Download</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;