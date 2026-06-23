import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

vi.mock('../../src/scrapers/factory', () => ({
  getScraper: vi.fn().mockReturnValue({
    fetchItemDetails: vi.fn((id: string) => {
      if (id === '999') return Promise.resolve(null);
      return Promise.resolve({
        id: '42',
        title: 'Test Movie',
        year: 2024,
        poster: 'https://example.com/poster.jpg',
        overview: 'A test movie',
        genres: ['Action', 'Drama'],
        cast: ['Actor A', 'Actor B'],
        streams: [
          { url: 'https://stream.example.com/720p', quality: '720p', label: 'HD' },
          { url: 'https://stream.example.com/1080p', quality: '1080p', label: 'Full HD' },
        ],
      });
    }),
  }),
}));

describe('GET /api/item/:id/details', () => {
  it('returns item details with streams', async () => {
    const app = createApp();
    const res = await request(app).get('/api/item/42/details').set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Movie');
    expect(res.body.streams).toHaveLength(2);
  });

  it('returns 404 for unknown item', async () => {
    const app = createApp();
    const res = await request(app).get('/api/item/999/details').set('x-api-key', 'test-api-key');
    expect(res.status).toBe(404);
  });
});
