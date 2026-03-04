import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/readwise.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      last_read_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_books_id TEXT UNIQUE,
      title TEXT NOT NULL,
      authors TEXT NOT NULL DEFAULT '[]',
      cover_url TEXT,
      genres TEXT DEFAULT '[]',
      description TEXT,
      published_year INTEGER,
      average_rating REAL DEFAULT 0,
      ratings_count INTEGER DEFAULT 0,
      page_count INTEGER,
      isbn TEXT,
      language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id),
      status TEXT NOT NULL CHECK(status IN ('want_to_read', 'reading', 'read')) DEFAULT 'want_to_read',
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      review TEXT,
      started_at DATETIME,
      finished_at DATETIME,
      source TEXT DEFAULT 'manual' CHECK(source IN ('kindle', 'goodreads', 'manual', 'import')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    );

    CREATE TABLE IF NOT EXISTS reading_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('yearly', 'monthly')),
      target INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      criteria_type TEXT NOT NULL,
      criteria_value INTEGER NOT NULL,
      points_reward INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id INTEGER NOT NULL REFERENCES badges(id),
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS reading_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id),
      date TEXT NOT NULL,
      pages_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedBadges();
  seedSampleBooks();
}

function seedBadges(): void {
  const badgeCount = (db.prepare('SELECT COUNT(*) as count FROM badges').get() as { count: number }).count;
  if (badgeCount > 0) return;

  const badges = [
    { name: 'First Chapter', description: 'Read your very first book', icon: '📖', criteria_type: 'books_read', criteria_value: 1, points_reward: 10 },
    { name: 'Bookworm', description: 'Read 5 books', icon: '🐛', criteria_type: 'books_read', criteria_value: 5, points_reward: 25 },
    { name: 'Bibliophile', description: 'Read 25 books', icon: '📚', criteria_type: 'books_read', criteria_value: 25, points_reward: 75 },
    { name: 'Literary Scholar', description: 'Read 100 books', icon: '🎓', criteria_type: 'books_read', criteria_value: 100, points_reward: 200 },
    { name: 'Genre Explorer', description: 'Read books in 5 different genres', icon: '🗺️', criteria_type: 'genres_read', criteria_value: 5, points_reward: 50 },
    { name: 'Adventurous Reader', description: 'Read books in 10 different genres', icon: '🧭', criteria_type: 'genres_read', criteria_value: 10, points_reward: 100 },
    { name: 'Reviewer', description: 'Write 5 book reviews', icon: '✍️', criteria_type: 'reviews_written', criteria_value: 5, points_reward: 30 },
    { name: 'Critic', description: 'Write 20 book reviews', icon: '🖊️', criteria_type: 'reviews_written', criteria_value: 20, points_reward: 80 },
    { name: 'Goal Setter', description: 'Create your first reading goal', icon: '🎯', criteria_type: 'goals_created', criteria_value: 1, points_reward: 15 },
    { name: 'Goal Crusher', description: 'Complete a reading goal', icon: '🏆', criteria_type: 'goals_completed', criteria_value: 1, points_reward: 50 },
    { name: 'Speed Reader', description: 'Read 3 books in a single month', icon: '⚡', criteria_type: 'books_in_month', criteria_value: 3, points_reward: 40 },
    { name: 'Year Wrap', description: 'Read at least 12 books in a year', icon: '🎊', criteria_type: 'books_in_year', criteria_value: 12, points_reward: 100 },
    { name: 'Kindle Warrior', description: 'Import books from Kindle', icon: '📱', criteria_type: 'kindle_import', criteria_value: 1, points_reward: 20 },
    { name: 'Social Reader', description: 'Import books from Goodreads', icon: '🌐', criteria_type: 'goodreads_import', criteria_value: 1, points_reward: 20 },
    { name: 'Night Owl', description: 'Maintain a 7-day reading streak', icon: '🦉', criteria_type: 'streak_days', criteria_value: 7, points_reward: 35 },
    { name: 'Dedicated Reader', description: 'Maintain a 30-day reading streak', icon: '🌟', criteria_type: 'streak_days', criteria_value: 30, points_reward: 150 },
  ];

  const insert = db.prepare(
    'INSERT OR IGNORE INTO badges (name, description, icon, criteria_type, criteria_value, points_reward) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((items: typeof badges) => {
    for (const badge of items) {
      insert.run(badge.name, badge.description, badge.icon, badge.criteria_type, badge.criteria_value, badge.points_reward);
    }
  });

  insertMany(badges);
}

