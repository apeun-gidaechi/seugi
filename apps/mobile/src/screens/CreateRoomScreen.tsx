import { useEffect, useMemo, useState } from "react";
import type { Room, Workspace, WorkspaceMemberView } from "@seugi/contracts";
import { api } from "../services/api";
import { workspaceMemberDisplayName } from "../utils/member";
import { CreateRoomMembersScreen } from "./CreateRoomMembersScreen";
import { CreateGroupRoomNameScreen } from "./CreateGroupRoomNameScreen";

/** Owns the shared selection state while rendering the source app's two distinct destinations. */
export function CreateRoomScreen({
  workspace,
  step,
  onNavigate,
  onBack,
  onCreated,
}: {
  workspace: Workspace;
  step: "members" | "name";
  onNavigate: (route: "createGroupRoomName") => void;
  onBack: () => void;
  onCreated: (room: Room) => void;
}) {
  const [members, setMembers] = useState<WorkspaceMemberView[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [roomName, setRoomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState("");
  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIds.includes(member.id)),
    [members, selectedIds],
  );

  useEffect(() => {
    let active = true;
    Promise.all([api.workspaceMembers(workspace.id), api.memberInfo()])
      .then(([result, current]) => {
        if (!active) return;
        setMembers((result.data ?? []).filter((member) => member.id !== current.data?.id));
      })
      .catch(
        (reason) =>
          active &&
          setError(reason instanceof Error ? reason.message : "구성원을 불러오지 못했습니다"),
      )
      .finally(() => active && setLoadingMembers(false));
    return () => {
      active = false;
    };
  }, [workspace.id]);

  const create = async (name: string) => {
    if (busy || !selectedIds.length) return;
    setBusy(true);
    setError("");
    try {
      const actualType = selectedIds.length === 1 ? "personal" : "group";
      const result = await api.createRoom(actualType, {
        workspaceId: workspace.id,
        name,
        memberIds: selectedIds,
      });
      const list = await api.rooms(workspace.id, actualType);
      const room = list.data?.find((item) => item.id === result.data);
      if (!room) throw new Error("생성한 채팅방을 불러오지 못했습니다");
      onCreated(room);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "채팅방을 만들지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const toggleMember = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id],
    );
  const complete = () => {
    if (busy) return;
    if (step === "members") {
      if (!selectedIds.length) return;
      if (selectedMembers.length === 1) {
        void create(selectedMembers[0] ? workspaceMemberDisplayName(selectedMembers[0]) : "채팅");
        return;
      }
      onNavigate("createGroupRoomName");
      return;
    }
    const fallbackName = `${selectedMembers[0] ? workspaceMemberDisplayName(selectedMembers[0]) : "멤버"} 외 ${selectedMembers.length - 1}명`;
    void create(roomName || fallbackName);
  };

  if (step === "name") {
    const placeholder = `${selectedMembers[0] ? workspaceMemberDisplayName(selectedMembers[0]) : "멤버"}${selectedMembers.length > 1 ? ` 외 ${selectedMembers.length - 1}명` : ""}`;
    return (
      <CreateGroupRoomNameScreen
        placeholder={placeholder}
        roomName={roomName}
        error={error}
        busy={busy}
        onRoomNameChange={setRoomName}
        onBack={onBack}
        onComplete={complete}
      />
    );
  }

  return (
    <CreateRoomMembersScreen
      members={members}
      selectedMembers={selectedMembers}
      selectedIds={selectedIds}
      error={error}
      busy={busy}
      loading={loadingMembers}
      onToggleMember={toggleMember}
      onRemoveSelected={(id) =>
        setSelectedIds((current) => current.filter((selected) => selected !== id))
      }
      onBack={onBack}
      onComplete={complete}
    />
  );
}
