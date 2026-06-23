import { describe, it, expect } from 'vitest';

describe('config', () => {
  it('loads env vars with defaults', async () => {
    const { config } = await import('../src/config');
    expect(config.apiKey).toBe('test-api-key');
    expect(config.port).toBe(0);
    expect(config.targetUrl).toBe('https://test-site.com');
    expect(config.cacheTtlMetadata).toBe(21600);
    expect(config.cacheTtlStream).toBe(1800);
  });
});
