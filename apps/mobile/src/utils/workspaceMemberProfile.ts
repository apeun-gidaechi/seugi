export type WorkspaceMemberProfileFields = {
  name: string;
  nick?: string;
  status?: string;
  spot?: string;
  belong?: string;
  phone?: string;
  wire?: string;
  location?: string;
};

export function workspaceMemberProfileHeader(platform: "android" | "ios", profile: WorkspaceMemberProfileFields) {
  return platform === "ios" && profile.nick
    ? `${profile.name} (${profile.nick})`
    : profile.name;
}

export function workspaceMemberProfileRows(platform: "android" | "ios", profile: WorkspaceMemberProfileFields) {
  const fields: Array<[string, string | undefined]> = [
    ["상태메세지", profile.status],
    ...(platform === "ios" ? [["닉네임", profile.nick] as [string, string | undefined]] : []),
    ["직위", profile.spot],
    ["소속", profile.belong],
    ["휴대전화번호", profile.phone],
    ["유선전화번호", profile.wire],
    ["근무위치", profile.location],
  ];
  return fields.map(([label, value]) => ({
    label,
    value: platform === "ios" ? value || "-" : value || "",
  }));
}
