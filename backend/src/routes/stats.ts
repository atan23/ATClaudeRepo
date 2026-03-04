import { Router, Request, Response } from 'express';
import db from '../database';
import { requireAuth } from '../middleware/auth';
import { calculateLevel, getNextLevelThreshold, getLevelName } from '../services/gamification';

const router = Router();

router.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.userId!;
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const booksByStatus = db.prepare(`SELECT status, COUNT(*) as count FROM user_books WHERE user_id = ? GROUP BY status`).all(userId) as { status: string; count: number }[];

  const totalRead = booksByStatus.find(b => b.status === 'read')?.count || 0;
  const currentlyReading = booksByStatus.find(b => b.status === 'reading')?.count || 0;
  const wantToRead = booksByStatus.find(b => b.status === 'want_to_read')?.count || 0;

  const booksThisYear = (db.prepare(`SELECT COUNT(*) as count FROM user_books WHERE user_id = ? AND status = 'read' AND strftime('%Y', finished_at) = ?`).get(userId, String(year)) as { count: number }).count;
  const booksThisMonth = (db.prepare(`SELECT COUNT(*) as count FROM user_books WHERE user_id = ? AND status = 'read' AND strftime('%Y', finished_at) = ? AND strftime('%m', finished_at) = ?`).get(userId, String(year), String(month).padStart(2, '0')) as { count: number }).count;
  const avgRating = (db.prepare(`SELECT AVG(rating) as avg FROM user_books WHERE user_id = ? AND rating IS NOT NULL`).get(userId) as { avg: number | null }).avg;

  const genreData = db.prepare(`SELECT b.genres FROM user_books ub JOIN books b ON ub.book_id = b.id WHERE ub.user_id = ? AND ub.status = 'read'`).all(userId) as { genres: string }[];
  const genreCounts: Record<string, number> = {};
  for (const row of genreData) {
    try { (JSON.parse(row.genres || '[]') as string[]).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }); } catch { /* ignore */ }
  }
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([genre, count]) => ({ genre, count }));

  const booksBySource = db.prepare(`SELECT source, COUNT(*) as count FROM user_books WHERE user_id = ? GROUP BY source`).all(userId) as { source: string; count: number }[];
  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', finished_at) as month, COUNT(*) as count
    FROM user_books WHERE user_id = ? AND status = 'read' AND finished_at IS NOT NULL AND finished_at >= date('now', '-12 months')
    GROUP BY month ORDER BY month ASC
  `).all(userId) as { month: string; count: number }[];

  const user = db.prepare('SELECT points, level, streak_days FROM users WHERE id = ?').get(userId) as { points: number; level: number; streak_days: number };
  const currentLevelThreshold = user.level > 1 ? [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000][user.level - 2] || 0 : 0;
  const nextLevelThreshold = getNextLevelThreshold(user.level);
  const levelProgress = nextLevelThreshold > currentLevelThreshold
    ? Math.round(((user.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100)
    : 100;

  const badges = db.prepare(`
    SELECT b.*, ub.earned_at FROM user_badges ub JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = ? ORDER BY ub.earned_at DESC
  `).all(userId);

  const allBadges = db.prepare('SELECT * FROM badges').all();

  res.json({
    reading: { totalRead, currentlyReading, wantToRead, booksThisYear, booksThisMonth, averageRating: avgRating ? parseFloat(avgRating.toFixed(2)) : null },
    genres: topGenres,
    sources: booksBySource,
    monthlyTrend,
    gamification: {
      points: user.points, level: user.level, levelName: getLevelName(user.level),
      streakDays: user.streak_days, currentLevelThreshold, nextLevelThreshold,
      pointsToNextLevel: Math.max(0, nextLevelThreshold - user.points),
      levelProgress: Math.min(100, Math.max(0, levelProgress)),
    },
    badges: { earned: badges, total: allBadges.length },
  });
});

router.get('/leaderboard', requireAuth, (_req: Request, res: Response) => {
  res.json(db.prepare(`
    SELECT u.id, u.name, u.avatar, u.points, u.level, COUNT(ub.id) as books_read
    FROM users u LEFT JOIN user_books ub ON u.id = ub.user_id AND ub.status = 'read'
    GROUP BY u.id ORDER BY u.points DESC LIMIT 10
  `).all());
});

router.get('/activity', requireAuth, (_req: Request, res: Response) => {
  res.json(db.prepare(`
    SELECT u.name, u.avatar, b.title, b.authors, b.cover_url, ub.rating, ub.finished_at
    FROM user_books ub JOIN users u ON ub.user_id = u.id JOIN books b ON ub.book_id = b.id
    WHERE ub.status = 'read' AND ub.finished_at IS NOT NULL
    ORDER BY ub.finished_at DESC LIMIT 20
  `).all());
});

// Suppress unused warning
void calculateLevel;

export default router;
