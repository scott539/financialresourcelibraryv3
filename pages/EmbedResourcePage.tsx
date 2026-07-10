import React from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { Resource, EmbedLayout, DEFAULT_EMBED_LAYOUT } from '../types';
import ResourceCard from '../components/ResourceCard';
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

  // In embeds, the ONLY interactive action is opening/downloading the file.
  // We do not show the in-app email-capture modal here (it would open an overlay inside
  // the iframe and defeat the point of a clean, single-action embed). Downloads are still
  // counted, but the file/Drive link opens directly.

  const handleDownloadClick = (res: Resource) => {
    // Count the download, then let the browser open the href on the anchor itself.
    onDownload(res.id, {
      firstName: 'Embed User',
      email: 'embed@subscriber.direct',
      hasConsented: false
    }, false);
    // The button is an <a href> pointing at the file/Drive URL, so navigation happens
    // natively in a new tab; no modal, no in-app routing.
  };

  const handleGoogleDriveClick = (res: Resource, e: React.MouseEvent) => {
    // Let the anchor's native href open the Drive link in a new tab; just record the click.
    onDownload(res.id, {
      firstName: 'Embed User',
      email: 'embed@subscriber.direct',
      hasConsented: false
    }, false);
    onGoogleDriveClick(res.id);
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
          embed={true}
        />
      </div>
    </div>
  );
};

export default EmbedResourcePage;
