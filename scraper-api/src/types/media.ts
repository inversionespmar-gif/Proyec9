export interface MediaItem {
  id: string;
  title: string;
  year: number;
  poster: string;
  overview: string;
  genres: string[];
  cast: string[];
}

export interface MediaItemDetails extends MediaItem {
  streams: StreamSource[];
}

export interface StreamSource {
  url: string;
  quality: string;
  label: string;
}

export interface LibraryResponse {
  items: MediaItem[];
  totalPages: number;
  currentPage: number;
}

export interface SearchResponse {
  items: MediaItem[];
  total: number;
}

export interface ScraperConfig {
  port: number;
  targetUrl: string;
  redisUrl: string;
  apiKey: string;
  cacheTtlMetadata: number;
  cacheTtlStream: number;
}
