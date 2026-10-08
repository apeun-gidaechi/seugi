import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import type { ApiResponse } from "@seugi/contracts";

export const ok = <T>(message: string, data?: T): ApiResponse<T> =>
  data === undefined ? { message } : { message, data };

export const body = <T extends z.ZodTypeAny>(schema: T, request: FastifyRequest) =>
  schema.parse(request.body);

export const query = <T extends z.ZodTypeAny>(schema: T, request: FastifyRequest) =>
  schema.parse(request.query);
