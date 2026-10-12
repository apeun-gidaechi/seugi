/** Intercepts Seugi API HTTP calls so web stories render without a backend. */

import {
  STORYBOOK_WORKSPACE_ID,
  storybookApiRooms,
  storybookDemoMessages,
} from "./storybookApiFixtures";

export { STORYBOOK_WORKSPACE_ID };

const demoMember = {
  id: "storybook-user",
  email: "demo@seugi.app",
  birth: "2000-01-01",
  name: "스기 QA",
  picture: "https://placehold.co/64x64/png",
};

const demoWorkspace = {
  workspaceId: STORYBOOK_WORKSPACE_ID,
  id: STORYBOOK_WORKSPACE_ID,
  workspaceName: "스기 QA 학교",
  name: "스기 QA 학교",
  workspaceImageUrl: "",
  workspaceAdmin: "admin-demo",
  middleAdmin: [] as string[],
  teacher: [] as string[],
  student: [] as string[],
};

const demoLegacyProfile = {
  workspaceId: STORYBOOK_WORKSPACE_ID,
  role: "STUDENT",
  permission: "STUDENT",
  profileImage: "",
  member: {
    id: demoMember.id,
    email: demoMember.email,
    birth: demoMember.birth,
    name: demoMember.name,
    picture: demoMember.picture,
  },
};

let installed = false;

function jsonApi(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pathAndQuery(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function isSeugiApiPath(path: string): boolean {
  return /^\/(member|workspace|profile|notification|timetable|meal|schedule|task|chat|room|group|personal|device|auth|login|register|refresh|health|cat|email|oauth)/i.test(
    path,
  );
}

function resolveMock(path: string, method: string): Response | null {
  if (path === "/member/myInfo" || path.endsWith("/member/myInfo")) {
    return jsonApi(demoMember);
  }
  if (path === "/workspace" && method === "GET") {
    return jsonApi([demoWorkspace]);
  }
  if (path === "/workspace/my/wait-list") {
    return jsonApi([]);
  }
  if (path.startsWith("/profile/me")) {
    return jsonApi(demoLegacyProfile);
  }
  if (path.startsWith("/notification/")) {
    return jsonApi([]);
  }
  if (path.startsWith("/timetable/day")) {
    return jsonApi([]);
  }
  if (path.startsWith("/meal?")) {
    return jsonApi([]);
  }
  if (path.startsWith("/schedule/month") && method === "GET") {
    return jsonApi([]);
  }
  if (path.includes("/schedule") && method === "GET") {
    return jsonApi([]);
  }
  if (path.startsWith("/task/classroom")) {
    return jsonApi([]);
  }
  if (path.startsWith("/task/") && method === "GET") {
    return jsonApi([]);
  }
  if (path.startsWith("/task") && method === "GET") {
    return jsonApi([]);
  }
  if (path.startsWith("/chat/personal/search")) {
    return jsonApi(storybookApiRooms.filter((room) => room.type === "PERSONAL"));
  }
  if (path.startsWith("/chat/group/search") && !path.includes("/room/")) {
    return jsonApi(storybookApiRooms.filter((room) => room.type === "GROUP"));
  }
  if (path.startsWith("/message/search/")) {
    const roomId = path.split("/message/search/")[1]?.split("?")[0] ?? "room-demo";
    return jsonApi({ messages: storybookDemoMessages(roomId), hasNext: false });
  }
  if (path.startsWith("/workspace/members")) {
    return jsonApi([]);
  }
  if (path.match(/^\/workspace\/[^/]+$/) && method === "GET") {
    return jsonApi(demoWorkspace);
  }
  if (path.startsWith("/chat") || path.startsWith("/group") || path.startsWith("/personal")) {
    return jsonApi([]);
  }
  if (path.startsWith("/email/send")) {
    return jsonApi(null);
  }
  if (path.startsWith("/email/confirm")) {
    return jsonApi(null);
  }
  if (path.includes("/member/register") || path.includes("/member/login")) {
    return jsonApi({
      accessToken: "storybook-access-token",
      refreshToken: "storybook-refresh-token",
    });
  }
  if (path.startsWith("/oauth/")) {
    return jsonApi({
      accessToken: "storybook-access-token",
      refreshToken: "storybook-refresh-token",
    });
  }
  if (path === "/health") {
    return jsonApi({ status: "ok" });
  }
  return null;
}

export function installStorybookFetchMock() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const path = pathAndQuery(url);

    if (isSeugiApiPath(path)) {
      const mock = resolveMock(path, method);
      if (mock) return mock;
      if (method === "GET") return jsonApi([]);
      return jsonApi(null);
    }

    return realFetch(input, init);
  };
}
