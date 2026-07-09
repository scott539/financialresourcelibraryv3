import React, { useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { Resource, EmbedLayout, DEFAULT_EMBED_LAYOUT } from '../types';
import ResourceCard from '../components/ResourceCard';
import DownloadModal from '../components/DownloadModal';
import { getSubscriberEmail } from '../utils/emailGate';
import { STATIC_RESOURCES } from '../data/staticResources';

interface EmbedResourcePageProps {
  resources: Resource[];
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }, triggerFileDownload?: boolean) => Promise<void>;
  onGoogleDriveClick: (resourceId: string) => void;
}

/**
 * EmbedResourcePage renders a SINGLE resource as a standalone, embeddable module.
 *
 * It reuses the exact same <ResourceCard /> component as the home page, so an embed
 * looks pixel-identical to the cards inside the app.
 *
 * Layout is chosen via the ?layout= query param on the embed URL:
 *   /#/embed/:id?layout=wide     -> full desktop-width horizontal card (large module)
 *   /#/embed/:id?layout=compact  -> tall/skinny vertical card (matches home grid card)
 *
 * If no layout is given, DEFAULT_EMBED_LAYOUT is used.
 *
 * Because this page lives at /embed/*, App.tsx hides all site chrome (header/footer/nav)
 * and renders on a transparent background, and public/embed.js auto-sizes the host iframe
 * to fit the module exactly.
 */
const EmbedResourcePage: React.FC<EmbedResourcePageProps> = ({ resources, onDownload, onGoogleDriveClick }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // Parse ?layout= from the query string. HashRouter puts the query after the hash,
  // so location.search is reliably populated here.
  const params = new URLSearchParams(location.search);
  const requestedLayout = (params.get('layout') || '').toLowerCase();
  const layout: EmbedLayout = requestedLayout === 'wide'
    ? 'wide'
    : requestedLayout === 'compact'
      ? 'compact'
      : DEFAULT_EMBED_LAYOUT;

  // Map our public-facing layout names to the ResourceCard's internal layout prop.
  const cardLayout: 'horizontal' | 'vertical' = layout === 'wide' ? 'horizontal' : 'vertical';

  // Find in state resources first, with fallback to static resources to avoid deep-link routing bails.
  const resource = resources.find(r => r.id === id) || STATIC_RESOURCES.find(r => r.id === id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalActionType, setModalActionType] = useState<'download' | 'gdrive'>('download');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  if (!resource) {
    if (resources.length === 0) {
      return (
        <div className="min-h-[300px] w-full flex items-center justify-center text-slate-500 font-semibold bg-transparent">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading resource...</p>
          </div>
        </div>
      );
    }
    return <Navigate to="/" />;
  }

  // --- Handlers mirror HomePage exactly so embedded cards behave identically ---

  const handleDownloadClick = (res: Resource) => {
    const email = getSubscriberEmail();
    if (email) {
      onDownload(res.id, {
        firstName: 'Embed User',
        email,
        hasConsented: true
      });
    } else {
      if (!res.isComingSoon) {
        onDownload(res.id, {
          firstName: 'Anonymous User',
          email: 'anonymous@subscriber.direct',
          hasConsented: false
        }, true);
      }
      setModalActionType('download');
      setSelectedResource(res);
      setIsModalOpen(true);
    }
  };

  const handleGoogleDriveClick = (res: Resource, e: React.MouseEvent) => {
    const email = getSubscriberEmail();
    if (email) {
      onDownload(res.id, {
        firstName: 'Embed User',
        email,
        hasConsented: true
      }, false);
      onGoogleDriveClick(res.id);
    } else {
      e.preventDefault();
      if (res.googleDriveUrl) {
        window.open(res.googleDriveUrl, '_blank', 'noopener,noreferrer');
      }
      onDownload(res.id, {
        firstName: 'Anonymous User',
        email: 'anonymous@subscriber.direct',
        hasConsented: false
      }, false);
      onGoogleDriveClick(res.id);
      setModalActionType('gdrive');
      setSelectedResource(res);
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

  // Wide module gets a wider max container; compact stays narrow like a single grid cell.
  const containerMaxWidth = layout === 'wide' ? 'max-w-5xl' : 'max-w-sm';

  return (
    <div className="w-full bg-transparent p-2 sm:p-3">
      <div className={`${containerMaxWidth} mx-auto`}>
        <ResourceCard
          resource={resource}
          onDownloadClick={handleDownloadClick}
          onGoogleDriveClick={handleGoogleDriveClick}
          layout={cardLayout}
        />
      </div>

      <DownloadModal
        resource={selectedResource || resource}
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
