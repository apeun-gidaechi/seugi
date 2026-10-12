import type { ReactNode } from "react";
import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Cookies from "js-cookie";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { SWRConfig } from "swr";
import { UserContextProvider } from "@/Contexts/userContext";
import { SelectedProvider } from "@/Hooks/Selected/useSelected";
import { installStorybookFetchMock, STORYBOOK_WORKSPACE_ID } from "./installStorybookFetchMock";

const GOOGLE_PREVIEW_CLIENT_ID = "local-preview.apps.googleusercontent.com";

const storybookUser = {
  id: "storybook-user",
  email: "demo@seugi.app",
  birth: "2000-01-01",
  name: "스기 QA",
  picture: "https://placehold.co/64x64/png",
};

if (typeof localStorage !== "undefined" && !localStorage.getItem("user")) {
  localStorage.setItem("user", JSON.stringify(storybookUser));
}

if (typeof document !== "undefined") {
  Cookies.set("workspaceId", STORYBOOK_WORKSPACE_ID);
  if (!Cookies.get("accessToken")) {
    Cookies.set("accessToken", "storybook-access-token");
  }
  installStorybookFetchMock();
}

function StorybookBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    installStorybookFetchMock();
  }, []);

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
        dedupingInterval: 60_000,
      }}
    >
      {children}
    </SWRConfig>
  );
}

export function StoryProviders({
  children,
  initialEntries = ["/"],
}: {
  children: ReactNode;
  initialEntries?: MemoryRouterProps["initialEntries"];
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <SelectedProvider>
        <UserContextProvider>
          <GoogleOAuthProvider clientId={GOOGLE_PREVIEW_CLIENT_ID}>
            <StorybookBootstrap>{children}</StorybookBootstrap>
          </GoogleOAuthProvider>
        </UserContextProvider>
      </SelectedProvider>
    </MemoryRouter>
  );
}
