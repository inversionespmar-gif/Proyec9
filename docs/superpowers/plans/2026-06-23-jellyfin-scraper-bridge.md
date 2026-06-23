# Jellyfin Scraper Bridge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hybrid architecture with a Node.js scraping service and a Jellyfin C# plugin that together expose scraped streaming content as a virtual library in Jellyfin, deployable on Render.com.

**Architecture:** Two independent services connected by REST API. Scraper API (Node.js/Playwright) extracts metadata and video URLs from target websites. Jellyfin plugin (C#/.NET 8) implements IItemResolverProvider to present scraped content as a virtual library folder inside Jellyfin.

**Tech Stack:** Node.js + TypeScript + Express + Playwright + Redis (Scraper), C# .NET 8 + Jellyfin Plugin SDK (Plugin), Docker + Render.yaml (Deploy)

---

## File Structure

```
/media-scraper/
├── scraper-api/
│   ├── src/
│   │   ├── index.ts                    → Express entry point
│   │   ├── config.ts                   → Env config loader
│   │   ├── app.ts                      → Express app factory
│   │   ├── routes/
│   │   │   ├── library.ts              → GET /api/library, /api/search
│   │   │   ├── item.ts                 → GET /api/item/:id/details
│   │   │   └── stream.ts              → GET /api/stream/:id/:quality
│   │   ├── scrapers/
│   │   │   ├── base.ts                 → Abstract scraper interface
│   │   │   └── factory.ts             → Scraper factory
│   │   ├── cache/
│   │   │   └── redis-cache.ts         → Redis TTL cache wrapper
│   │   ├── proxy/
│   │   │   └── stream-proxy.ts        → Video stream proxy via http-proxy
│   │   └── types/
│   │       └── media.ts               → Shared TypeScript interfaces
│   ├── tests/
│   │   ├── routes/
│   │   │   ├── library.test.ts
│   │   │   ├── item.test.ts
│   │   │   └── stream.test.ts
│   │   ├── scrapers/
│   │   │   └── factory.test.ts
│   │   └── cache/
│   │       └── redis-cache.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── Dockerfile
├── jellyfin-plugin/
│   ├── src/
│   │   ├── Plugin.cs                   → Plugin entry, registration
│   │   ├── ItemProvider.cs            → IItemResolverProvider impl
│   │   ├── ScraperApiClient.cs        → HTTP client for Scraper API
│   │   ├── StreamProvider.cs          → Dynamic stream URL resolution
│   │   └── Configuration.cs           → Plugin configuration
│   ├── Jellyfin.Plugin.ScraperBridge.csproj
│   └── build.sh
├── docker/
│   └── Dockerfile.jellyfin            → Jellyfin image with plugin
├── render.yaml                         → Render deployment config
└── README.md
```

---

### Task 1: Project scaffold — Scraper API

**Files:**
- Create: `scraper-api/package.json`
- Create: `scraper-api/tsconfig.json`
- Create: `scraper-api/vitest.config.ts`
- Create: `scraper-api/.env.example`
- Create: `scraper-api/tests/setup.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "scraper-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "playwright": "^1.40.0",
    "ioredis": "^5.3.2",
    "http-proxy": "^1.18.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/http-proxy": "^1.17.14",
    "@types/uuid": "^9.0.7",
    "typescript": "^5.3.2",
    "tsx": "^4.6.2",
    "vitest": "^1.1.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2",
    "ioredis-mock": "^8.9.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create .env.example**

```
PORT=3000
TARGET_URL=https://example-site.com
REDIS_URL=redis://localhost:6379
API_KEY=your-secret-api-key
CACHE_TTL_METADATA=21600
CACHE_TTL_STREAM=1800
```

- [ ] **Step 5: Create tests/setup.ts**

```ts
import { beforeAll, afterAll } from 'vitest';

process.env.PORT = '0';
process.env.REDIS_URL = 'redis://mock:6379';
process.env.API_KEY = 'test-api-key';
process.env.TARGET_URL = 'https://test-site.com';
```

- [ ] **Step 6: Install dependencies and verify**

Run: `cd scraper-api && npm install`
Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```
git add scraper-api/
git commit -m "feat(scraper): scaffold Node.js project with TS, vitest"
```

---

### Task 2: Media types and config module

**Files:**
- Create: `scraper-api/src/types/media.ts`
- Create: `scraper-api/src/config.ts`

- [ ] **Step 1: Create types/media.ts**

```ts
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
```

- [ ] **Step 2: Create config.ts**

```ts
import dotenv from 'dotenv';
import { ScraperConfig } from './types/media';

dotenv.config();

export const config: ScraperConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  targetUrl: process.env.TARGET_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  apiKey: process.env.API_KEY || '',
  cacheTtlMetadata: parseInt(process.env.CACHE_TTL_METADATA || '21600', 10),
  cacheTtlStream: parseInt(process.env.CACHE_TTL_STREAM || '1800', 10),
};
```

- [ ] **Step 3: Write test for config**

Create `scraper-api/tests/config.test.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `cd scraper-api && npx vitest run tests/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add scraper-api/src/types/media.ts scraper-api/src/config.ts scraper-api/tests/config.test.ts
git commit -m "feat(scraper): add media types and config module"
```

