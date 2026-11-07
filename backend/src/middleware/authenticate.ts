import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/http-error.js';

declare global {
  namespace Express {
    interface Request { userId?: string }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Please sign in to continue.'));
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return next(new HttpError(500, 'Authentication is not configured.'));
  try {
    const payload = jwt.verify(header.slice(7), secret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('Invalid token');
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, 'Your session has expired. Please sign in again.'));
  }
}
