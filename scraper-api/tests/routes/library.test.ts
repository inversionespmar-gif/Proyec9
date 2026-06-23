import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

vi.mock('../../src/scrapers/factory', () => ({
  getScraper: vi.fn().mockReturnValue({
    fetchLibrary: vi.fn().mockResolvedValue({
      items: [
        {
          id: '1',
          title: 'Test Movie',
          year: 2024,
          poster: 'https://example.com/poster.jpg',
          overview: 'A test movie',
          genres: ['Action'],
          cast: ['Actor A'],
        },
      ],
      totalPages: 1,
      currentPage: 1,
    }),
  }),
}));

describe('GET /api/library', () => {
  it('returns paginated library items', async () => {
    const app = createApp();
    const res = await request(app).get('/api/library?page=1').set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Test Movie');
    expect(res.body.totalPages).toBe(1);
  });

  it('defaults to page 1 when no page param', async () => {
    const app = createApp();
    const res = await request(app).get('/api/library').set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.currentPage).toBe(1);
  });

  it('requires valid API key', async () => {
    const app = createApp();
    const res = await request(app).get('/api/library').set('x-api-key', '');
    expect(res.status).toBe(401);
  });
});
