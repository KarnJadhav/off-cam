import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  telegramChatId: z.string().optional(),
  preferences: z
    .object({
      batch: z.string().optional(),
      branch: z.string().optional(),
      roles: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
      experience: z.string().optional(),
      jobType: z.string().optional(),
      workMode: z.string().optional()
    })
    .optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const jobSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().min(1),
  salary: z.string().optional(),
  batch: z.array(z.string()).default([]),
  branch: z.array(z.string()).default([]),
  experience: z.string().default('Fresher'),
  deadline: z.string().datetime().optional().or(z.literal('')),
  applyLink: z.string().url(),
  description: z.string().min(10),
  tags: z.array(z.string()).default([]),
  jobType: z.enum(['Full-time', 'Internship']).default('Full-time'),
  workMode: z.enum(['Remote', 'Hybrid', 'On-site']).default('On-site'),
  isPremium: z.boolean().default(false),
  isActive: z.boolean().default(true)
});
