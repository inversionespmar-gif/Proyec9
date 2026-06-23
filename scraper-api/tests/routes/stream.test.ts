import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

vi.mock('../../src/scrapers/factory', () => ({
  getScraper: vi.fn().mockReturnValue({
    fetchItemDetails: vi.fn().mockResolvedValue({
      id: '42',
      title: 'Test Movie',
      year: 2024,
      poster: '',
      overview: '',
      genres: [],
      cast: [],
      streams: [
        { url: 'https://example.com/stream.mp4', quality: '720p', label: 'HD' },
      ],
    }),
  }),
}));

vi.mock('../../src/proxy/stream-proxy', () => ({
  proxyStream: vi.fn().mockImplementation((_targetUrl, _req, res) => {
    res.status(200).send('stream-data');
  }),
}));

describe('GET /api/stream/:id/:quality', () => {
  it('proxies video stream', async () => {
    const app = createApp();
    const res = await request(app).get('/api/stream/42/720p').set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.text).toBe('stream-data');
  });

  it('returns 404 for unknown quality', async () => {
    const app = createApp();
    const res = await request(app).get('/api/stream/42/4k').set('x-api-key', 'test-api-key');
    expect(res.status).toBe(404);
  });
});
