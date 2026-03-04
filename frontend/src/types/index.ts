export interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  points: number;
  level: number;
  streak_days: number;
  created_at?: string;
}

export interface Book {
  id: number;
  google_books_id?: string;
  title: string;
  authors: string; // JSON array as string
  cover_url?: string;
  genres: string; // JSON array as string
  description?: string;
  published_year?: number;
  average_rating?: number;
  ratings_count?: number;
  page_count?: number;
  isbn?: string;
}

export interface UserBook extends Book {
  book_id: number;
  user_id: number;
  status: 'want_to_read' | 'reading' | 'read';
  rating?: number;
  review?: string;
  started_at?: string;
  finished_at?: string;
  source: 'kindle' | 'goodreads' | 'manual' | 'import';
  created_at: string;
}

export interface ReadingGoal {
  id: number;
  user_id: number;
  type: 'yearly' | 'monthly';
  target: number;
  year: number;
  month?: number;
  progress: number;
  completed: boolean;
  created_at: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  points_reward: number;
  earned_at?: string;
}

export interface Recommendation {
  book: Book;
  source: 'trending' | 'history' | 'social';
  reason: string;
  score: number;
}

export interface Stats {
  reading: {
    totalRead: number;
    currentlyReading: number;
    wantToRead: number;
    booksThisYear: number;
    booksThisMonth: number;
    averageRating: number | null;
  };
  genres: Array<{ genre: string; count: number }>;
  sources: Array<{ source: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
  gamification: {
    points: number;
    level: number;
    levelName: string;
    streakDays: number;
    currentLevelThreshold: number;
    nextLevelThreshold: number;
    pointsToNextLevel: number;
    levelProgress: number;
  };
  badges: {
    earned: Badge[];
    total: number;
  };
}

export type SortOption = 'created_at' | 'title' | 'average_rating' | 'finished_at' | 'rating';
export type StatusFilter = 'all' | 'want_to_read' | 'reading' | 'read';
export type SourceFilter = 'all' | 'kindle' | 'goodreads' | 'manual' | 'import';
