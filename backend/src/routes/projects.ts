import { Router } from 'express';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { projectSchema } from '../validators/auth.js';
import { HttpError } from '../utils/http-error.js';

export const projectsRouter = Router();
projectsRouter.use(authenticate);

projectsRouter.get('/', async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.userId! }, orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { datasets: true } }, datasets: { select: { id: true, originalFilename: true, rowCount: true, columnCount: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  res.json({ projects });
});

projectsRouter.post('/', async (req, res) => {
  const { name } = projectSchema.parse(req.body);
  const project = await prisma.project.create({ data: { name, userId: req.userId! }, include: { _count: { select: { datasets: true } }, datasets: true } });
  res.status(201).json({ project });
});

projectsRouter.get('/:projectId', async (req, res) => {
  const projectId = req.params.projectId as string;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.userId! },
    include: { datasets: { select: { id: true, projectId: true, originalFilename: true, mimeType: true, sizeBytes: true, rowCount: true, columnCount: true, columns: true, detectedTypes: true, createdAt: true }, orderBy: { createdAt: 'desc' } } },
  });
  if (!project) throw new HttpError(404, 'Project not found.');
  res.json({ project });
});

projectsRouter.patch('/:projectId', async (req, res) => {
  const projectId = req.params.projectId as string;
  const { name } = projectSchema.parse(req.body);
  const result = await prisma.project.updateMany({ where: { id: projectId, userId: req.userId! }, data: { name } });
  if (!result.count) throw new HttpError(404, 'Project not found.');
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! }, include: { _count: { select: { datasets: true } } } });
  res.json({ project });
});

projectsRouter.delete('/:projectId', async (req, res) => {
  const projectId = req.params.projectId as string;
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! }, select: { id: true, datasets: { select: { storedFilename: true } } } });
  if (!project) throw new HttpError(404, 'Project not found.');
  const result = await prisma.project.deleteMany({ where: { id: projectId, userId: req.userId! } });
  if (!result.count) throw new HttpError(404, 'Project not found.');
  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
  await Promise.all(project.datasets.map(({ storedFilename }) => unlink(path.join(uploadDir, storedFilename)).catch(() => undefined)));
  res.status(204).end();
});
