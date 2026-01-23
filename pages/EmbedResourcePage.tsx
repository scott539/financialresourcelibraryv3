
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Resource, ResourceType } from '../types';
import { DownloadIcon, LinkIcon, PdfIcon, SpreadsheetIcon, DocumentIcon, PresentationIcon, ImageIcon, VideoIcon, AudioIcon } from '../components/icons';

interface EmbedResourcePageProps {
  resources: Resource[];
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }) => Promise<void>;
  onGoogleDriveClick: (resourceId: string) => void;
}

const EmbedResourcePage: React.FC<EmbedResourcePageProps> = ({ resources, onDownload, onGoogleDriveClick }) => {
  const { id } = useParams<{ id: string }>();
  const resource = resources.find(r => r.id === id);

  if (!resource) return <Navigate to="/" />;

  const handleAction = async () => {
    const lead = { firstName: 'Embed User', email: 'embed@user.com', hasConsented: true };
    await onDownload(resource.id, lead);
  };

  const getTypeIcon = () => {
    switch (resource.type) {
      case ResourceType.PDF: return <PdfIcon />;
      case ResourceType.SPREADSHEET: return <SpreadsheetIcon />;
      case ResourceType.DOCUMENT: return <DocumentIcon />;
      case ResourceType.PRESENTATION: return <PresentationIcon />;
      case ResourceType.IMAGE: return <ImageIcon />;
      case ResourceType.VIDEO: return <VideoIcon />;
      case ResourceType.AUDIO: return <AudioIcon />;
      default: return null;
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 border rounded-xl shadow-sm max-w-2xl mx-auto overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 relative">
          <img 
            src={resource.imageUrl} 
            alt={resource.title} 
            className="w-full aspect-square object-cover rounded-lg shadow-sm"
          />
          {resource.isComingSoon && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm z-10">
              Coming Soon
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg z-10">
            {(resource.downloadCount || 0).toLocaleString()} {resource.isComingSoon ? 'SIGNUPS' : 'DOWNLOADS'}
          </div>
        </div>
        <div className="w-full md:w-2/3 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate/40 mb-1">
            {getTypeIcon()}
            <span>{resource.type} • {resource.category}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate mb-2 leading-tight">{resource.title}</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed line-clamp-4">{resource.description}</p>
          
          <div className="flex flex-col gap-2">
            {resource.googleDriveUrl && (
              <a
                href={resource.googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onGoogleDriveClick(resource.id)}
                className="w-full text-center bg-white text-blue-600 px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-blue-50 border border-gray-200"
              >
                <LinkIcon className="w-4 h-4" />
                <span className="text-sm font-bold">Open in Google Drive</span>
              </a>
            )}
            <button
              onClick={handleAction}
              className="w-full text-center bg-primary text-white px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-primary-dark active:scale-[0.98]"
            >
              <DownloadIcon className="w-4 h-4" />
              <span className="text-sm font-bold">
                {resource.isComingSoon ? 'Notify Me of Release' : 'Download Now'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbedResourcePage;
