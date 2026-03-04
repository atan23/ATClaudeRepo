import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret) as { userId: number };
    req.userId = decoded.userId;

    const user = db.prepare('SELECT id, email, name, avatar, points, level FROM users WHERE id = ?').get(decoded.userId) as Express.User | undefined;
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(userId: number): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
  return jwt.sign({ userId }, secret, { expiresIn: '30d' });
}