function seedSampleBooks(): void {
  const bookCount = (db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number }).count;
  if (bookCount > 0) return;

  const books = [
    {
      google_books_id: 'atomic_habits',
      title: 'Atomic Habits',
      authors: JSON.stringify(['James Clear']),
      cover_url: 'https://books.google.com/books/content?id=XfFvDwAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Self-Help', 'Psychology', 'Business']),
      description: 'A revolutionary system to get 1% better every day. James Clear shares how small habits can compound into extraordinary results.',
      published_year: 2018,
      average_rating: 4.8,
      ratings_count: 450000,
      page_count: 320,
      isbn: '9780735211292',
    },
    {
      google_books_id: 'project_hail_mary',
      title: 'Project Hail Mary',
      authors: JSON.stringify(['Andy Weir']),
      cover_url: 'https://books.google.com/books/content?id=6nA3EAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Science Fiction', 'Adventure', 'Space']),
      description: "Ryland Grace wakes up alone on a spacecraft with no memory of how he got there. He soon discovers he's on a mission to save Earth.",
      published_year: 2021,
      average_rating: 4.9,
      ratings_count: 380000,
      page_count: 476,
      isbn: '9780593135204',
    },
    {
      google_books_id: 'lessons_in_chemistry',
      title: 'Lessons in Chemistry',
      authors: JSON.stringify(['Bonnie Garmus']),
      cover_url: 'https://books.google.com/books/content?id=h0RCEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Historical Fiction', 'Humor', 'Women\'s Fiction']),
      description: 'Set in the 1960s, a female chemist becomes the star of a cooking show that teaches much more than just cooking.',
      published_year: 2022,
      average_rating: 4.5,
      ratings_count: 280000,
      page_count: 390,
      isbn: '9780385547345',
    },
    {
      google_books_id: 'tomorrow_tomorrow',
      title: 'Tomorrow, and Tomorrow, and Tomorrow',
      authors: JSON.stringify(['Gabrielle Zevin']),
      cover_url: 'https://books.google.com/books/content?id=TSpAEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Literary Fiction', 'Contemporary', 'Friendship']),
      description: 'A novel about love, creativity, and the power of play spanning thirty years of an unlikely friendship between two game designers.',
      published_year: 2022,
      average_rating: 4.4,
      ratings_count: 220000,
      page_count: 416,
      isbn: '9780593321201',
    },
    {
      google_books_id: 'fourth_wing',
      title: 'Fourth Wing',
      authors: JSON.stringify(['Rebecca Yarros']),
      cover_url: 'https://books.google.com/books/content?id=u82MEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Fantasy', 'Romance', 'Adventure']),
      description: 'Enter the Empyrean, where only the physically and mentally strong survive to become dragon riders.',
      published_year: 2023,
      average_rating: 4.6,
      ratings_count: 310000,
      page_count: 528,
      isbn: '9781649374042',
    },
    {
      google_books_id: 'happy_place',
      title: 'Happy Place',
      authors: JSON.stringify(['Emily Henry']),
      cover_url: 'https://books.google.com/books/content?id=gN9LEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Romance', 'Contemporary Fiction']),
      description: 'Two exes pretend to still be together during a final week at their beloved lakehouse with friends.',
      published_year: 2023,
      average_rating: 4.3,
      ratings_count: 180000,
      page_count: 400,
      isbn: '9780593441282',
    },
    {
      google_books_id: 'covenant_of_water',
      title: 'The Covenant of Water',
      authors: JSON.stringify(['Abraham Verghese']),
      cover_url: 'https://books.google.com/books/content?id=6MBJEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Historical Fiction', 'Literary Fiction', 'Family Saga']),
      description: 'A multigenerational saga spanning over sixty years, following a family in South India that is "blessed" with a peculiar affliction.',
      published_year: 2023,
      average_rating: 4.7,
      ratings_count: 120000,
      page_count: 736,
      isbn: '9780802162175',
    },
    {
      google_books_id: 'demon_copperhead',
      title: 'Demon Copperhead',
      authors: JSON.stringify(['Barbara Kingsolver']),
      cover_url: 'https://books.google.com/books/content?id=IHVTEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Literary Fiction', 'Historical Fiction']),
      description: 'A reimagining of David Copperfield set in Appalachian Virginia, following a boy born into poverty and addiction.',
      published_year: 2022,
      average_rating: 4.6,
      ratings_count: 95000,
      page_count: 560,
      isbn: '9780063251922',
    },
    {
      google_books_id: 'wager_grann',
      title: 'The Wager',
      authors: JSON.stringify(['David Grann']),
      cover_url: 'https://books.google.com/books/content?id=UGFVEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Non-Fiction', 'History', 'Adventure']),
      description: "In 1742, a vessel appeared off the coast of Brazil carrying 30 starving men who had survived a shipwreck and an astonishing ordeal.",
      published_year: 2023,
      average_rating: 4.5,
      ratings_count: 88000,
      page_count: 352,
      isbn: '9780385534260',
    },
    {
      google_books_id: 'hello_beautiful',
      title: 'Hello Beautiful',
      authors: JSON.stringify(['Ann Napolitano']),
      cover_url: 'https://books.google.com/books/content?id=pplCEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Literary Fiction', 'Family Saga', 'Historical Fiction']),
      description: 'A multigenerational saga spanning over a century and following four generations of a Chicago family.',
      published_year: 2023,
      average_rating: 4.2,
      ratings_count: 75000,
      page_count: 400,
      isbn: '9780593243732',
    },
    {
      google_books_id: 'the_midnight_library',
      title: 'The Midnight Library',
      authors: JSON.stringify(['Matt Haig']),
      cover_url: 'https://books.google.com/books/content?id=jxTiDwAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Fiction', 'Fantasy', 'Self-Help']),
      description: 'Between life and death there is a library where every book is a different life you could have lived.',
      published_year: 2020,
      average_rating: 4.3,
      ratings_count: 420000,
      page_count: 304,
      isbn: '9780525559474',
    },
    {
      google_books_id: 'spare_prince_harry',
      title: 'Spare',
      authors: JSON.stringify(['Prince Harry']),
      cover_url: 'https://books.google.com/books/content?id=3mJUEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Memoir', 'Biography', 'Non-Fiction']),
      description: 'Prince Harry tells his story for the first time, sharing intimate details of his life inside and outside the royal family.',
      published_year: 2023,
      average_rating: 3.9,
      ratings_count: 130000,
      page_count: 416,
      isbn: '9780593593806',
    },
    {
      google_books_id: 'sea_of_tranquility',
      title: 'Sea of Tranquility',
      authors: JSON.stringify(['Emily St. John Mandel']),
      cover_url: 'https://books.google.com/books/content?id=fA5XEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Science Fiction', 'Literary Fiction', 'Time Travel']),
      description: 'A time travel story that spans five centuries—from a British Columbia forest in 1912 to a moon colony in 2401.',
      published_year: 2022,
      average_rating: 4.2,
      ratings_count: 145000,
      page_count: 272,
      isbn: '9780593321447',
    },
    {
      google_books_id: 'power_of_now',
      title: 'The Power of Now',
      authors: JSON.stringify(['Eckhart Tolle']),
      cover_url: 'https://books.google.com/books/content?id=CIfIqWnLDRQC&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Spirituality', 'Self-Help', 'Philosophy']),
      description: 'A guide to spiritual enlightenment that teaches the value of living in the present moment.',
      published_year: 1997,
      average_rating: 4.4,
      ratings_count: 380000,
      page_count: 236,
      isbn: '9781577314806',
    },
    {
      google_books_id: 'night_circus',
      title: 'The Night Circus',
      authors: JSON.stringify(['Erin Morgenstern']),
      cover_url: 'https://books.google.com/books/content?id=B_PbhuF5hg4C&printsec=frontcover&img=1&zoom=1',
      genres: JSON.stringify(['Fantasy', 'Romance', 'Historical Fiction']),
      description: 'A mysterious circus that only appears at night becomes the backdrop for an epic battle between two young magicians.',
      published_year: 2011,
      average_rating: 4.3,
      ratings_count: 520000,
      page_count: 387,
      isbn: '9780307744432',
    },
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO books
    (google_books_id, title, authors, cover_url, genres, description, published_year, average_rating, ratings_count, page_count, isbn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: typeof books) => {
    for (const book of items) {
      insert.run(
        book.google_books_id,
        book.title,
        book.authors,
        book.cover_url,
        book.genres,
        book.description,
        book.published_year,
        book.average_rating,
        book.ratings_count,
        book.page_count,
        book.isbn
      );
    }
  });

  insertMany(books);
}

export default db;
