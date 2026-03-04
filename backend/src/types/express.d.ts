// Augment Express Request with our custom userId field
declare namespace Express {
  interface Request {
    userId?: number;
  }
  interface User {
    id: number;
    email: string;
    name: string;
    avatar?: string;
    points: number;
    level: number;
  }
}
