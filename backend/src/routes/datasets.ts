import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../utils/http-error.js';
import { parseDataset, validateUpload } from '../services/dataset-parser.js';

export const datasetsRouter = Router();
datasetsRouter.use(authenticate);
const uploadLimit = Math.max(1, Number(process.env.MAX_UPLOAD_MB ?? 25)) * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: uploadLimit, files: 1 } });
const uploadDir = () => path.resolve(process.env.UPLOAD_DIR ?? './uploads');

datasetsRouter.post('/projects/:projectId/datasets', upload.single('file'), async (req, res) => {
  const projectId = req.params.projectId as string;
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! }, select: { id: true } });
  if (!project) throw new HttpError(404, 'Project not found.');
  if (!req.file) throw new HttpError(400, 'Choose a CSV or XLSX file to upload.');
  const parsed = await validateUpload(req.file.buffer, req.file.originalname, req.file.mimetype, uploadLimit);
  const extension = path.extname(req.file.originalname).toLowerCase();
  const storedFilename = `${randomUUID()}${extension}`;
  await mkdir(uploadDir(), { recursive: true });
  const storedPath = path.join(uploadDir(), storedFilename);
  await writeFile(storedPath, req.file.buffer, { flag: 'wx' });
  try {
    const dataset = await prisma.dataset.create({
      data: {
        projectId: project.id, originalFilename: path.basename(req.file.originalname), storedFilename,
        mimeType: req.file.mimetype, sizeBytes: req.file.size, rowCount: parsed.rows.length, columnCount: parsed.columns.length,
        columns: parsed.columns, detectedTypes: parsed.detectedTypes,
      },
      select: { id: true, projectId: true, originalFilename: true, mimeType: true, sizeBytes: true, rowCount: true, columnCount: true, columns: true, detectedTypes: true, createdAt: true },
    });
    res.status(201).json({ dataset });
  } catch (error) {
    await unlink(storedPath).catch(() => undefined);
    throw error;
  }
});

datasetsRouter.get('/datasets/:datasetId/preview', async (req, res) => {
  const datasetId = req.params.datasetId as string;
  const dataset = await prisma.dataset.findFirst({ where: { id: datasetId, project: { userId: req.userId! } }, select: { id: true, storedFilename: true, originalFilename: true, projectId: true, mimeType: true, sizeBytes: true, rowCount: true, columnCount: true, columns: true, detectedTypes: true, createdAt: true } });
  if (!dataset) throw new HttpError(404, 'Dataset not found.');
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.pageSize ?? '25'), 10) || 25));
  const buffer = await readFile(path.join(uploadDir(), dataset.storedFilename)).catch(() => { throw new HttpError(404, 'The uploaded file is no longer available.'); });
  const parsed = await parseDataset(buffer, dataset.originalFilename);
  const start = (page - 1) * pageSize;
  res.json({ dataset: { id: dataset.id, originalFilename: dataset.originalFilename, projectId: dataset.projectId, mimeType: dataset.mimeType, sizeBytes: dataset.sizeBytes, rowCount: dataset.rowCount, columnCount: dataset.columnCount, columns: dataset.columns, detectedTypes: dataset.detectedTypes, createdAt: dataset.createdAt }, rows: parsed.rows.slice(start, start + pageSize), page, pageSize, totalPages: Math.max(1, Math.ceil(dataset.rowCount / pageSize)) });
});
