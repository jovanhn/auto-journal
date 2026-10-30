import { createRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { authenticatedRoute } from '@/app/authenticatedRoute';
import { ProjectDetailPage } from './ProjectDetailPage';
import { ProjectsPage } from './ProjectsPage';

/** Pagination is URL-worthy state: it lives in search params, not Redux or useState. */
const paginationSearchSchema = z.object({
  page: z.number().int().min(0).default(0).catch(0),
  size: z.number().int().min(1).max(100).default(10).catch(10),
});

export const projectsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  validateSearch: paginationSearchSchema,
  component: ProjectsPage,
});

export const projectDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects/$projectId',
  validateSearch: paginationSearchSchema,
  component: ProjectDetailPage,
});
