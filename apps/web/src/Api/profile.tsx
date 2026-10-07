import { withSeugiApi } from "./client";
  
export const fetchingProfile = async (workspaceId: string) => {
    return withSeugiApi((api) => api.myProfile(workspaceId));
}

export const getMyInfos = async () => {
    return withSeugiApi((api) => api.memberInfo());
}

export const updateProfile = async (workspaceId: string, profile: { status?: string; spot?: string; belong?: string; phone?: string; wire?: string; location?: string; nick?: string }) => {
    return withSeugiApi((api) => api.editProfile(workspaceId, profile));
}
