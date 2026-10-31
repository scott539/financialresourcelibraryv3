import React from 'react';
import type { Resource } from '../types';
import { driveActionLabel, resourceFormat } from '../data/catalogEditorial';
import { directAction } from '../utils/usage';
import GatedResourceAction from './GatedResourceAction';
import { shouldGate } from '../utils/libraryGate';
import { DownloadIcon, LinkIcon } from './icons';

interface Props {
  resource: Resource;
  onDownloadClick: (resource: Resource) => void;
  onGoogleDriveClick: (resource: Resource, event: React.MouseEvent) => void;
  compact?: boolean;
}

export default function ResourceActions({ resource, onDownloadClick, onGoogleDriveClick, compact = false }: Props) {
  const base = `flex items-center justify-center gap-2 rounded-xl px-3 font-semibold transition-colors focus-visible:outline-primary focus-visible:outline-offset-2 ${compact ? 'min-h-11 sm:min-h-0 py-2.5 text-xs' : 'py-3 text-sm'}`;
  const primary = `${base} bg-primary text-white hover:bg-primary-dark`;
  const secondary = `${base} border border-line bg-white text-ink2 hover:text-primary hover:border-primary`;
  const destination = resource.googleDriveUrl || resource.fileUrl;

  if (shouldGate(resource)) return <>
    {resource.fileUrl && <GatedResourceAction resource={resource} action="downloads" className={primary}>
      <DownloadIcon className="h-4 w-4" /><span>Download</span>
    </GatedResourceAction>}
    {resource.googleDriveUrl && <GatedResourceAction resource={resource} action="copyOpens" className={resource.fileUrl ? secondary : primary}>
      <LinkIcon className="h-4 w-4" /><span>{driveActionLabel(resource.googleDriveUrl)}</span>
    </GatedResourceAction>}
  </>;

  if (resource.isComingSoon) return <button type="button" className={primary} onClick={() => onDownloadClick(resource)}>Notify me</button>;
  if (resource.isOpenDirectly && destination) return (
    <a href={destination} target="_blank" rel="noopener noreferrer" className={primary}
      onClick={event => { event.stopPropagation(); directAction(event.currentTarget, resource.id); onDownloadClick(resource); }}>
      <LinkIcon className="h-4 w-4" /><span>{resource.actionLabel || 'Open resource'}</span>
    </a>
  );
  if (!resource.fileUrl && !resource.googleDriveUrl) return <p className="text-sm text-ink2">File currently unavailable.</p>;
  return <>
    {resource.fileUrl && (
      <button type="button" className={primary} title={`Download ${resourceFormat(resource)}`}
        onClick={event => { event.stopPropagation(); onDownloadClick(resource); }}>
        <DownloadIcon className="h-4 w-4" /><span>Download</span>
      </button>
    )}
    {resource.googleDriveUrl && (
      <a href={resource.googleDriveUrl} target="_blank" rel="noopener noreferrer" className={resource.fileUrl ? secondary : primary}
        onClick={event => { event.stopPropagation(); onGoogleDriveClick(resource, event); }}>
        <LinkIcon className="h-4 w-4" /><span>{driveActionLabel(resource.googleDriveUrl)}</span>
      </a>
    )}
  </>;
}
