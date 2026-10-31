import { MainCategory, ResourceType, Tag } from '../types';

export function readLibraryQuery(params: URLSearchParams) {
  const format = params.get('format') as ResourceType | null;
  return {
    searchTerm: params.get('q') || '',
    activeCategory: params.get('collection') === 'plans' ? MainCategory.PLANS : null,
    activeFormat: format && Object.values(ResourceType).includes(format) ? format : null,
    activeTags: [...new Set(params.getAll('topic'))].filter(tag => Object.values(Tag).includes(tag as Tag)) as Tag[],
    filtersOpen: params.get('filters') === 'open',
  };
}

export function libraryReturnPath(search: string) {
  // React Router supplies only the query string; preserve it as local state.
  return '/' + search;
}
