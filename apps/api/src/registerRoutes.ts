import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Store } from "./store.js";
import type { NeisClient } from "./neis.js";
import type { OAuthProvider } from "./oauth.js";
import type { PushNotifications } from "./push.js";
import type { FileStorage } from "./storage.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerLateRoutes } from "./routes/late.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerProfileRoutes } from "./routes/profile.js";
import { registerSchoolRoutes } from "./routes/school.js";
import { registerTaskRoutes } from "./routes/tasks.js";
import { registerTimetableRoutes } from "./routes/timetable.js";
import { registerWorkspaceRoutes } from "./routes/workspace.js";
import { createWorkspacePresentation } from "./workspace/presentation.js";
import { localDateString } from "./school/dates.js";

export function registerAuthenticatedRoutes(
  app: FastifyInstance,
  deps: {
    store: Store;
    neis: NeisClient;
    oauth: OAuthProvider;
    push: PushNotifications;
    storage: FileStorage;
    auth: (request: FastifyRequest) => Promise<void>;
  },
) {
  const { store, neis, oauth, push, storage, auth } = deps;
  const presentation = createWorkspacePresentation(store);
  const { roleIn, legacyProfile, canManageWorkspace } = presentation;

  registerWorkspaceRoutes(app, { store, neis, push, auth, presentation });
  registerProfileRoutes(app, { store, auth, roleIn, legacyProfile });
  registerChatRoutes(app, { store, auth });
  registerNotificationRoutes(app, {
    store,
    push,
    auth,
    roleIn,
    canManageWorkspace,
  });
  const { timetableForMember } = registerTimetableRoutes(app, {
    store,
    neis,
    auth,
    roleIn,
  });
  registerTaskRoutes(app, { store, oauth, auth });
  const { resetMeals } = registerSchoolRoutes(app, { store, neis, auth });
  registerLateRoutes(
    app,
    { store, auth, localDateString, resetMeals, timetableForMember, roleIn },
    { store, storage, auth },
  );
}
