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
