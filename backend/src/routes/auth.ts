import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginSchema, registerSchema } from '../validators/auth.js';
import { HttpError } from '../utils/http-error.js';

export const authRouter = Router();

function tokenFor(user: { id: string; email: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new HttpError(500, 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters.');
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign({ email: user.email }, secret, { subject: user.id, expiresIn });
}

const publicUser = (user: { id: string; name: string; email: string; createdAt: Date }) => ({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });

authRouter.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, 'An account with that email already exists.');
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash } });
  res.status(201).json({ user: publicUser(user), token: tokenFor(user) });
});

authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect.');
  res.json({ user: publicUser(user), token: tokenFor(user) });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { id: true, name: true, email: true, createdAt: true } });
  if (!user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  res.json({ user });
});
