# Jellyfin Scraper Bridge — Design Document

**Date:** 2026-06-23
**Status:** Draft

## Overview

A hybrid architecture that combines a web scraping service (Node.js) with a Jellyfin plugin (C#/.NET) to create a virtual media library from scraped streaming websites. Both services deploy on Render.com.

## Architecture

```
Render.com
├── Service A: Scraper API (Node.js + Playwright)
│   - REST API: /api/library, /api/item/:id, /api/stream/:id
│   - Scrapes target websites for metadata and video URLs
│   - Redis cache (TTL: 6h for metadata, 30min for streams)
│   - Proxies video streams to Jellyfin
│
└── Service B: Jellyfin (Docker Container)
    └── Plugin Jellyfin.Plugin.ScraperBridge (C# .NET 8)
        - IItemResolverProvider → virtual library folder
        - ScraperApiClient → HTTP client to Service A
        - StreamProvider → dynamic stream URLs
```

## Components

### Service A: Scraper API

| Aspect | Detail |
|---|---|
| Runtime | Node.js + TypeScript + Express |
| Scraping | Playwright (JS-heavy sites) + Cheerio (static HTML) |
| Cache | Redis on Render |
| Proxy | `http-proxy` or ffmpeg for video streams |

**Endpoints:**
- `GET /api/library?page=1` — paginated catalog
- `GET /api/item/:id/details` — full item metadata + stream URLs
- `GET /api/stream/:id/:quality` — proxy to actual video stream
- `GET /api/search?q=...` — search catalog

### Service B: Jellyfin Plugin

**Files:**
- `Plugin.cs` — entry point, plugin registration
- `ScraperController.cs` — internal Jellyfin endpoints
- `ItemProvider.cs` — IItemResolverProvider implementation
- `ScraperApiClient.cs` — HTTP client for Scraper API
- `StreamProvider.cs` — dynamic stream URL resolution
- `Configuration.cs` — Scraper URL, API key, target site config

**Behavior:**
- Registers as a virtual library folder via ItemResolver
- Maps scraped metadata to Jellyfin BaseItem objects
- Returns proxy URLs for playback (Jellyfin handles transcoding)
- No local file storage (Render ephemeral disk)

## Deployment (Render.com)

### Service A: Scraper (Web Service)
- Runtime: Node.js
- Build: `npm install && npx playwright install chromium`
- Start: `npm start`
- Plan: Starter ($7/mo) minimum
- Env: `TARGET_URL`, `REDIS_URL`, `API_KEY`

### Service B: Jellyfin (Docker)
- Custom Dockerfile extending `jellyfin/jellyfin:latest`
- Plugin pre-installed as a layer
- Render Disk for SQLite metadata persistence (paid add-on)
- Limited to 1-2 concurrent streams (no GPU, software transcoding)
- Config/metadata lost on restart without Render Disk

## Project Structure

```
/media-scraper/
├── scraper-api/                   → Service A
│   ├── src/
│   │   ├── routes/              → Express route handlers
│   │   ├── scrapers/            → Playwright/Cheerio scraper modules
│   │   ├── cache.ts             → Redis wrapper
│   │   └── index.ts             → Entry point
│   ├── package.json
│   └── Dockerfile
├── jellyfin-plugin/               → Service B plugin
│   ├── src/
│   │   ├── Plugin.cs
│   │   ├── ItemProvider.cs
│   │   ├── ScraperApiClient.cs
│   │   └── Configuration.cs
│   ├── Jellyfin.Plugin.ScraperBridge.csproj
│   └── build.sh
├── docker/
│   └── Dockerfile.jellyfin       → Jellyfin image with plugin
├── render.yaml                   → IaC for both services
└── README.md
```

## Data Flow

1. User opens Jellyfin → navigates to ScraperBridge virtual library
2. Plugin calls `GET /api/library` → Scraper scrapes website → returns JSON
3. Plugin maps items to Jellyfin BaseItem → renders in UI
4. User clicks a movie → Plugin calls `GET /api/item/:id/details`
5. Plugin presents playable streams with quality options
6. User clicks play → Plugin calls `GET /api/stream/:id/:quality`
7. Scraper proxies video stream → Jellyfin transcodes (optional) → Client plays

## Limitations

- **No GPU** on Render → no hardware transcoding, software only
- **1-2 concurrent streams max** (RAM constraint)
- **Ephemeral storage** → Jellyfin metadata lost on restart without Render Disk
- **Scraper fragility** → target site changes may break scraping
- **Legal** → scraping copyrighted content may violate ToS

## Future Considerations

- Add rate-limiting and rotation of user-agents/proxies
- Auto-healing: health checks + redeploy on scraper failures
- Multi-source: support multiple target websites
- User auth: API key between services
