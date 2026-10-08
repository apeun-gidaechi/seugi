import { z } from "zod";

export const createTimetableSchema = z.object({
  workspaceId: z.string().uuid(),
  grade: z.union([z.string(), z.number()]).transform(String),
  classNum: z.union([z.string(), z.number()]).transform(String),
  time: z.union([z.string(), z.number()]).transform(String),
  subject: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const updateTimetableSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().min(1).max(120),
});
export const mealDateQuerySchema = z.object({ workspaceId: z.string().uuid(), date: z.string() });
export const mealRangeQuerySchema = z
  .object({
    workspaceId: z.string().uuid(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .refine(
    (value) => (value.year === undefined) === (value.month === undefined),
    "year와 month를 함께 지정해야 합니다",
  );
export const monthScheduleQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
});
export const timetableQuerySchema = z
  .object({
    workspaceId: z.string().uuid(),
    grade: z
      .string()
      .regex(/^[1-9]\d*$/)
      .optional(),
    classNum: z
      .string()
      .regex(/^[1-9]\d*$/)
      .optional(),
  })
  .refine(
    (value) => (value.grade === undefined) === (value.classNum === undefined),
    "grade와 classNum을 함께 지정해야 합니다",
  );

export type CreateTimetableInput = z.input<typeof createTimetableSchema>;
export type UpdateTimetableInput = z.infer<typeof updateTimetableSchema>;
