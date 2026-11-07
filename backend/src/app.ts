import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { datasetsRouter } from './routes/datasets.js';
import { errorHandler } from './middleware/error-handler.js';

export const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', datasetsRouter);
app.use((_req, res) => res.status(404).json({ error: 'That endpoint does not exist.' }));
app.use(errorHandler);
