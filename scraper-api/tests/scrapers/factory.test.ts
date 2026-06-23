import { describe, it, expect, vi } from 'vitest';

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({ newPage: vi.fn().mockResolvedValue({}), close: vi.fn() }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('ScraperFactory', () => {
  it('returns a scraper instance', async () => {
    const { getScraper } = await import('../../src/scrapers/factory');
    const scraper = getScraper();
    expect(scraper).toBeDefined();
    expect(typeof scraper.fetchLibrary).toBe('function');
    expect(typeof scraper.fetchItemDetails).toBe('function');
    expect(typeof scraper.search).toBe('function');
  }, 10000);
});
