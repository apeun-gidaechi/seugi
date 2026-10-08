export function workspaceNameValidationMessage() {
  return "학교 이름을 입력해 주세요";
}

export type WorkspaceRequestRole = "STUDENT" | "TEACHER";

export function workspaceRequestRoles(
  requestedRoles?: WorkspaceRequestRole[],
): WorkspaceRequestRole[] {
  return requestedRoles?.length ? requestedRoles : ["STUDENT"];
}
