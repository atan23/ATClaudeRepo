import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, TrendingUp, Target, Star, Flame, ChevronRight, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { statsApi, libraryApi, recommendationsApi } from '../api';
import { Stats, UserBook, Recommendation } from '../types';
import StatsCard from '../components/StatsCard';
import BookCard from '../components/BookCard';
import { getLevelName } from '../utils/level';

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentlyReading, setCurrentlyReading] = useState<UserBook[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, libraryRes, recsRes] = await Promise.all([
          statsApi.getStats(),
          libraryApi.getLibrary({ status: 'reading' }),
          recommendationsApi.getAll(),
        ]);
        setStats(statsRes.data);
        setCurrentlyReading(libraryRes.data.slice(0, 3));
        const all = [
          ...recsRes.data.history.slice(0, 2),
          ...recsRes.data.trending.slice(0, 2),
          ...recsRes.data.social.slice(0, 2),
        ];
        setRecommendations(all.slice(0, 4));
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const levelProgress = stats?.gamification.levelProgress || 0;

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {stats?.reading.booksThisYear
              ? `You've read ${stats.reading.booksThisYear} book${stats.reading.booksThisYear !== 1 ? 's' : ''} this year. Keep it up!`
              : 'Start tracking your reading journey today!'}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Books Read"
          value={stats?.reading.totalRead || 0}
          subtitle="all time"
          icon={BookOpen}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StatsCard
          title="This Year"
          value={stats?.reading.booksThisYear || 0}
          subtitle={`${new Date().getFullYear()} total`}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <StatsCard
          title="Reading Streak"
          value={`${user?.streak_days || stats?.gamification.streakDays || 0}d`}
          subtitle="current streak"
          icon={Flame}
          iconColor="text-orange-600"
          iconBg="bg-orange-100"
        />
        <StatsCard
          title="Avg Rating"
          value={stats?.reading.averageRating ? `${stats.reading.averageRating.toFixed(1)} ★` : '—'}
          subtitle="books rated"
          icon={Star}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
        />
      </div>

      {/* Level / XP card */}
      {stats && (
        <div className="card p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Your Level</p>
              <h3 className="text-xl font-bold">
                Level {stats.gamification.level} · {getLevelName(stats.gamification.level)}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{stats.gamification.points.toLocaleString()}</p>
              <p className="text-blue-200 text-xs">total points</p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div
              className="bg-white rounded-full h-2.5 transition-all duration-700"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-blue-200">
            <span>{stats.gamification.pointsToNextLevel} pts to next level</span>
            <span>{levelProgress}%</span>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Flame size={14} className="text-orange-300" />
              <span>{stats.gamification.streakDays} day streak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-amber-300" />
              <span>{stats.badges.earned.length} badges earned</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Currently reading */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" />
              Currently Reading
            </h2>
            <Link to="/library" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>

          {currentlyReading.length > 0 ? (
            <div className="space-y-3">
              {currentlyReading.map(book => (
                <CurrentlyReadingCard key={book.book_id} book={book} onUpdate={refreshUser} />
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center">
              <BookOpen size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No books in progress</p>
              <Link to="/library" className="text-blue-600 text-sm hover:underline">
                Start tracking a book →
              </Link>
            </div>
          )}
        </div>

        {/* Active goals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Target size={18} className="text-amber-500" />
              Reading Goals
            </h2>
            <Link to="/goals" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Manage <ChevronRight size={12} />
            </Link>
          </div>

          {stats?.reading.booksThisYear !== undefined ? (
            <GoalSummary stats={stats} />
          ) : (
            <div className="card p-6 text-center">
              <Target size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No goals set yet</p>
              <Link to="/goals" className="text-blue-600 text-sm hover:underline">
                Set a reading goal →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick recommendations */}
      {recommendations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600" />
              Recommended for You
            </h2>
            <Link to="/recommendations" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              See all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recommendations.map(rec => (
              <BookCard key={rec.book.id} book={rec.book} recommendation={{ reason: rec.reason }} />
            ))}
          </div>
        </div>
      )}

      {/* Genre breakdown */}
      {stats && stats.genres.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-800 mb-3">Your Reading Taste</h2>
          <div className="card p-4">
            <div className="space-y-2.5">
              {stats.genres.slice(0, 5).map(({ genre, count }) => {
                const max = stats.genres[0].count;
                return (
                  <div key={genre} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-32 truncate">{genre}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function CurrentlyReadingCard({ book, onUpdate }: { book: UserBook; onUpdate: () => void }) {
  const [marking, setMarking] = useState(false);

  const markDone = async () => {
    setMarking(true);
    try {
      await libraryApi.updateBook(book.book_id, { status: 'read' });
      onUpdate();
    } catch { /* ignore */ }
    setMarking(false);
  };

  const authors = (() => {
    try { return JSON.parse(book.authors).slice(0, 1).join(''); }
    catch { return book.authors; }
  })();

  return (
    <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-slate-100">
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-blue-100 flex items-center justify-center">
            <BookOpen size={16} className="text-blue-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800 truncate">{book.title}</p>
        <p className="text-xs text-slate-500 truncate">{authors}</p>
        <p className="text-xs text-blue-600 mt-0.5">📖 Reading now</p>
      </div>
      <button
        onClick={markDone}
        disabled={marking}
        className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded-lg transition-colors flex-shrink-0"
      >
        {marking ? '...' : 'Done ✓'}
      </button>
    </div>
  );
}

function GoalSummary({ stats }: { stats: Stats }) {
  const year = new Date().getFullYear();
  const booksRead = stats.reading.booksThisYear;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 font-medium">{year} Progress</span>
        <span className="font-bold text-slate-800">{booksRead} books read</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-blue-50 rounded-lg p-2.5">
          <p className="text-lg font-bold text-blue-700">{stats.reading.totalRead}</p>
          <p className="text-xs text-blue-600">Total Read</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-2.5">
          <p className="text-lg font-bold text-amber-700">{stats.reading.currentlyReading}</p>
          <p className="text-xs text-amber-600">In Progress</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-lg font-bold text-slate-700">{stats.reading.wantToRead}</p>
          <p className="text-xs text-slate-500">Want to Read</p>
        </div>
      </div>

      <Link to="/goals" className="block text-center text-xs text-blue-600 hover:underline">
        Set a yearly goal →
      </Link>
    </div>
  );
}
