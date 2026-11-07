import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { HttpError } from '../utils/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: error.issues[0]?.message ?? 'Please check your input.' });
    return;
  }
  if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
    const limitMb = Math.max(1, Number(process.env.MAX_UPLOAD_MB ?? 25));
    res.status(413).json({ error: `This file is larger than the ${limitMb} MB upload limit.` });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if ((error as { code?: string }).code === 'P2002') {
    res.status(409).json({ error: 'An account with that email already exists.' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
};
