export function workspaceMembersLoadFailureState(platform: "android" | "ios", hasMembers: boolean) {
  return platform === "ios"
    ? { loading: false, loadFailed: true }
    : { loading: !hasMembers, loadFailed: false };
}
