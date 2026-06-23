import { LibraryResponse, MediaItemDetails, SearchResponse } from '../types/media';

export interface Scraper {
  fetchLibrary(page: number): Promise<LibraryResponse>;
  fetchItemDetails(id: string): Promise<MediaItemDetails | null>;
  search(query: string): Promise<SearchResponse>;
}
