import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './database';
import authRouter from './routes/auth';
import booksRouter from './routes/books';
import libraryRouter from './routes/library';
import recommendationsRouter from './routes/recommendations';
import goalsRouter from './routes/goals';
import statsRouter from './routes/stats';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'readwise-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/library', libraryRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/stats', statsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`
  🚀 ReadWise API Server running on http://localhost:${PORT}

  📖 Endpoints:
     Auth:            /api/auth/*
     Books:           /api/books/*
     Library:         /api/library/*
     Recommendations: /api/recommendations/*
     Goals:           /api/goals/*
     Stats:           /api/stats/*

  ${process.env.GOOGLE_CLIENT_ID ? '✅ Google OAuth configured' : '⚠️  Google OAuth not configured (demo mode available)'}
  ${process.env.GOOGLE_BOOKS_API_KEY ? '✅ Google Books API configured' : '⚠️  Google Books API not configured (using local catalog)'}
  `);
});

export default app;
