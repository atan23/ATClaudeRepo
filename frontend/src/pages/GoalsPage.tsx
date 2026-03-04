import { useState, useEffect, useCallback } from 'react';
import { Target, Plus, Trophy, Star, Flame, Zap, X, Award } from 'lucide-react';
import { goalsApi, statsApi } from '../api';
import { ReadingGoal, Stats, Badge } from '../types';
import GoalCard from '../components/GoalCard';
import BadgeCard from '../components/BadgeCard';
import { getLevelName } from '../utils/level';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALL_BADGE_DEFINITIONS: Partial<Badge>[] = [
  { name: 'First Chapter', icon: '📖', description: 'Read your very first book', criteria_type: 'books_read', criteria_value: 1, points_reward: 10 },
  { name: 'Bookworm', icon: '🐛', description: 'Read 5 books', criteria_type: 'books_read', criteria_value: 5, points_reward: 25 },
  { name: 'Bibliophile', icon: '📚', description: 'Read 25 books', criteria_type: 'books_read', criteria_value: 25, points_reward: 75 },
  { name: 'Literary Scholar', icon: '🎓', description: 'Read 100 books', criteria_type: 'books_read', criteria_value: 100, points_reward: 200 },
  { name: 'Genre Explorer', icon: '🗺️', description: 'Read books in 5 different genres', criteria_type: 'genres_read', criteria_value: 5, points_reward: 50 },
  { name: 'Adventurous Reader', icon: '🧭', description: 'Read books in 10 different genres', criteria_type: 'genres_read', criteria_value: 10, points_reward: 100 },
  { name: 'Reviewer', icon: '✍️', description: 'Write 5 book reviews', criteria_type: 'reviews_written', criteria_value: 5, points_reward: 30 },
  { name: 'Critic', icon: '🖊️', description: 'Write 20 book reviews', criteria_type: 'reviews_written', criteria_value: 20, points_reward: 80 },
  { name: 'Goal Setter', icon: '🎯', description: 'Create your first reading goal', criteria_type: 'goals_created', criteria_value: 1, points_reward: 15 },
  { name: 'Goal Crusher', icon: '🏆', description: 'Complete a reading goal', criteria_type: 'goals_completed', criteria_value: 1, points_reward: 50 },
  { name: 'Speed Reader', icon: '⚡', description: 'Read 3 books in a single month', criteria_type: 'books_in_month', criteria_value: 3, points_reward: 40 },
  { name: 'Year Wrap', icon: '🎊', description: 'Read at least 12 books in a year', criteria_type: 'books_in_year', criteria_value: 12, points_reward: 100 },
  { name: 'Kindle Warrior', icon: '📱', description: 'Import books from Kindle', criteria_type: 'kindle_import', criteria_value: 1, points_reward: 20 },
  { name: 'Social Reader', icon: '🌐', description: 'Import books from Goodreads', criteria_type: 'goodreads_import', criteria_value: 1, points_reward: 20 },
  { name: 'Night Owl', icon: '🦉', description: 'Maintain a 7-day reading streak', criteria_type: 'streak_days', criteria_value: 7, points_reward: 35 },
  { name: 'Dedicated Reader', icon: '🌟', description: 'Maintain a 30-day reading streak', criteria_type: 'streak_days', criteria_value: 30, points_reward: 150 },
];

