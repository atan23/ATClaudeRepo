import db from '../database';
import { searchBooks } from './googleBooks';

interface Book {
  id: number;
  google_books_id: string;
  title: string;
  authors: string;
  cover_url: string;
  genres: string;
  description: string;
  published_year: number;
  average_rating: number;
  ratings_count: number;
  page_count: number;
}

interface Recommendation {
  book: Book;
  source: 'trending' | 'history' | 'social';
  reason: string;
  score: number;
}

export async function getTrendingRecommendations(userId: number, limit = 10): Promise<Recommendation[]> {
  // Get books from catalog ordered by rating and popularity, excluding already-added books
  const trending = db.prepare(`
    SELECT b.*, COUNT(ub.id) as user_count
    FROM books b
    LEFT JOIN user_books ub ON b.id = ub.book_id
    WHERE b.id NOT IN (
      SELECT book_id FROM user_books WHERE user_id = ?
    )
    GROUP BY b.id
    ORDER BY (b.average_rating * LOG(b.ratings_count + 1)) DESC
    LIMIT ?
  `).all(userId, limit) as (Book & { user_count: number })[];

  return trending.map(book => ({
    book,
    source: 'trending' as const,
    reason: `Trending now · ${book.average_rating.toFixed(1)} ★ from ${book.ratings_count.toLocaleString()} ratings`,
    score: book.average_rating * Math.log(book.ratings_count + 1),
  }));
}

export async function getHistoryBasedRecommendations(userId: number, limit = 10): Promise<Recommendation[]> {
  // Get user's highly-rated books and their genres
  const likedBooks = db.prepare(`
    SELECT b.genres, b.authors, ub.rating FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = ? AND ub.status = 'read' AND ub.rating >= 4
    ORDER BY ub.rating DESC
    LIMIT 20
  `).all(userId) as { genres: string; authors: string; rating: number }[];

  if (likedBooks.length === 0) {
    return getTrendingRecommendations(userId, limit);
  }

  // Collect favorite genres and authors
  const genreScores: Record<string, number> = {};
  const favoriteAuthors: Set<string> = new Set();

  for (const book of likedBooks) {
    try {
      const genres: string[] = JSON.parse(book.genres || '[]');
      const authors: string[] = JSON.parse(book.authors || '[]');

      genres.forEach(g => {
        genreScores[g] = (genreScores[g] || 0) + book.rating;
      });
      authors.forEach(a => favoriteAuthors.add(a));
    } catch { /* ignore */ }
  }

  const topGenres = Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);

  // Find books in those genres not already in library
  const userBookIds = new Set(
    (db.prepare('SELECT book_id FROM user_books WHERE user_id = ?').all(userId) as { book_id: number }[])
      .map(r => r.book_id)
  );

  const recommendations: Recommendation[] = [];

  // Try to find from local DB first
  for (const genre of topGenres) {
    const localBooks = db.prepare(`
      SELECT * FROM books
      WHERE genres LIKE ? AND id NOT IN (
        SELECT book_id FROM user_books WHERE user_id = ?
      )
      ORDER BY average_rating DESC
      LIMIT 5
    `).all(`%${genre}%`, userId) as Book[];

    for (const book of localBooks) {
      if (!recommendations.some(r => r.book.id === book.id)) {
        recommendations.push({
          book,
          source: 'history',
          reason: `Because you love ${genre} · ${book.average_rating.toFixed(1)} ★`,
          score: book.average_rating + (favoriteAuthors.has(JSON.parse(book.authors || '[]')[0]) ? 2 : 0),
        });
      }
    }
  }

  // If we need more, fetch from Google Books API
  if (recommendations.length < limit && topGenres.length > 0) {
    try {
      const apiBooks = await searchBooks(`subject:${topGenres[0]}`, 20);
      for (const apiBook of apiBooks) {
        if (recommendations.length >= limit) break;
        if (userBookIds.has(apiBook.id as unknown as number)) continue;

        // Upsert to local DB
        db.prepare(`
          INSERT OR IGNORE INTO books (google_books_id, title, authors, cover_url, genres, description, published_year, average_rating, ratings_count, page_count, isbn)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          apiBook.id,
          apiBook.title,
          JSON.stringify(apiBook.authors),
          apiBook.coverUrl,
          JSON.stringify(apiBook.genres),
          apiBook.description,
          apiBook.publishedYear,
          apiBook.averageRating,
          apiBook.ratingsCount,
          apiBook.pageCount,
          apiBook.isbn,
        );

        const localBook = db.prepare('SELECT * FROM books WHERE google_books_id = ?').get(apiBook.id) as Book;
        if (localBook && !recommendations.some(r => r.book.id === localBook.id)) {
          recommendations.push({
            book: localBook,
            source: 'history',
            reason: `Based on your love of ${topGenres[0]}`,
            score: localBook.average_rating,
          });
        }
      }
    } catch { /* fallback to local results */ }
  }

  return recommendations.slice(0, limit);
}

export async function getSocialRecommendations(limit = 10): Promise<Recommendation[]> {
  // Simulate social/Goodreads-style recommendations based on popular books among all users
  const socialBooks = db.prepare(`
    SELECT b.*, COUNT(ub.user_id) as readers, AVG(ub.rating) as avg_user_rating
    FROM books b
    JOIN user_books ub ON b.id = ub.book_id
    WHERE ub.status = 'read' AND ub.rating >= 4
    GROUP BY b.id
    HAVING readers >= 1
    ORDER BY avg_user_rating DESC, readers DESC
    LIMIT ?
  `).all(limit) as (Book & { readers: number; avg_user_rating: number })[];

  if (socialBooks.length > 0) {
    return socialBooks.map(book => ({
      book,
      source: 'social' as const,
      reason: `Loved by ${book.readers} readers on ReadWise · ${(book.avg_user_rating || 0).toFixed(1)} ★ avg community rating`,
      score: (book.avg_user_rating || 0) * book.readers,
    }));
  }

  // Fallback to top-rated books from catalog
  const fallback = db.prepare(`
    SELECT * FROM books ORDER BY average_rating DESC LIMIT ?
  `).all(limit) as Book[];

  return fallback.map(book => ({
    book,
    source: 'social' as const,
    reason: `Highly recommended by the reading community · ${book.average_rating.toFixed(1)} ★`,
    score: book.average_rating,
  }));
}
