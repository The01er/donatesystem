import { z } from 'zod';

export interface RouteParams {
  id: string;
  [key: string]: string;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  email: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  serverId: z.string().optional(),
  gameType: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional().pipe(z.coerce.date().optional()),
  to: z.string().optional().pipe(z.coerce.date().optional()),
});

export const cursorPaginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  serverId: z.string().optional(),
  gameType: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional().pipe(z.coerce.date().optional()),
  to: z.string().optional().pipe(z.coerce.date().optional()),
});

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function paginatedResponse<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
