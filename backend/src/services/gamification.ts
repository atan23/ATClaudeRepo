import db from '../database';

export function calculateLevel(points: number): number {
  // Level thresholds: 1(0), 2(100), 3(250), 4(500), 5(1000), 6(2000), 7(4000), 8(8000), 9(15000), 10(30000)
  const thresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (points >= thresholds[i]) {
      level = i + 1;
    }
  }
  return level;
}

export function getNextLevelThreshold(level: number): number {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000];
  return thresholds[level] || 30000;
}

export function getLevelName(level: number): string {
  const names = ['', 'Curious Reader', 'Book Explorer', 'Avid Reader', 'Literature Lover', 'Bookworm', 'Bibliophile', 'Book Sage', 'Literary Master', 'Grand Scholar', 'Legendary Reader'];
  return names[level] || 'Legendary Reader';
}

export function addPoints(userId: number, points: number, reason: string): void {
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, userId);

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number };
  if (user) {
    const newLevel = calculateLevel(user.points);
    db.prepare('UPDATE users SET level = ? WHERE id = ?').run(newLevel, userId);
  }
}

export function checkAndAwardBadges(userId: number): string[] {
  const newBadges: string[] = [];

  // Get user stats
  const booksRead = (db.prepare(`
    SELECT COUNT(*) as count FROM user_books WHERE user_id = ? AND status = 'read'
  `).get(userId) as { count: number }).count;

  const reviewsWritten = (db.prepare(`
    SELECT COUNT(*) as count FROM user_books WHERE user_id = ? AND review IS NOT NULL AND review != ''
  `).get(userId) as { count: number }).count;

  const genresRead = (db.prepare(`
    SELECT b.genres FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = ? AND ub.status = 'read'
  `).all(userId) as { genres: string }[]);

  const uniqueGenres = new Set<string>();
  for (const row of genresRead) {
    try {
      const genres: string[] = JSON.parse(row.genres || '[]');
      genres.forEach(g => uniqueGenres.add(g));
    } catch { /* ignore */ }
  }

  const goalsCreated = (db.prepare(`
    SELECT COUNT(*) as count FROM reading_goals WHERE user_id = ?
  `).get(userId) as { count: number }).count;

  const user = db.prepare('SELECT streak_days FROM users WHERE id = ?').get(userId) as { streak_days: number };
  const streakDays = user?.streak_days || 0;

  // Check if user has kindle import
  const kindleImport = (db.prepare(`
    SELECT COUNT(*) as count FROM user_books WHERE user_id = ? AND source = 'kindle'
  `).get(userId) as { count: number }).count;

  const goodreadsImport = (db.prepare(`
    SELECT COUNT(*) as count FROM user_books WHERE user_id = ? AND source = 'goodreads'
  `).get(userId) as { count: number }).count;

  // Get all badges and check criteria
  const allBadges = db.prepare('SELECT * FROM badges').all() as Array<{
    id: number;
    name: string;
    criteria_type: string;
    criteria_value: number;
    points_reward: number;
  }>;

  const earnedBadgeIds = new Set(
    (db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId) as { badge_id: number }[])
      .map(r => r.badge_id)
  );

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    let earned = false;
    switch (badge.criteria_type) {
      case 'books_read': earned = booksRead >= badge.criteria_value; break;
      case 'genres_read': earned = uniqueGenres.size >= badge.criteria_value; break;
      case 'reviews_written': earned = reviewsWritten >= badge.criteria_value; break;
      case 'goals_created': earned = goalsCreated >= badge.criteria_value; break;
      case 'streak_days': earned = streakDays >= badge.criteria_value; break;
      case 'kindle_import': earned = kindleImport >= badge.criteria_value; break;
      case 'goodreads_import': earned = goodreadsImport >= badge.criteria_value; break;
    }

    if (earned) {
      db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badge.id);
      addPoints(userId, badge.points_reward, `Badge earned: ${badge.name}`);
      newBadges.push(badge.name);
    }
  }

  return newBadges;
}

export function checkGoalCompletion(userId: number): void {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const yearlyGoal = db.prepare(`
    SELECT rg.*, (
      SELECT COUNT(*) FROM user_books ub
      WHERE ub.user_id = rg.user_id AND ub.status = 'read'
      AND strftime('%Y', ub.finished_at) = ?
    ) as progress
    FROM reading_goals rg
    WHERE rg.user_id = ? AND rg.type = 'yearly' AND rg.year = ?
  `).get(String(year), userId, year) as { id: number; target: number; progress: number } | undefined;

  if (yearlyGoal && yearlyGoal.progress >= yearlyGoal.target) {
    const alreadyRewarded = (db.prepare(`
      SELECT COUNT(*) as count FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ? AND b.criteria_type = 'goals_completed'
    `).get(userId) as { count: number }).count;

    if (alreadyRewarded === 0) {
      addPoints(userId, 50, 'Goal completed');
      checkAndAwardBadges(userId);
    }
  }
}

export function updateReadingStreak(userId: number): void {
  const user = db.prepare('SELECT streak_days, last_read_date FROM users WHERE id = ?').get(userId) as {
    streak_days: number;
    last_read_date: string | null;
  };

  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (user.last_read_date === today) return;

  let newStreak = user.streak_days;
  if (user.last_read_date === yesterday) {
    newStreak += 1;
  } else if (user.last_read_date !== today) {
    newStreak = 1;
  }

  db.prepare('UPDATE users SET streak_days = ?, last_read_date = ? WHERE id = ?').run(newStreak, today, userId);
}
