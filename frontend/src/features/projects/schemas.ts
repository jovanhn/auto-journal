import { z } from 'zod';
import {
  CreateProjectBody,
  createProjectBodyNameMax,
} from '@/shared/api/generated/zod/projects/projects.zod';
import { CreateTaskBody, createTaskBodyTitleMax } from '@/shared/api/generated/zod/tasks/tasks.zod';

/**
 * Form schemas start from the contract's generated Zod schemas and are extended only for
 * UI-only concerns (here: trimming and human-friendly messages; limits come from the contract).
 */
export const createProjectFormSchema = CreateProjectBody.extend({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(createProjectBodyNameMax, `Name must be at most ${createProjectBodyNameMax} characters`),
});

export type CreateProjectFormInput = z.input<typeof createProjectFormSchema>;
export type CreateProjectFormValues = z.output<typeof createProjectFormSchema>;

export const createTaskFormSchema = CreateTaskBody.extend({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(createTaskBodyTitleMax, `Title must be at most ${createTaskBodyTitleMax} characters`),
});

export type CreateTaskFormInput = z.input<typeof createTaskFormSchema>;
export type CreateTaskFormValues = z.output<typeof createTaskFormSchema>;
