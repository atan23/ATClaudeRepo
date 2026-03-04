import { Router, Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import db from '../database';
import { requireAuth } from '../middleware/auth';
import { searchBooks, getBookById } from '../services/googleBooks';

const router = Router();

router.get('/search', requireAuth, async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  try {
    const results = await searchBooks(q, 12);

    for (const book of results) {
      db.prepare(`
        INSERT OR IGNORE INTO books (google_books_id, title, authors, cover_url, genres, description, published_year, average_rating, ratings_count, page_count, isbn, language)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(book.id, book.title, JSON.stringify(book.authors), book.coverUrl, JSON.stringify(book.genres), book.description, book.publishedYear, book.averageRating, book.ratingsCount, book.pageCount, book.isbn, book.language);
    }

    res.json(results);
  } catch {
    const localResults = db.prepare(`
      SELECT * FROM books WHERE title LIKE ? OR authors LIKE ? LIMIT 12
    `).all(`%${q}%`, `%${q}%`);
    res.json(localResults);
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isNaN(Number(id))) {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(Number(id));
    if (book) { res.json(book); return; }
  }

  const localBook = db.prepare('SELECT * FROM books WHERE google_books_id = ?').get(id);
  if (localBook) { res.json(localBook); return; }

  try {
    const apiBook = await getBookById(id);
    if (!apiBook) { res.status(404).json({ error: 'Book not found' }); return; }

    db.prepare(`
      INSERT OR IGNORE INTO books (google_books_id, title, authors, cover_url, genres, description, published_year, average_rating, ratings_count, page_count, isbn, language)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(apiBook.id, apiBook.title, JSON.stringify(apiBook.authors), apiBook.coverUrl, JSON.stringify(apiBook.genres), apiBook.description, apiBook.publishedYear, apiBook.averageRating, apiBook.ratingsCount, apiBook.pageCount, apiBook.isbn, apiBook.language);

    res.json(db.prepare('SELECT * FROM books WHERE google_books_id = ?').get(apiBook.id));
  } catch {
    res.status(404).json({ error: 'Book not found' });
  }
});

router.post('/import', requireAuth, async (req: Request, res: Response) => {
  const { csvContent, source } = req.body;

  if (!csvContent || !source) { res.status(400).json({ error: 'csvContent and source are required' }); return; }
  if (!['kindle', 'goodreads'].includes(source)) { res.status(400).json({ error: 'source must be kindle or goodreads' }); return; }

  try {
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    const userId = req.userId!;
    let imported = 0;
    const errors: string[] = [];

    for (const record of records as Record<string, string>[]) {
      try {
        let title: string, authors: string[], status: string, rating: number | null, finished_at: string | null;

        if (source === 'goodreads') {
          title = record['Title'] || record['title'];
          const authorRaw = record['Author'] || record['author'] || record['Author l-f'] || '';
          authors = authorRaw ? [authorRaw] : ['Unknown'];
          const shelf = record['Exclusive Shelf'] || record['Bookshelves'] || '';
          status = shelf.includes('read') ? 'read' : shelf.includes('reading') ? 'reading' : 'want_to_read';
          rating = record['My Rating'] ? parseInt(record['My Rating']) || null : null;
          finished_at = record['Date Read'] || null;
        } else {
          title = record['Title'] || record['title'];
          authors = record['Author'] ? [record['Author']] : ['Unknown'];
          status = 'read';
          rating = null;
          finished_at = null;
        }

        if (!title) continue;

        let book = db.prepare('SELECT * FROM books WHERE title = ?').get(title) as { id: number } | undefined;

        if (!book) {
          try {
            const searchResults = await searchBooks(`${title} ${authors[0]}`, 1);
            if (searchResults.length > 0) {
              const found = searchResults[0];
              db.prepare(`
                INSERT OR IGNORE INTO books (google_books_id, title, authors, cover_url, genres, description, published_year, average_rating, ratings_count, page_count, isbn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(found.id, found.title, JSON.stringify(found.authors), found.coverUrl, JSON.stringify(found.genres), found.description, found.publishedYear, found.averageRating, found.ratingsCount, found.pageCount, found.isbn);
              book = db.prepare('SELECT * FROM books WHERE google_books_id = ?').get(found.id) as { id: number } | undefined;
            }
          } catch { /* ignore API errors */ }
        }

        if (!book) {
          db.prepare(`INSERT OR IGNORE INTO books (title, authors, genres) VALUES (?, ?, '[]')`).run(title, JSON.stringify(authors));
          book = db.prepare('SELECT * FROM books WHERE title = ? AND authors = ?').get(title, JSON.stringify(authors)) as { id: number } | undefined;
        }

        if (!book) continue;

        db.prepare(`
          INSERT OR IGNORE INTO user_books (user_id, book_id, status, rating, source, finished_at) VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, book.id, status, rating, source, finished_at);

        imported++;
      } catch (rowErr) {
        errors.push(String(rowErr));
      }
    }

    res.json({ imported, errors: errors.slice(0, 5) });
  } catch (err) {
    res.status(400).json({ error: 'Failed to parse CSV: ' + String(err) });
  }
});

router.get('/', requireAuth, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM books ORDER BY ratings_count DESC LIMIT 50').all());
});

export default router;
