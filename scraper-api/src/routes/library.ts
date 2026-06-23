import { Router } from 'express';
import { getScraper } from '../scrapers/factory';
import { requireAuth } from './middleware/auth';

const router = Router();

router.get('/api/library', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
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
