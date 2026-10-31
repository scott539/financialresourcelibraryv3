import type { Resource } from '../types';
import { seasonalFeature } from './catalogEditions';

const pinnedIds = ['0y425w6qfHCnOnTfd0JC', 'bk9wPWkAao5xzusob9c6'] as const;

export function isActiveFeature(resource: Pick<Resource, 'isFeatured' | 'featuredUntil'>, now = Date.now()) {
  return Boolean(resource.isFeatured && (!resource.featuredUntil || Date.parse(resource.featuredUntil) > now));
}

// Older records can have two active features. Give the single slot to the one
// with the latest expiry, and use its ID to break an exact tie.
export function selectFeaturedResource(resources: Resource[], now = Date.now()) {
  const expiry = (resource: Resource) => resource.featuredUntil ? Date.parse(resource.featuredUntil) : Infinity;
  return resources.filter(resource => !resource.isHidden && isActiveFeature(resource, now))
    .sort((a, b) => expiry(b) - expiry(a) || a.id.localeCompare(b.id))[0] ?? seasonalFeature(resources, now);
}

export function rankCatalog(matches: { resource: Resource; score: number }[], featuredId: string | undefined,
  counts: Record<string, number>) {
  const priority = (id: string) => {
    if (id === featuredId) return 0;
    if (id === pinnedIds[0]) return 1;
    if (id === pinnedIds[1]) return 2;
    return 3;
  };
  return matches.sort((a, b) => priority(a.resource.id) - priority(b.resource.id) ||
    (counts[b.resource.id] ?? 0) - (counts[a.resource.id] ?? 0) ||
    b.score - a.score || a.resource.title.localeCompare(b.resource.title) ||
    a.resource.id.localeCompare(b.resource.id)).map(match => match.resource);
}
