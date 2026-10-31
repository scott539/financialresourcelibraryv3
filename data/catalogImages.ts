import type { Resource } from '../types';
import images from './catalog-images.json';

type ImageRefresh = { originalUrl: string; imageUrl: string };

// Replace only the images reviewed on 2026-10-31. The original files remain
// intact, and any subsequent image uploaded by an administrator takes priority.
export function applyCatalogImage(resource: Resource): Resource {
  const image = (images as Record<string, ImageRefresh>)[resource.id];
  if (!image || resource.imageUrl !== image.originalUrl) return resource;
  return { ...resource, imageUrl: image.imageUrl };
}
