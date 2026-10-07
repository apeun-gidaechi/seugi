import { z } from "zod";

/** Shared request contract for creating a workspace task. `content` is kept
 * as an alias for clients that adopted the early TypeScript API. */
export const createTaskSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
