import { Router, Request, Response } from 'express';
import db from '../database';
import { requireAuth } from '../middleware/auth';
import { addPoints, checkAndAwardBadges, updateReadingStreak, checkGoalCompletion } from '../services/gamification';

const router = Router();

router.get('/', requireAuth, (req: Request, res: Response) => {
  const { status, source, sort = 'created_at', order = 'DESC' } = req.query;

  let query = `
    SELECT ub.*, b.title, b.authors, b.cover_url, b.genres, b.description,
           b.published_year, b.average_rating, b.ratings_count, b.page_count,
           b.isbn, b.google_books_id
    FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = ?
  `;
  const params: (string | number)[] = [req.userId!];

  if (status && typeof status === 'string') { query += ' AND ub.status = ?'; params.push(status); }
  if (source && typeof source === 'string') { query += ' AND ub.source = ?'; params.push(source); }

  const sortMap: Record<string, string> = {
    title: 'b.title', average_rating: 'b.average_rating',
    finished_at: 'ub.finished_at', rating: 'ub.rating', created_at: 'ub.created_at',
  };
  const allowedSorts = Object.keys(sortMap);
  const sortCol = allowedSorts.includes(sort as string) ? sort as string : 'created_at';
  const orderDir = order === 'ASC' ? 'ASC' : 'DESC';

  query += ` ORDER BY ${sortMap[sortCol]} ${orderDir}`;
  res.json(db.prepare(query).all(...params));
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { bookId, googleBooksId, status = 'want_to_read' } = req.body;
  const userId = req.userId!;

  let resolvedBookId = bookId;
  if (!resolvedBookId && googleBooksId) {
    const book = db.prepare('SELECT id FROM books WHERE google_books_id = ?').get(googleBooksId) as { id: number } | undefined;
    resolvedBookId = book?.id;
  }

  if (!resolvedBookId) { res.status(400).json({ error: 'bookId or googleBooksId is required' }); return; }

  const existing = db.prepare('SELECT * FROM user_books WHERE user_id = ? AND book_id = ?').get(userId, resolvedBookId);
  if (existing) { res.status(409).json({ error: 'Book already in library' }); return; }

  db.prepare(`
    INSERT INTO user_books (user_id, book_id, status, started_at) VALUES (?, ?, ?, ?)
  `).run(userId, resolvedBookId, status, status === 'reading' ? new Date().toISOString() : null);

  addPoints(userId, 5, 'Added book to library');

  const entry = db.prepare(`
    SELECT ub.*, b.title, b.authors, b.cover_url, b.genres
    FROM user_books ub JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = ? AND ub.book_id = ?
  `).get(userId, resolvedBookId);

  res.status(201).json(entry);
});

router.put('/:bookId', requireAuth, (req: Request, res: Response) => {
  const { bookId } = req.params;
  const userId = req.userId!;
  const { status, rating, review, started_at, finished_at } = req.body;

  const existing = db.prepare('SELECT * FROM user_books WHERE user_id = ? AND book_id = ?').get(userId, Number(bookId)) as {
    id: number; status: string; rating: number | null;
  } | undefined;

  if (!existing) { res.status(404).json({ error: 'Book not in library' }); return; }

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (rating !== undefined) { updates.push('rating = ?'); params.push(rating); }
  if (review !== undefined) { updates.push('review = ?'); params.push(review); }
  if (started_at !== undefined) { updates.push('started_at = ?'); params.push(started_at); }
  if (finished_at !== undefined) { updates.push('finished_at = ?'); params.push(finished_at); }

  if (status === 'read' && existing.status !== 'read') {
    if (!updates.includes('finished_at = ?')) {
      updates.push('finished_at = ?');
      params.push(finished_at || new Date().toISOString());
    }
    addPoints(userId, 20, 'Finished reading a book');
    updateReadingStreak(userId);
    checkGoalCompletion(userId);
  }

  if (rating !== undefined && existing.rating === null) addPoints(userId, 5, 'Rated a book');
  if (review !== undefined) addPoints(userId, 10, 'Wrote a review');

  if (updates.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

  params.push(userId, Number(bookId));
  db.prepare(`UPDATE user_books SET ${updates.join(', ')} WHERE user_id = ? AND book_id = ?`).run(...params);

  const newBadges = checkAndAwardBadges(userId);
  const updated = db.prepare(`
    SELECT ub.*, b.title, b.authors, b.cover_url, b.genres
    FROM user_books ub JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = ? AND ub.book_id = ?
  `).get(userId, Number(bookId));

  res.json({ ...updated as object, newBadges });
});

router.delete('/:bookId', requireAuth, (req: Request, res: Response) => {
  const { bookId } = req.params;
  const userId = req.userId!;

  const result = db.prepare('DELETE FROM user_books WHERE user_id = ? AND book_id = ?').run(userId, Number(bookId));
  if (result.changes === 0) { res.status(404).json({ error: 'Book not in library' }); return; }

  res.json({ message: 'Book removed from library' });
});

export default router;
