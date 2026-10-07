/** Runtime-safe API route registry shared by servers and clients. */
import { chatApiSpec } from "./api/chat.js";
import { coreApiSpec } from "./api/core.js";
import { integrationApiSpec } from "./api/integrations.js";
import { memberApiSpec } from "./api/member.js";
import { notificationApiSpec } from "./api/notification.js";
import { profileApiSpec } from "./api/profile.js";
import { schoolApiSpec } from "./api/school.js";
import { taskApiSpec } from "./api/task.js";
import { workspaceApiSpec } from "./api/workspace.js";

export const API_SPEC = {
  ...coreApiSpec,
  ...memberApiSpec,
  ...profileApiSpec,
  ...chatApiSpec,
  ...notificationApiSpec,
  ...schoolApiSpec,
  ...integrationApiSpec,
  ...taskApiSpec,
  ...workspaceApiSpec,
} as const;