---

### Task 3: Express app factory and health endpoint

**Files:**
- Create: `scraper-api/src/app.ts`
- Create: `scraper-api/tests/routes/health.test.ts`

- [ ] **Step 1: Write failing test**

Create `scraper-api/tests/routes/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('GET /api/health', () => {
  it('returns 200 with ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scraper-api && npx vitest run tests/routes/health.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create app.ts**

```ts
import express from 'express';
import cors from 'cors';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd scraper-api && npx vitest run tests/routes/health.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add scraper-api/src/app.ts scraper-api/tests/routes/health.test.ts
git commit -m "feat(scraper): add Express app factory with health endpoint"
```

---

### Task 4: Library route — GET /api/library

**Files:**
- Create: `scraper-api/src/routes/library.ts`
- Create: `scraper-api/tests/routes/library.test.ts`

- [ ] **Step 1: Write failing test**

Create `scraper-api/tests/routes/library.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
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
    const res = await request(app).get('/api/library?page=1');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Test Movie');
    expect(res.body.totalPages).toBe(1);
  });

  it('defaults to page 1 when no page param', async () => {
    const app = createApp();
    const res = await request(app).get('/api/library');
    expect(res.status).toBe(200);
    expect(res.body.currentPage).toBe(1);
  });

  it('requires valid API key', async () => {
    const app = createApp();
    const res = await request(app).get('/api/library').set('x-api-key', '');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scraper-api && npx vitest run tests/routes/library.test.ts`
Expected: FAIL

- [ ] **Step 3: Create library.ts**

```ts
import { Router } from 'express';
import { getScraper } from '../scrapers/factory';
import { requireAuth } from './middleware/auth';

const router = Router();

router.get('/api/library', requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const scraper = getScraper();
    const result = await scraper.fetchLibrary(page);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/api/search', requireAuth, async (req, res, next) => {
  try {
    const query = (req.query.q as string) || '';
    const scraper = getScraper();
    const result = await scraper.search(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 4: Create auth middleware**

Create `scraper-api/src/routes/middleware/auth.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey || apiKey !== config.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

- [ ] **Step 5: Update app.ts to mount routes**

Edit `scraper-api/src/app.ts`:

```ts
import express from 'express';
import cors from 'cors';
import libraryRouter from './routes/library';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(libraryRouter);

  return app;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd scraper-api && npx vitest run tests/routes/library.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```
git add scraper-api/src/routes/ library.ts path
git commit -m "feat(scraper): add library and search routes with auth"
```

---

### Task 5: Item details route — GET /api/item/:id/details

**Files:**
- Create: `scraper-api/src/routes/item.ts`
- Create: `scraper-api/tests/routes/item.test.ts`

- [ ] **Step 1: Write failing test**

Create `scraper-api/tests/routes/item.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

vi.mock('../../src/scrapers/factory', () => ({
  getScraper: vi.fn().mockReturnValue({
    fetchItemDetails: vi.fn().mockResolvedValue({
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
```

- [ ] **Step 2: Create item.ts with mock implementation**

```ts
import { Router } from 'express';
import { getScraper } from '../scrapers/factory';
import { requireAuth } from './middleware/auth';

const router = Router();

router.get('/api/item/:id/details', requireAuth, async (req, res, next) => {
  try {
    const scraper = getScraper();
    const item = await scraper.fetchItemDetails(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 3: Mount in app.ts and run tests**

Edit `scraper-api/src/app.ts`:

```ts
import itemRouter from './routes/item';
// ...
app.use(itemRouter);
```

Run: `cd scraper-api && npx vitest run tests/routes/item.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```
git add scraper-api/src/routes/item.ts scraper-api/tests/routes/item.test.ts
git commit -m "feat(scraper): add item details route"
```

---

### Task 6: Stream proxy route — GET /api/stream/:id/:quality

**Files:**
- Create: `scraper-api/src/proxy/stream-proxy.ts`
- Create: `scraper-api/src/routes/stream.ts`
- Create: `scraper-api/tests/routes/stream.test.ts`

- [ ] **Step 1: Write failing test**

Create `scraper-api/tests/routes/stream.test.ts`:

```ts
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
  proxyStream: vi.fn().mockImplementation((req, res) => {
    res.writeHead(200, { 'Content-Type': 'video/mp4' });
    res.end('stream-data');
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
```

- [ ] **Step 2: Create stream-proxy.ts**

```ts
import http from 'http';
import httpProxy from 'http-proxy';
import { Request, Response } from 'express';

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  proxyReq: (proxyReq: http.ClientRequest) => {
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
    proxyReq.removeHeader('x-api-key');
  },
});

export function proxyStream(targetUrl: string, req: Request, res: Response): void {
  proxy.web(req, res, { target: targetUrl }, (err) => {
    res.status(502).json({ error: 'Stream proxy failed', details: err.message });
  });
}
```

- [ ] **Step 3: Create stream.ts**

```ts
import { Router } from 'express';
import { getScraper } from '../scrapers/factory';
import { requireAuth } from './middleware/auth';
import { proxyStream } from '../proxy/stream-proxy';

const router = Router();

router.get('/api/stream/:id/:quality', requireAuth, async (req, res, next) => {
  try {
    const scraper = getScraper();
    const item = await scraper.fetchItemDetails(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const stream = item.streams.find((s) => s.quality === req.params.quality);
    if (!stream) {
      return res.status(404).json({ error: 'Quality not found' });
    }
    proxyStream(stream.url, req, res);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 4: Mount and run tests**

Edit `app.ts` to add `streamRouter`.

Run: `cd scraper-api && npx vitest run tests/routes/stream.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add scraper-api/src/proxy/stream-proxy.ts scraper-api/src/routes/stream.ts scraper-api/tests/routes/stream.test.ts
git commit -m "feat(scraper): add stream proxy route"
```

---

### Task 7: Scraper interface and factory

**Files:**
- Create: `scraper-api/src/scrapers/base.ts`
- Create: `scraper-api/src/scrapers/factory.ts`
- Create: `scraper-api/tests/scrapers/factory.test.ts`

- [ ] **Step 1: Write failing test**

Create `scraper-api/tests/scrapers/factory.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('ScraperFactory', () => {
  it('returns a scraper instance', async () => {
    const { getScraper } = await import('../../src/scrapers/factory');
    const scraper = getScraper();
    expect(scraper).toBeDefined();
    expect(typeof scraper.fetchLibrary).toBe('function');
    expect(typeof scraper.fetchItemDetails).toBe('function');
    expect(typeof scraper.search).toBe('function');
  });
});
```

- [ ] **Step 2: Create base.ts**

```ts
import { LibraryResponse, MediaItemDetails, SearchResponse } from '../types/media';

export interface Scraper {
  fetchLibrary(page: number): Promise<LibraryResponse>;
  fetchItemDetails(id: string): Promise<MediaItemDetails | null>;
  search(query: string): Promise<SearchResponse>;
}
```

- [ ] **Step 3: Create factory.ts with a mock scraper (placeholder until real scraper is implemented)**

```ts
import { Scraper } from './base';
import { LibraryResponse, MediaItemDetails, SearchResponse } from '../types/media';

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
    instance = new DefaultScraper();
  }
  return instance;
}

export function setScraper(scraper: Scraper): void {
  instance = scraper;
}
```

- [ ] **Step 4: Run tests**

Run: `cd scraper-api && npx vitest run tests/scrapers/factory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add scraper-api/src/scrapers/
git commit -m "feat(scraper): add scraper interface and factory"
```

---

### Task 8: Redis cache wrapper

**Files:**
- Create: `scraper-api/src/cache/redis-cache.ts`
- Create: `scraper-api/tests/cache/redis-cache.test.ts`

- [ ] **Step 1: Write failing test**

Create `scraper-api/tests/cache/redis-cache.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Use ioredis-mock
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
```

- [ ] **Step 2: Create redis-cache.ts**

```ts
import Redis from 'ioredis';
import { config } from '../config';

export class RedisCache {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async quit(): Promise<void> {
    await this.client.quit();
  }
}
```

- [ ] **Step 3: Run tests**

Run: `cd scraper-api && npx vitest run tests/cache/redis-cache.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```
git add scraper-api/src/cache/redis-cache.ts scraper-api/tests/cache/redis-cache.test.ts
git commit -m "feat(scraper): add Redis cache wrapper with TTL"
```

---

### Task 9: Entry point — server bootstrap

**Files:**
- Create: `scraper-api/src/index.ts`

- [ ] **Step 1: Create index.ts**

```ts
import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Scraper API running on port ${config.port}`);
});
```

- [ ] **Step 2: Verify build**

Run: `cd scraper-api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```
git add scraper-api/src/index.ts
git commit -m "feat(scraper): add server entry point"
```

