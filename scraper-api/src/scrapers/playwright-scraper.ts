import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Scraper } from './base';
import { LibraryResponse, MediaItemDetails, SearchResponse, StreamSource } from '../types/media';

export class PlaywrightScraper implements Scraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  constructor(private targetUrl: string) {}

  private async getPage(): Promise<Page> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      });
    }
    return this.context!.newPage();
  }

  async fetchLibrary(pageNum: number): Promise<LibraryResponse> {
    const page = await this.getPage();
    try {
      const url = pageNum === 1 ? this.targetUrl : `${this.targetUrl}/page/${pageNum}`;
      await page.goto(url, { waitUntil: 'networkidle' });

      const items = await page.evaluate(() => {
        const blocks = document.querySelectorAll('.destacadas .bloque');
        return Array.from(blocks).map((block) => {
          const link = block.querySelector('a')?.getAttribute('href') || '';
          const img = block.querySelector('img.cap') || block.querySelector('img');
          const poster = (img as HTMLImageElement)?.src || '';
          const altText = (img as HTMLImageElement)?.alt || '';

          const titleMatch = altText.match(/^Ver\s+(.+?)\s*\((\d{4})\)/i) || altText.match(/^Ver\s+(.+)/i);
          const title = titleMatch?.[1]?.trim() || altText || link.split('/').pop()?.replace(/-/g, ' ') || 'Unknown';
          const year = titleMatch?.[2] ? parseInt(titleMatch[2]) : new Date().getFullYear();

          const langSpans = block.querySelectorAll('.lang_icos span');
          const genres: string[] = [];
          langSpans.forEach((s) => {
            if (s.className.includes('lat')) genres.push('Latino');
            if (s.className.includes('sub')) genres.push('Subtitulado');
            if (s.className.includes('es')) genres.push('Español');
          });

          const id = link.split('/').filter(Boolean).pop()?.replace('.html', '') || link;

          return { id, title, year, poster, overview: '', genres, cast: [] };
        });
      });

      const hasMore = await page.evaluate(() => !!document.querySelector('.paginador a.next'));
      return { items, totalPages: hasMore ? pageNum + 1 : pageNum, currentPage: pageNum };
    } finally {
      await page.close();
    }
  }

  async fetchItemDetails(id: string): Promise<MediaItemDetails | null> {
    const page = await this.getPage();
    try {
      const url = `${this.targetUrl}/${id}`;
      await page.goto(url, { waitUntil: 'networkidle' });

      return await page.evaluate(() => {
        const titleEl = document.querySelector('h1.post-title');
        const title = titleEl?.textContent?.replace(/^Ver\s+/i, '').replace(/\s+Online$/, '').trim() || '';

        const titleMatch = title.match(/^(.+?)\s*\((\d{4})\)/);
        const cleanTitle = titleMatch?.[1]?.trim() || title;
        const year = titleMatch?.[2] ? parseInt(titleMatch[2]) : new Date().getFullYear();

        const body = document.querySelector('.post-body.entry-content');
        const firstImg = body?.querySelector('img');
        const poster = (firstImg as HTMLImageElement)?.src || '';

        const paragraphs = body?.querySelectorAll('p');
        let overview = '';
        if (paragraphs) {
          for (const p of paragraphs) {
            if (p.textContent && p.textContent.trim().length > 100 && !p.querySelector('iframe, img, script')) {
              overview = p.textContent.trim();
              break;
            }
          }
        }

        const genreLinks = body?.querySelectorAll('a[href*="/genero/"]');
        const genres: string[] = [];
        genreLinks?.forEach((a) => {
          const g = a.textContent?.trim();
          if (g) genres.push(g);
        });

        const streams: StreamSource[] = [];

        const pxRepros = (window as any).px_repros;
        if (pxRepros) {
          const langNames: Record<string, string> = { latino: 'Latino', espanol: 'Español', sub: 'Subtitulado' };
          for (const key of Object.keys(pxRepros)) {
            const [lang, opt] = key.split('_');
            const label = langNames[lang] || lang;
            const b64 = pxRepros[key] as string;
            try {
              const html = atob(b64);
              const srcMatch = html.match(/src="([^"]+)"/i);
              if (srcMatch) {
                streams.push({ url: srcMatch[1], quality: label, label: `${label} #${parseInt(opt) + 1}` });
              }
            } catch {}
          }
        }

        const videoArray = (window as any).video;
        if (videoArray) {
          for (let i = 1; i < videoArray.length; i++) {
            const v = videoArray[i] as string;
            if (v) {
              const srcMatch = v.match(/src="([^"]+)"/i);
              if (srcMatch) {
                streams.push({ url: srcMatch[1], quality: `Opción ${i}`, label: `Servidor ${i}` });
              }
            }
          }
        }

        return {
          id, title: cleanTitle, year, poster, overview, genres,
          cast: [],
          streams,
        } as MediaItemDetails;
      });
    } catch {
      return null;
    } finally {
      await page.close();
    }
  }

  async search(query: string): Promise<SearchResponse> {
    const page = await this.getPage();
    try {
      const url = `${this.targetUrl}/?s=${encodeURIComponent(query)}`;
      await page.goto(url, { waitUntil: 'networkidle' });

      const items = await page.evaluate(() => {
        const articles = document.querySelectorAll('.post-outer, .bloque');
        return Array.from(articles).slice(0, 20).map((article) => {
          const link = article.querySelector('a[href*="/20"]')?.getAttribute('href') || '';
          const img = article.querySelector('img.cap') || article.querySelector('img');
          const poster = (img as HTMLImageElement)?.src || '';
          const altText = (img as HTMLImageElement)?.alt || '';
          const titleMatch = altText.match(/^Ver\s+(.+?)\s*\((\d{4})\)/i) || altText.match(/^Ver\s+(.+)/i);
          const title = titleMatch?.[1]?.trim() || altText || 'Unknown';
          const year = titleMatch?.[2] ? parseInt(titleMatch[2]) : 0;
          const id = link.split('/').filter(Boolean).pop()?.replace('.html', '') || link;
          return { id, title, year, poster, overview: '', genres: [], cast: [] };
        }).filter((i) => i.title !== 'Unknown');
      });

      return { items, total: items.length };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
