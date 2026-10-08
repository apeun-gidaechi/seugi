import { CreateWorkspaceCard } from "./WorkspaceSetupScreen";

export function WorkspaceCreateScreen({ onCreated }: { onCreated: () => Promise<void> }) {
  return <CreateWorkspaceCard onCreated={onCreated} presentation="screen" />;
}
