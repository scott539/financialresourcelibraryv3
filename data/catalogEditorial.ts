import type { Resource } from '../types';
import corrections from './catalog-editorial.json';

type EditorialField = 'title' | 'description' | 'longDescription' | 'type' | 'tags' | 'actionLabel';
type Correction = { fileNames: string[]; fields: Partial<Record<EditorialField, { before: unknown[]; after: unknown }>> };

// Correct audited legacy metadata without writing catalog documents or counters.
// A newer upload or an administrator's changed field takes precedence.
export function applyCatalogEditorial(resource: Resource): Resource {
  const correction = (corrections as Record<string, Correction>)[resource.id];
  if (!correction || !correction.fileNames.includes(resource.fileName || '')) return resource;
  const updates: Partial<Resource> = {};
  for (const [key, rule] of Object.entries(correction.fields)) {
    const field = key as EditorialField;
    if (rule.before.some(value => JSON.stringify(value ?? null) === JSON.stringify(resource[field] ?? null))) {
      Object.assign(updates, { [field]: rule.after });
    }
  }
  return { ...resource, ...updates };
}

export function resourceFormat(resource: Resource): string {
  if (resource.isOpenDirectly) return resource.type;
  const extension = resource.fileName?.split('.').pop()?.toLowerCase();
  const formats: Record<string, string> = { xlsx: 'Excel · XLSX', docx: 'Word · DOCX', pptx: 'PowerPoint · PPTX', pdf: 'PDF' };
  if (resource.fileUrl && extension && formats[extension]) return formats[extension];
  if (!resource.fileUrl && resource.googleDriveUrl?.includes('docs.google.com/document/')) return 'Google Doc';
  return resource.type;
}

export function driveActionLabel(url?: string) {
  try {
    const parsed = new URL(url || '');
    return parsed.hostname === 'docs.google.com' && /\/copy\/?$/.test(parsed.pathname) ? 'Make a copy' : 'Open in Google Drive';
  } catch { return 'Open in Google Drive'; }
}