interface NewGoalForm {
  type: 'yearly' | 'monthly';
  target: number;
  year: number;
  month: number;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<NewGoalForm>({
    type: 'yearly',
    target: 24,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [saving, setSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{
    id: number; name: string; avatar: string; points: number; level: number; books_read: number;
  }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, statsRes, lbRes] = await Promise.all([
        goalsApi.getGoals(),
        statsApi.getStats(),
        statsApi.getLeaderboard(),
      ]);
      setGoals(goalsRes.data);
      setStats(statsRes.data);
      setLeaderboard(lbRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateGoal = async () => {
    setSaving(true);
    try {
      await goalsApi.createGoal({
        type: newGoal.type,
        target: newGoal.target,
        year: newGoal.year,
        month: newGoal.type === 'monthly' ? newGoal.month : undefined,
      });
      setShowAddGoal(false);
      load();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Failed to create goal');
    }
    setSaving(false);
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await goalsApi.deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch { /* ignore */ }
  };

  const earnedBadgeNames = new Set(stats?.badges.earned.map(b => b.name) || []);
  const earnedBadgeMap = new Map(stats?.badges.earned.map(b => [b.name, b]) || []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target size={24} className="text-amber-500" />
            Goals & Achievements
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Track your reading goals and earn badges</p>
        </div>
        <button
          onClick={() => setShowAddGoal(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} />
          New Goal
        </button>
      </div>

      {/* XP / Level card */}
      {stats && (
        <div className="card p-5 bg-gradient-to-r from-indigo-900 to-blue-900 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-300 text-xs uppercase tracking-wider mb-1">Your Progress</p>
              <h2 className="text-2xl font-bold">
                Level {stats.gamification.level} · {getLevelName(stats.gamification.level)}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{stats.gamification.points.toLocaleString()}</p>
              <p className="text-blue-300 text-sm">total points</p>
            </div>
          </div>

          <div className="w-full bg-white/20 rounded-full h-3 mb-1.5">
            <div
              className="bg-amber-400 h-3 rounded-full transition-all duration-700"
              style={{ width: `${stats.gamification.levelProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-blue-300">
            <span>{stats.gamification.pointsToNextLevel} pts to level {stats.gamification.level + 1}</span>
            <span>{stats.gamification.levelProgress}% complete</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/10">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                <Trophy size={16} />
                <span className="font-bold text-lg">{stats.badges.earned.length}</span>
              </div>
              <p className="text-blue-300 text-xs">Badges Earned</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                <Flame size={16} />
                <span className="font-bold text-lg">{stats.gamification.streakDays}</span>
              </div>
              <p className="text-blue-300 text-xs">Day Streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                <Star size={16} />
                <span className="font-bold text-lg">{stats.reading.totalRead}</span>
              </div>
              <p className="text-blue-300 text-xs">Books Read</p>
            </div>
          </div>
        </div>
      )}

      {/* Points guide */}
      <div>
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Zap size={18} className="text-amber-500" />
          How to Earn Points
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { action: 'Add a book', points: '+5 pts', icon: '📖' },
            { action: 'Finish a book', points: '+20 pts', icon: '✅' },
            { action: 'Rate a book', points: '+5 pts', icon: '⭐' },
            { action: 'Write a review', points: '+10 pts', icon: '✍️' },
            { action: 'Complete a goal', points: '+50 pts', icon: '🏆' },
            { action: '7-day streak', points: '+35 pts', icon: '🔥' },
            { action: 'Import Kindle', points: '+20 pts', icon: '📱' },
            { action: 'Earn a badge', points: 'varies', icon: '🎖️' },
          ].map(item => (
            <div key={item.action} className="card p-3 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-xs font-medium text-slate-700">{item.action}</p>
              <p className="text-xs font-bold text-amber-600 mt-0.5">{item.points}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reading Goals */}
      <div>
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Target size={18} className="text-blue-600" />
          Reading Goals
          <span className="badge bg-blue-100 text-blue-700">{goals.length}</span>
        </h2>

        {goals.length === 0 ? (
          <div className="card p-8 text-center">
            <Target size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="font-medium text-slate-600 mb-1">No goals yet</p>
            <p className="text-slate-400 text-sm mb-4">Set a reading goal to stay motivated</p>
            <button onClick={() => setShowAddGoal(true)} className="btn-primary text-sm inline-flex items-center gap-2">
              <Plus size={15} /> Set Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      <div>
        <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Award size={18} className="text-amber-500" />
          Badges
        </h2>
        <p className="text-sm text-slate-500 mb-3">
          {earnedBadgeNames.size} of {ALL_BADGE_DEFINITIONS.length} badges earned
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {ALL_BADGE_DEFINITIONS.map((badge, i) => {
            const earned = earnedBadgeNames.has(badge.name || '');
            const earnedBadge = earnedBadgeMap.get(badge.name || '');
            return (
              <BadgeCard
                key={i}
                badge={badge as Badge}
                earned={earned}
                earnedAt={earnedBadge?.earned_at}
              />
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 1 && (
        <div>
          <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            Leaderboard
          </h2>
          <div className="card divide-y divide-slate-100">
            {leaderboard.map((user, i) => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-amber-400 text-white' :
                  i === 1 ? 'bg-slate-400 text-white' :
                  i === 2 ? 'bg-amber-700 text-white' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </div>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500">Level {user.level} · {user.books_read} books read</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-amber-600">{user.points.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800">New Reading Goal</h2>
              <button onClick={() => setShowAddGoal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Goal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['yearly', 'monthly'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewGoal(g => ({ ...g, type: t }))}
                      className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                        newGoal.type === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {t === 'yearly' ? '📅 Yearly' : '📆 Monthly'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                <select
                  value={newGoal.year}
                  onChange={e => setNewGoal(g => ({ ...g, year: Number(e.target.value) }))}
                  className="input"
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {newGoal.type === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
                  <select
                    value={newGoal.month}
                    onChange={e => setNewGoal(g => ({ ...g, month: Number(e.target.value) }))}
                    className="input"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Books to Read: <span className="text-blue-600 font-bold">{newGoal.target}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={newGoal.type === 'monthly' ? 20 : 100}
                  value={newGoal.target}
                  onChange={e => setNewGoal(g => ({ ...g, target: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1</span>
                  <span>{newGoal.type === 'monthly' ? 20 : 100}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddGoal(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleCreateGoal}
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</>
                  ) : (
                    <><Plus size={15} />Create Goal</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
