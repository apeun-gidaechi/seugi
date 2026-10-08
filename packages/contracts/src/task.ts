import { z } from "zod";

// Android's Gson LocalDateTimeTypeAdapter serializes six fractional digits
// without a timezone suffix. Accept that native wire format alongside ISO
// instants/offsets used by the TypeScript clients.
const localTaskDateTimeSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-([0-3]\d)T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?$/)
  .refine((value) => {
    const [datePart, timePart] = value.split("T");
    const [year, month, day] = (datePart ?? "").split("-").map(Number);
    const [hour, minute, second] = (timePart ?? "").split(/[.:]/).map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year ?? 0, (month ?? 1) - 1, day ?? 0);
    date.setUTCHours(hour ?? 0, minute ?? 0, second ?? 0, 0);
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === (month ?? 1) - 1 &&
      date.getUTCDate() === day
    );
  }, "Invalid local date-time");

const taskDueDateSchema = z.union([z.string().datetime({ offset: true }), localTaskDateTimeSchema]);

/** Shared request contract for creating a workspace task. `content` is kept
 * as an alias for clients that adopted the early TypeScript API. */
export const createTaskSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  dueDate: taskDueDateSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
