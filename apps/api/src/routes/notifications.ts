import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  API_SPEC,
  createNotificationSchema,
  notificationEmojiSchema,
  notificationPageQuerySchema,
  updateNotificationSchema,
  workspaceIdParamSchema,
  type Notification,
  type Role,
  type Workspace,
} from "@seugi/contracts";
import type { Store } from "../store.js";
import type { PushNotifications } from "../push.js";
import { notificationRecipientIds } from "../push.js";
import { body, ok, query } from "../http/helpers.js";

const workspaceParam = workspaceIdParamSchema;

export type NotificationRouteDeps = {
  store: Store;
  push: PushNotifications;
  auth: (request: FastifyRequest) => Promise<void>;
  roleIn: (workspace: Workspace, memberId: string) => Role | undefined;
  canManageWorkspace: (workspace: Workspace, memberId: string) => boolean;
};

export function registerNotificationRoutes(
  app: FastifyInstance,
  deps: NotificationRouteDeps,
) {
  const { store, push, auth, roleIn, canManageWorkspace } = deps;

  const legacyNotification = (item: Notification) => ({
    ...item,
    userId: item.authorId,
    userName: store.requireMember(item.authorId).name,
    emoji: Object.entries(item.emojis)
      .filter(([, userList]) => userList.length > 0)
      .map(([emoji, userList]) => ({ emoji, userList })),
    createdDate: item.createdAt,
    lastModifiedDate: item.createdAt,
  });

  app.post(
    API_SPEC.createNotification.path,
    { preHandler: auth },
    async (request) => {
      const input = body(createNotificationSchema, request);
      const workspace = store.requireWorkspace(input.workspaceId);
      const role = roleIn(workspace, request.user.sub);
      if (!role || role === "STUDENT") throw new Error("권한이 없습니다");
      const createdAt = new Date().toISOString();
      const notification: Notification = {
        id: store.id(),
        ...input,
        authorId: request.user.sub,
        createdAt,
        updatedAt: createdAt,
        emojis: {},
      };
      store.notifications.set(notification.id, notification);
      const tokens = store.pushTokensForWorkspace(
        workspace.id,
        notificationRecipientIds(workspace, request.user.sub, (memberId) =>
          roleIn(workspace, memberId),
        ),
      );
      void push
        .send(tokens, {
          title: `[공지] ${workspace.name}`,
          body: `${store.requireMember(request.user.sub).name}: ${input.content}`,
          imageUrl: workspace.image,
        })
        .catch((error) => app.log.error(error, "FCM notice push failed"));
      return ok("공지 생성 성공", legacyNotification(notification));
    },
  );

  app.get(
    API_SPEC.listNotifications.path,
    { preHandler: auth },
    async (request) => {
      const workspaceId = workspaceParam.parse(request.params).workspaceId;
      if (!store.canAccess(workspaceId, request.user.sub))
        throw new Error("권한이 없습니다");
      const { page, size } = query(notificationPageQuerySchema, request);
      return ok(
        "공지 조회 성공",
        [...store.notifications.values()]
          .filter((item) => item.workspaceId === workspaceId)
          .sort(
            (a, b) =>
              b.createdAt.localeCompare(a.createdAt) ||
              b.id.localeCompare(a.id),
          )
          .slice(page * size, (page + 1) * size)
          .map(legacyNotification),
      );
    },
  );

  app.patch(
    API_SPEC.updateNotification.path,
    { preHandler: auth },
    async (request) => {
      const input = body(updateNotificationSchema, request);
      const item = store.notifications.get(input.id);
      if (!item || item.authorId !== request.user.sub)
        throw new Error("NOTIFICATION_NOT_FOUND");
      item.title = input.title;
      item.content = input.content;
      item.updatedAt = new Date().toISOString();
      return ok("공지 수정 성공");
    },
  );

  app.delete(
    API_SPEC.deleteNotification.path,
    { preHandler: auth },
    async (request) => {
      const input = z
        .object({ workspaceId: z.string().uuid(), id: z.string().uuid() })
        .parse(request.params);
      const item = store.notifications.get(input.id);
      const workspace = store.requireWorkspace(input.workspaceId);
      if (
        !item ||
        item.workspaceId !== workspace.id ||
        (item.authorId !== request.user.sub &&
          !canManageWorkspace(workspace, request.user.sub))
      )
        throw new Error("NOTIFICATION_NOT_FOUND");
      store.notifications.delete(item.id);
      return ok("공지 삭제 성공");
    },
  );

  app.patch(
    API_SPEC.toggleNotificationEmoji.path,
    { preHandler: auth },
    async (request) => {
      const input = body(notificationEmojiSchema, request);
      const item = store.notifications.get(input.notificationId);
      if (!item) throw new Error("NOTIFICATION_NOT_FOUND");
      if (!store.canAccess(item.workspaceId, request.user.sub))
        throw new Error("권한이 없습니다");
      const people = item.emojis[input.emoji] ?? [];
      item.emojis[input.emoji] = people.includes(request.user.sub)
        ? people.filter((id) => id !== request.user.sub)
        : [...people, request.user.sub];
      return ok("성공");
    },
  );
}
