import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { UserContextProvider } from "@/Contexts/userContext";

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

export function StoryProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <UserContextProvider>{children}</UserContextProvider>
    </MemoryRouter>
  );
}
