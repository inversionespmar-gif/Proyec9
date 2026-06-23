import { createApp } from './app';
import { config } from './config';
import { getScraper } from './scrapers/factory';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Scraper API running on port ${config.port}`);
});

function shutdown() {
  console.log('Shutting down...');
  server.close(async () => {
    const scraper = getScraper();
    if ('close' in scraper && typeof (scraper as any).close === 'function') {
      await (scraper as any).close();
    }
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