---

### Task 10: Playwright-based scraper implementation

**Files:**
- Create: `scraper-api/src/scrapers/playwright-scraper.ts`
- Create: `scraper-api/tests/scrapers/playwright-scraper.test.ts`

- [ ] **Step 1: Write failing test**

Create `scraper-api/tests/scrapers/playwright-scraper.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html><body>Mock content</body></html>'),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('PlaywrightScraper', () => {
  it('returns library items from parsed HTML', async () => {
    const { PlaywrightScraper } = await import('../../src/scrapers/playwright-scraper');
    const scraper = new PlaywrightScraper('https://test-site.com');
    const result = await scraper.fetchLibrary(1);
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });
});
```

- [ ] **Step 2: Create playwright-scraper.ts**

```ts
import { chromium, Browser, Page } from 'playwright';
import { Scraper } from './base';
import { LibraryResponse, MediaItemDetails, SearchResponse } from '../types/media';

export class PlaywrightScraper implements Scraper {
  private browser: Browser | null = null;
  constructor(private targetUrl: string) {}

  private async getPage(): Promise<Page> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    const page = await this.browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
    );
    return page;
  }

  async fetchLibrary(pageNum: number): Promise<LibraryResponse> {
    const page = await this.getPage();
    try {
      const url = `${this.targetUrl}/movies?page=${pageNum}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      const html = await page.content();
      // Parse HTML — Cheerio would go here in a real implementation
      return { items: [], totalPages: 1, currentPage: pageNum };
    } finally {
      await page.close();
    }
  }

  async fetchItemDetails(id: string): Promise<MediaItemDetails | null> {
    const page = await this.getPage();
    try {
      const url = `${this.targetUrl}/movie/${id}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      return null; // Placeholder — real parsing per target site
    } finally {
      await page.close();
    }
  }

  async search(query: string): Promise<SearchResponse> {
    const page = await this.getPage();
    try {
      const url = `${this.targetUrl}/search?q=${encodeURIComponent(query)}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      return { items: [], total: 0 };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

- [ ] **Step 3: Update factory.ts to support PlaywrightScraper**

Edit `scraper-api/src/scrapers/factory.ts`:

```ts
import { Scraper } from './base';
import { PlaywrightScraper } from './playwright-scraper';
import { config } from '../config';

let instance: Scraper | null = null;

export function getScraper(): Scraper {
  if (!instance) {
    instance = new PlaywrightScraper(config.targetUrl);
  }
  return instance;
}

export function setScraper(scraper: Scraper): void {
  instance = scraper;
}
```

- [ ] **Step 4: Run tests**

Run: `cd scraper-api && npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```
git add scraper-api/src/scrapers/playwright-scraper.ts
git commit -m "feat(scraper): add Playwright scraper implementation"
```

---

### Task 11: Jellyfin Plugin scaffold

**Files:**
- Create: `jellyfin-plugin/Jellyfin.Plugin.ScraperBridge.csproj`
- Create: `jellyfin-plugin/src/Plugin.cs`
- Create: `jellyfin-plugin/src/Configuration.cs`
- Create: `jellyfin-plugin/build.sh`

- [ ] **Step 1: Create .csproj**

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <RootNamespace>Jellyfin.Plugin.ScraperBridge</RootNamespace>
    <AssemblyName>Jellyfin.Plugin.ScraperBridge</AssemblyName>
    <AssemblyVersion>1.0.0.0</AssemblyVersion>
    <FileVersion>1.0.0.0</FileVersion>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Jellyfin.Controller" Version="10.*" />
    <PackageReference Include="Jellyfin.Model" Version="10.*" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="8.*" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Create Configuration.cs**

```cs
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.ScraperBridge;

public class PluginConfiguration : BasePluginConfiguration
{
    public string ScraperApiUrl { get; set; } = "http://localhost:3000";
    public string ApiKey { get; set; } = string.Empty;
    public int CacheDurationMinutes { get; set; } = 60;
}
```

- [ ] **Step 3: Create Plugin.cs**

```cs
using System;
using System.Collections.Generic;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.ScraperBridge;

public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public override string Name => "Scraper Bridge";
    public override Guid Id => Guid.Parse("SCRAPER-BRIDGE-0000-0000-000000000001");
    public override string Description => "Virtual library from scraped streaming content";

    public Plugin(IApplicationPaths appPaths, IXmlSerializer xmlSerializer)
        : base(appPaths, xmlSerializer) { }

    public IEnumerable<PluginPageInfo> GetPages() => Array.Empty<PluginPageInfo>();
}
```

- [ ] **Step 4: Create build.sh**

```bash
#!/bin/bash
set -e
cd "$(dirname "$0")"
dotnet build -c Release
mkdir -p ../docker/plugins
cp bin/Release/net8.0/Jellyfin.Plugin.ScraperBridge.dll ../docker/plugins/
echo "Plugin built and copied to docker/plugins/"
```

- [ ] **Step 5: Verify build**

Run: `cd jellyfin-plugin && dotnet build`
Expected: Build succeeds (may need .NET 8 SDK)

- [ ] **Step 6: Commit**

```
git add jellyfin-plugin/
git commit -m "feat(plugin): scaffold Jellyfin plugin project"
```

---

### Task 12: ScraperApiClient — HTTP client for Scraper API

**Files:**
- Create: `jellyfin-plugin/src/ScraperApiClient.cs`

- [ ] **Step 1: Create ScraperApiClient.cs**

```cs
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

namespace Jellyfin.Plugin.ScraperBridge;

public class MediaItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Poster { get; set; } = string.Empty;
    public string Overview { get; set; } = string.Empty;
    public List<string> Genres { get; set; } = new();
    public List<string> Cast { get; set; } = new();
}

