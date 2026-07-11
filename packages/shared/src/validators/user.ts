import { z } from 'zod';
import { ROLES } from '../constants/roles';
import { passwordSchema } from './auth';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: z.enum(ROLES),
  // Omit to auto-generate a temp password (owner/admin-created users); provided
  // explicitly only by the seed script.
  password: passwordSchema.optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
