import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../database';
import { generateToken, requireAuth } from '../middleware/auth';
import { checkAndAwardBadges, addPoints } from '../services/gamification';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  passport.use(new GoogleStrategy({
    clientID: googleClientId,
    clientSecret: googleClientSecret,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      const avatar = profile.photos?.[0]?.value;
      const googleId = profile.id;

      if (!email) return done(new Error('No email from Google'));

      let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(googleId, email) as Express.User & { google_id?: string } | undefined;

      if (!user) {
        db.prepare('INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)').run(googleId, email, name, avatar);
        user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId) as typeof user;
      } else {
        db.prepare('UPDATE users SET google_id = ?, name = ?, avatar = ? WHERE id = ?').run(googleId, name, avatar, user.id);
      }

      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  }));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

router.get('/google', (req: Request, res: Response, next) => {
  if (!googleClientId || !googleClientSecret) {
    res.status(501).json({ error: 'Google OAuth not configured.' });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req: Request, res: Response, next) => {
  passport.authenticate('google', { session: false }, (err: Error | null, user: Express.User | null) => {
    if (err || !user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
      return;
    }
    const token = generateToken(user.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  })(req, res, next);
});

router.post('/demo', (_req: Request, res: Response) => {
  let demoUser = db.prepare('SELECT * FROM users WHERE email = ?').get('demo@readwise.app') as Express.User | undefined;

  if (!demoUser) {
    db.prepare(`
      INSERT INTO users (email, name, avatar, points, level, streak_days)
      VALUES ('demo@readwise.app', 'Alex Reader', 'https://api.dicebear.com/7.x/avataaars/svg?seed=readwise', 385, 4, 7)
    `).run();
    demoUser = db.prepare('SELECT * FROM users WHERE email = ?').get('demo@readwise.app') as Express.User | undefined;
    if (demoUser) seedDemoData(demoUser.id);
  }

  if (!demoUser) {
    res.status(500).json({ error: 'Failed to create demo user' });
    return;
  }

  const token = generateToken(demoUser.id);
  res.json({ token, user: demoUser });
});

function seedDemoData(userId: number): void {
  const books = db.prepare('SELECT * FROM books ORDER BY average_rating DESC').all() as Array<{ id: number }>;
  if (books.length === 0) return;

  const statuses = ['read', 'read', 'read', 'read', 'reading', 'want_to_read', 'read', 'read', 'want_to_read'];
  const ratings = [5, 4, 5, 4, null, null, 3, 4, null];
  const reviews = [
    'Absolutely life-changing! Changed how I think about habits.',
    'Incredible sci-fi that had me hooked from page one.',
    null, 'Beautiful writing, loved the story.', null, null,
    'Good but not great for me.', 'A gripping read, highly recommend!', null,
  ];
  const sources = ['kindle', 'manual', 'goodreads', 'manual', 'manual', 'manual', 'kindle', 'goodreads', 'manual'];
  const finishedDates = ['2024-02-15', '2024-01-20', '2023-12-10', '2024-03-01', null, null, '2023-11-05', '2024-02-28', null];

  for (let i = 0; i < Math.min(books.length, 9); i++) {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO user_books (user_id, book_id, status, rating, review, source, finished_at, started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, books[i].id, statuses[i], ratings[i], reviews[i], sources[i], finishedDates[i], statuses[i] === 'reading' ? '2024-03-10' : finishedDates[i]);
    } catch { /* ignore */ }
  }

  const year = new Date().getFullYear();
  db.prepare(`INSERT OR IGNORE INTO reading_goals (user_id, type, target, year) VALUES (?, 'yearly', 24, ?)`).run(userId, year);
  db.prepare(`INSERT OR IGNORE INTO reading_goals (user_id, type, target, year, month) VALUES (?, 'monthly', 2, ?, ?)`).run(userId, year, new Date().getMonth() + 1);

  addPoints(userId, 0, 'Demo setup');
  checkAndAwardBadges(userId);
}

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT id, email, name, avatar, points, level, streak_days, created_at FROM users WHERE id = ?
  `).get(req.userId) as (Express.User & { streak_days: number; created_at: string }) | undefined;

  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
