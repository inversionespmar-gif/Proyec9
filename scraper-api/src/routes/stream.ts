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
