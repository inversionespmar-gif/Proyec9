import { describe, it, expect, vi } from 'vitest';

vi.mock('ioredis', () => {
  const IORedisMock = require('ioredis-mock');
  return { default: IORedisMock };
});

describe('RedisCache', () => {
  it('sets and gets values with TTL', async () => {
    const { RedisCache } = await import('../../src/cache/redis-cache');
    const cache = new RedisCache();
    await cache.set('test-key', { data: 'hello' }, 60);
    const val = await cache.get('test-key');
    expect(val).toEqual({ data: 'hello' });
  });

  it('returns null for missing keys', async () => {
    const { RedisCache } = await import('../../src/cache/redis-cache');
    const cache = new RedisCache();
    const val = await cache.get('nonexistent');
    expect(val).toBeNull();
  });

  it('respects TTL', async () => {
    const { RedisCache } = await import('../../src/cache/redis-cache');
    const cache = new RedisCache();
    await cache.set('ttl-key', 'value', 0);
    await new Promise((r) => setTimeout(r, 50));
    const val = await cache.get('ttl-key');
    expect(val).toBeNull();
  });
});
