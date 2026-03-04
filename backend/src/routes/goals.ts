import { Router, Request, Response } from 'express';
import db from '../database';
import { requireAuth } from '../middleware/auth';
import { addPoints, checkAndAwardBadges } from '../services/gamification';

const router = Router();

interface Goal {
  id: number;
  user_id: number;
  type: 'yearly' | 'monthly';
  target: number;
  year: number;
  month: number | null;
  created_at: string;
}

function getGoalProgress(goal: Goal, userId: number): number {
  if (goal.type === 'yearly') {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM user_books
      WHERE user_id = ? AND status = 'read' AND strftime('%Y', finished_at) = ?
    `).get(userId, String(goal.year)) as { count: number };
    return result.count;
  }
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM user_books
    WHERE user_id = ? AND status = 'read'
    AND strftime('%Y', finished_at) = ? AND strftime('%m', finished_at) = ?
  `).get(userId, String(goal.year), String(goal.month).padStart(2, '0')) as { count: number };
  return result.count;
}

router.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.userId!;
  const goals = db.prepare('SELECT * FROM reading_goals WHERE user_id = ? ORDER BY year DESC, month DESC').all(userId) as Goal[];
  res.json(goals.map(goal => ({
    ...goal,
    progress: getGoalProgress(goal, userId),
    completed: getGoalProgress(goal, userId) >= goal.target,
  })));
});

router.post('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.userId!;
  const { type, target, year, month } = req.body;

  if (!type || !target || !year) { res.status(400).json({ error: 'type, target, and year are required' }); return; }
  if (!['yearly', 'monthly'].includes(type)) { res.status(400).json({ error: 'type must be yearly or monthly' }); return; }
  if (type === 'monthly' && !month) { res.status(400).json({ error: 'month is required for monthly goals' }); return; }

  const existing = db.prepare(`
    SELECT id FROM reading_goals WHERE user_id = ? AND type = ? AND year = ? AND (month = ? OR (month IS NULL AND ? IS NULL))
  `).get(userId, type, year, month || null, month || null);

  if (existing) { res.status(409).json({ error: 'A goal already exists for this period' }); return; }

  db.prepare(`INSERT INTO reading_goals (user_id, type, target, year, month) VALUES (?, ?, ?, ?, ?)`).run(userId, type, target, year, month || null);

  const goal = db.prepare('SELECT * FROM reading_goals WHERE rowid = last_insert_rowid()').get() as Goal;
  addPoints(userId, 15, 'Created reading goal');
  checkAndAwardBadges(userId);

  res.status(201).json({ ...goal, progress: getGoalProgress(goal, userId), completed: false });
});

router.put('/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;
  const { target } = req.body;

  const goal = db.prepare('SELECT * FROM reading_goals WHERE id = ? AND user_id = ?').get(Number(id), userId) as Goal | undefined;
  if (!goal) { res.status(404).json({ error: 'Goal not found' }); return; }

  db.prepare('UPDATE reading_goals SET target = ? WHERE id = ?').run(target, Number(id));
  const updated = db.prepare('SELECT * FROM reading_goals WHERE id = ?').get(Number(id)) as Goal;

  res.json({ ...updated, progress: getGoalProgress(updated, userId), completed: getGoalProgress(updated, userId) >= updated.target });
});

router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const result = db.prepare('DELETE FROM reading_goals WHERE id = ? AND user_id = ?').run(Number(id), userId);
  if (result.changes === 0) { res.status(404).json({ error: 'Goal not found' }); return; }

  res.json({ message: 'Goal deleted' });
});

export default router;
