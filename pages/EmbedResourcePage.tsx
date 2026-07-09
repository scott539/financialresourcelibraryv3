import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Resource, ResourceType } from '../types';
import { DownloadIcon, LinkIcon, PdfIcon, SpreadsheetIcon, DocumentIcon, PresentationIcon, ImageIcon, VideoIcon, AudioIcon } from '../components/icons';
import DownloadModal from '../components/DownloadModal';
import { getSubscriberEmail } from '../utils/emailGate';
import { STATIC_RESOURCES } from '../data/staticResources';

interface EmbedResourcePageProps {
  resources: Resource[];
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }, triggerFileDownload?: boolean) => Promise<void>;
  onGoogleDriveClick: (resourceId: string) => void;
}

const EmbedResourcePage: React.FC<EmbedResourcePageProps> = ({ resources, onDownload, onGoogleDriveClick }) => {
  const { id } = useParams<{ id: string }>();
  
  // Find in state resources first, with fallback to static resources to avoid deep-link routing bails
  const resource = resources.find(r => r.id === id) || STATIC_RESOURCES.find(r => r.id === id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalActionType, setModalActionType] = useState<'download' | 'gdrive'>('download');

  if (!resource) {
    if (resources.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-screen text-slate-500 font-semibold bg-transparent">
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
      // Already subscribed! Log lead and execute download directly
      onDownload(resource.id, {
        firstName: 'Embed User',
        email,
        hasConsented: true
      });
    } else {
      // Not subscribed yet.
      if (!resource.isComingSoon) {
        // 1. Instantly trigger the download in the background with an anonymous tag
        onDownload(resource.id, {
          firstName: 'Anonymous User',
          email: 'anonymous@subscriber.direct',
          hasConsented: false
        }, true);
      }

      // 2. Open the opt-in modal so they can register for updates if they WANT to
      setModalActionType('download');
      setIsModalOpen(true);
    }
  };

  const handleGoogleDriveClick = (e: React.MouseEvent) => {
    const email = getSubscriberEmail();
    if (email) {
      // Already subscribed! Log lead and increment click count in background
      onDownload(resource.id, {
        firstName: 'Embed User',
        email,
        hasConsented: true
      }, false);
      onGoogleDriveClick(resource.id);
      // Let standard link navigation proceed natively to Google Drive in new tab
    } else {
      // Not subscribed yet!
      // Prevent the default anchor click so we can control the order of things (and bypass popup blockers securely)
      e.preventDefault();

      // 1. Instantly open Google Drive in a new tab inside the user click gesture!
      if (resource.googleDriveUrl) {
        window.open(resource.googleDriveUrl, '_blank', 'noopener,noreferrer');
      }

      // 2. Record the access in the background anonymously
      onDownload(resource.id, {
        firstName: 'Anonymous User',
        email: 'anonymous@subscriber.direct',
        hasConsented: false
      }, false);
      onGoogleDriveClick(resource.id);

      // 3. Open the opt-in modal so they can register for updates if they WANT to
      setModalActionType('gdrive');
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalDownload = async (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }) => {
    // Submit the real lead to Firestore but do NOT download the file again
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-1 sm:p-4 bg-transparent">
      <div className="bg-white p-3 sm:p-6 border rounded-xl shadow-sm w-full max-w-2xl mx-auto overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 items-stretch md:items-start">
          <div 
            className="w-full md:w-5/12 relative bg-slate-50 flex items-center justify-center overflow-hidden rounded-lg border border-slate-100/60 shadow-sm md:self-start"
            style={{ aspectRatio: '16/10', maxHeight: '240px' }}
          >
            <img 
              src={resource.imageUrl} 
              alt={resource.title} 
              className="w-full h-full rounded-lg"
              style={{ objectFit: 'contain' }}
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
              {resource.isFeatured && (!resource.featuredUntil || new Date(resource.featuredUntil) > new Date()) && (
                <div className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                  Featured
                </div>
              )}
              {resource.isComingSoon && (
                <div className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                  Coming Soon
                </div>
              )}
            </div>
            <div className="absolute bottom-2 right-2 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg z-10">
              {(resource.downloadCount || 0).toLocaleString()} {resource.isComingSoon ? 'SIGNUPS' : 'DOWNLOADS'}
            </div>
          </div>
          <div className="w-full md:w-7/12 flex flex-col justify-center">
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
                  onClick={handleGoogleDriveClick}
                  data-ck-trigger="true"
                  data-resource-id={resource.id}
                  data-resource-title={resource.title}
                  data-resource-type="gdrive"
                  data-gdrive-url={resource.googleDriveUrl}
                  className="ck-convertkit-trigger w-full text-center bg-white text-blue-600 px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-blue-50 border border-gray-200"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-sm font-bold">Open in Google Drive</span>
                </a>
              )}
              <a
                href="#open-2f902835bb"
                onClick={(e) => {
                  e.preventDefault();
                  handleDownloadClick();
                }}
                data-ck-trigger="true"
                data-resource-id={resource.id}
                data-resource-title={resource.title}
                data-resource-type="download"
                data-file-url={resource.fileUrl || ''}
                data-file-name={resource.fileName || 'download'}
                data-coming-soon={resource.isComingSoon ? 'true' : 'false'}
                className="ck-convertkit-trigger w-full text-center bg-primary text-white px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-primary-dark active:scale-[0.98] cursor-pointer"
              >
                <DownloadIcon className="w-4 h-4" />
                <span className="text-sm font-bold">
                  {resource.isComingSoon ? 'Notify Me of Release' : 'Download Now'}
                </span>
              </a>
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

export default EmbedResourcePage;
