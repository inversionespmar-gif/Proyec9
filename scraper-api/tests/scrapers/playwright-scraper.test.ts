import { describe, it, expect, vi } from 'vitest';

const mockPage = {
  goto: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  evaluate: vi.fn(),
};

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('PlaywrightScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses library items from homepage', async () => {
    mockPage.evaluate.mockResolvedValue([
      { id: 'ver-intercambiados-2026-online', title: 'Intercambiados', year: 2026, poster: 'https://example.com/poster.jpg', overview: '', genres: ['Latino', 'Subtitulado', 'Español'], cast: [] },
      { id: 'ver-toy-story-5-2026-online', title: 'Toy Story 5', year: 2026, poster: 'https://example.com/toy.jpg', overview: '', genres: ['Latino'], cast: [] },
    ]);

    const { PlaywrightScraper } = await import('../../src/scrapers/playwright-scraper');
    const scraper = new PlaywrightScraper('https://www.peelink2.com');
    const result = await scraper.fetchLibrary(1);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe('Intercambiados');
    expect(result.items[0].year).toBe(2026);
    expect(result.items[1].title).toBe('Toy Story 5');
    expect(mockPage.goto).toHaveBeenCalledWith('https://www.peelink2.com', { waitUntil: 'networkidle' });
  });

  it('returns paginated results for page 2', async () => {
    mockPage.evaluate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(true);

    const { PlaywrightScraper } = await import('../../src/scrapers/playwright-scraper');
    const scraper = new PlaywrightScraper('https://www.peelink2.com');
    const result = await scraper.fetchLibrary(2);

    expect(result.currentPage).toBe(2);
    expect(mockPage.goto).toHaveBeenCalledWith('https://www.peelink2.com/page/2', { waitUntil: 'networkidle' });
  });

  it('extracts item details with streams', async () => {
    mockPage.evaluate.mockResolvedValue({
      id: 'ver-intercambiados-2026-online',
      title: 'Intercambiados',
      year: 2026,
      poster: 'https://example.com/poster.jpg',
      overview: 'Una colorida aventura animada.',
      genres: ['Infantil'],
      cast: [],
      streams: [
        { url: 'https://voe.sx/e/abc123', quality: 'Latino', label: 'Latino #1' },
        { url: 'https://vimeos.net/embed-xyz.html', quality: 'Subtitulado', label: 'Subtitulado #1' },
      ],
    });

    const { PlaywrightScraper } = await import('../../src/scrapers/playwright-scraper');
    const scraper = new PlaywrightScraper('https://www.peelink2.com');
    const result = await scraper.fetchItemDetails('2026/05/ver-intercambiados-2026-online.html');

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Intercambiados');
    expect(result!.streams).toHaveLength(2);
    expect(result!.streams[0].quality).toBe('Latino');
  });
});
