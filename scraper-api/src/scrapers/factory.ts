import { Scraper } from './base';
import { PlaywrightScraper } from './playwright-scraper';
import { LibraryResponse, MediaItemDetails, SearchResponse } from '../types/media';
import { config } from '../config';

let instance: Scraper | null = null;

class DefaultScraper implements Scraper {
  async fetchLibrary(page: number): Promise<LibraryResponse> {
    return { items: [], totalPages: 0, currentPage: page };
  }

  async fetchItemDetails(id: string): Promise<MediaItemDetails | null> {
    return null;
  }

  async search(query: string): Promise<SearchResponse> {
    return { items: [], total: 0 };
  }
}

export function getScraper(): Scraper {
  if (!instance) {
    if (config.targetUrl) {
      instance = new PlaywrightScraper(config.targetUrl);
    } else {
      instance = new DefaultScraper();
    }
  }
  return instance;
}

export function setScraper(scraper: Scraper): void {
  instance = scraper;
}
