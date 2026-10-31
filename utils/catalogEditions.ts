import type { Resource } from '../types';

export const previousChecklistId = '3hadxK8aXA6TLQJQVq90';
export const currentChecklistId = 'OokxZVP3ro51xBkSrU5p';
export const yearEndFeatureUntil = '2027-01-01T07:00:00Z'; // End of 2026, America/Denver.

export function currentEdition(resource: Resource, resources: Resource[]) {
  if (resource.id !== previousChecklistId || resource.fileName !== 'Money Moves Year-End Checklist.pdf') return undefined;
  // Never remove the old edition from the main list unless its replacement is available.
  return resources.find(item => item.id === currentChecklistId && !item.isHidden && !item.isComingSoon && Boolean(item.fileUrl || item.googleDriveUrl));
}

export function seasonalFeature(resources: Resource[], now = Date.now()) {
  if (now < Date.parse('2026-10-31T00:00:00Z') || now >= Date.parse(yearEndFeatureUntil)) return undefined;
  return resources.find(resource => resource.id === currentChecklistId && !resource.isHidden && !resource.isComingSoon &&
    // Any later admin edit takes control back from this one-off editorial feature.
    resource.updatedAt?.toDate?.().toISOString() === '2026-08-18T23:32:58.887Z' &&
    Boolean(resource.fileUrl || resource.googleDriveUrl));
}
