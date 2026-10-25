import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(10),
  serverId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const ticketMessageSchema = z.object({
  message: z.string().min(1),
});

export const updateTicketSchema = z.object({
  status: z.enum(['open', 'answered', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});
