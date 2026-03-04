import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getTrendingRecommendations, getHistoryBasedRecommendations, getSocialRecommendations } from '../services/recommendations';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const [trending, history, social] = await Promise.all([
      getTrendingRecommendations(req.userId!, 6),
      getHistoryBasedRecommendations(req.userId!, 6),
      getSocialRecommendations(6),
    ]);
    res.json({ trending, history, social });
  } catch {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.get('/trending', requireAuth, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 12, 30);
  try {
    res.json(await getTrendingRecommendations(req.userId!, limit));
  } catch {
    res.status(500).json({ error: 'Failed to get trending recommendations' });
  }
});

router.get('/for-you', requireAuth, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 12, 30);
  try {
    res.json(await getHistoryBasedRecommendations(req.userId!, limit));
  } catch {
    res.status(500).json({ error: 'Failed to get personalized recommendations' });
  }
});

router.get('/social', requireAuth, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 12, 30);
  try {
    res.json(await getSocialRecommendations(limit));
  } catch {
    res.status(500).json({ error: 'Failed to get social recommendations' });
  }
});

export default router;
