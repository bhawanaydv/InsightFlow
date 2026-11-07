import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.email('Enter a valid email address').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required').max(72),
});

export const projectSchema = z.object({ name: z.string().trim().min(1).max(80) });