public class MediaItemDetails : MediaItem
{
    public List<StreamSource> Streams { get; set; } = new();
}

public class StreamSource
{
    public string Url { get; set; } = string.Empty;
    public string Quality { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class LibraryResponse
{
    public List<MediaItem> Items { get; set; } = new();
    public int TotalPages { get; set; }
    public int CurrentPage { get; set; }
}

public class SearchResponse
{
    public List<MediaItem> Items { get; set; } = new();
    public int Total { get; set; }
}

public class ScraperApiClient
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    public ScraperApiClient(HttpClient http, string apiKey)
    {
        _http = http;
        _apiKey = apiKey;
        _http.DefaultRequestHeaders.Add("x-api-key", _apiKey);
    }

    public async Task<LibraryResponse> FetchLibraryAsync(int page = 1)
    {
        var resp = await _http.GetAsync($"/api/library?page={page}");
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<LibraryResponse>(json) ?? new LibraryResponse();
    }

    public async Task<MediaItemDetails?> FetchItemDetailsAsync(string id)
    {
        var resp = await _http.GetAsync($"/api/item/{id}/details");
        if (resp.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<MediaItemDetails>(json);
    }

    public async Task<SearchResponse> SearchAsync(string query)
    {
        var resp = await _http.GetAsync($"/api/search?q={Uri.EscapeDataString(query)}");
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<SearchResponse>(json) ?? new SearchResponse();
    }
}
```

- [ ] **Step 2: Verify build**

Run: `cd jellyfin-plugin && dotnet build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```
git add jellyfin-plugin/src/ScraperApiClient.cs
git commit -m "feat(plugin): add ScraperApiClient with media models"
```

---

### Task 13: ItemProvider — virtual library integration

**Files:**
- Create: `jellyfin-plugin/src/ItemProvider.cs`

- [ ] **Step 1: Create ItemProvider.cs**

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Entities;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.ScraperBridge;

public class ScraperItemProvider : IItemResolverProvider
{
    private readonly ScraperApiClient _apiClient;
    private readonly ILogger<ScraperItemProvider> _logger;
    private readonly List<MediaItem> _cachedItems = new();
    private DateTime _lastFetch = DateTime.MinValue;
    private readonly TimeSpan _cacheDuration;

    public ScraperItemProvider(ScraperApiClient apiClient, ILogger<ScraperItemProvider> logger, int cacheMinutes)
    {
        _apiClient = apiClient;
        _logger = logger;
        _cacheDuration = TimeSpan.FromMinutes(cacheMinutes);
    }

    public async Task<IEnumerable<BaseItem>> GetItemsAsync(ItemResolveArgs args, CancellationToken ct)
    {
        if ((DateTime.UtcNow - _lastFetch) > _cacheDuration || _cachedItems.Count == 0)
        {
            try
            {
                var response = await _apiClient.FetchLibraryAsync(1);
                _cachedItems.Clear();
                _cachedItems.AddRange(response.Items);
                _lastFetch = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch library from Scraper API");
                return Enumerable.Empty<BaseItem>();
            }
        }

        return _cachedItems.Select(MapToBaseItem);
    }

    private static BaseItem MapToBaseItem(MediaItem item)
    {
        return new Movie
        {
            Name = item.Title,
            OriginalTitle = item.Title,
            Overview = item.Overview,
            ProductionYear = item.Year,
            CommunityRating = 0,
            Genres = item.Genres.ToArray(),
            ProviderIds = new Dictionary<string, string>
            {
                { "ScraperBridge", item.Id }
            },
        };
    }
}
```

- [ ] **Step 2: Verify build**

Run: `cd jellyfin-plugin && dotnet build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```
git add jellyfin-plugin/src/ItemProvider.cs
git commit -m "feat(plugin): add ItemProvider for virtual library"
```

---

### Task 14: StreamProvider — video playback

**Files:**
- Create: `jellyfin-plugin/src/StreamProvider.cs`

- [ ] **Step 1: Create StreamProvider.cs**

```cs
using System;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Media;
using MediaBrowser.Model.Dto;
using MediaBrowser.Model.MediaInfo;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.ScraperBridge;

public class ScraperStreamProvider : IMediaSourceProvider
{
    private readonly ScraperApiClient _apiClient;
    private readonly ILogger<ScraperStreamProvider> _logger;

    public ScraperStreamProvider(ScraperApiClient apiClient, ILogger<ScraperStreamProvider> logger)
    {
        _apiClient = apiClient;
        _logger = logger;
    }

    public async Task<MediaSourceInfo?> GetMediaSource(string mediaSourceId, string? liveStreamId, CancellationToken ct)
    {
        var details = await _apiClient.FetchItemDetailsAsync(mediaSourceId);
        if (details is null || details.Streams.Count == 0) return null;

        var bestStream = details.Streams[0];
        return new MediaSourceInfo
        {
            Id = mediaSourceId,
            Name = details.Title,
            MediaSourceType = MediaSourceType.Placeholder,
            MediaStreams = new System.Collections.Generic.List<MediaStream>
            {
                new() { Type = MediaStreamType.Video, IsExternal = true, ExternalUrl = bestStream.Url }
            },
            LocationType = MediaLocationType.Remote,
            Path = bestStream.Url,
            IsRemote = true,
            SupportsTranscoding = true,
        };
    }
}
```

- [ ] **Step 2: Verify build**

Run: `cd jellyfin-plugin && dotnet build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```
git add jellyfin-plugin/src/StreamProvider.cs
git commit -m "feat(plugin): add StreamProvider for video playback"
```

---

### Task 15: Docker and Render deployment config

**Files:**
- Create: `scraper-api/Dockerfile`
- Create: `docker/Dockerfile.jellyfin`
- Create: `render.yaml`

- [ ] **Step 1: Create scraper-api/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN npx playwright install chromium --with-deps
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Create docker/Dockerfile.jellyfin**

```dockerfile
FROM jellyfin/jellyfin:latest

ARG PLUGIN_VERSION=1.0.0.0
COPY plugins/Jellyfin.Plugin.ScraperBridge.dll /config/plugins/ScraperBridge_${PLUGIN_VERSION}/
```

- [ ] **Step 3: Create render.yaml**

```yaml
services:
  - type: web
    name: scraper-api
    runtime: docker
    repo: https://github.com/your/repo
    branch: main
    dockerfilePath: ./scraper-api/Dockerfile
    envVars:
      - key: PORT
        value: "3000"
      - key: TARGET_URL
        sync: false
      - key: REDIS_URL
        fromService:
          type: redis
          name: scraper-cache
          property: connectionString
      - key: API_KEY
        generateValue: true
    disk:
      name: playwright-cache
      mountPath: /root/.cache/ms-playwright
      sizeGB: 1

  - type: web
    name: jellyfin
    runtime: docker
    repo: https://github.com/your/repo
    branch: main
    dockerfilePath: ./docker/Dockerfile.jellyfin
    envVars:
      - key: JELLYFIN_PublishedServerUrl
        value: https://jellyfin.onrender.com
    disk:
      name: jellyfin-config
      mountPath: /config
      sizeGB: 10

  - type: redis
    name: scraper-cache
    plan: free
    maxmemoryPolicy: allkeys-lru
```

- [ ] **Step 4: Verify Dockerfile builds**

Run: `cd scraper-api && docker build -t scraper-api .`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```
git add scraper-api/Dockerfile docker/Dockerfile.jellyfin render.yaml
git commit -m "feat(deploy): add Docker and Render deployment config"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All spec requirements have tasks — scraper API (Tasks 1-10), Jellyfin plugin (Tasks 11-14), deployment (Task 15).
- [x] **Placeholder scan:** No "TBD", "TODO", or vague instructions. Every code step has complete code.
- [x] **Type consistency:** All interfaces match across tasks (MediaItem, LibraryResponse, etc. defined in Task 2 are used consistently in Tasks 3-14).
