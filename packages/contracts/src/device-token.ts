import { z } from "zod";

export const deviceTokenSchema = z.string().min(1).max(4096);

/** Older clients send an empty token when push registration is unavailable. */
export const optionalDeviceTokenSchema = z
  .union([deviceTokenSchema, z.literal("")])
  .optional()
  .transform((token) => token || undefined);
