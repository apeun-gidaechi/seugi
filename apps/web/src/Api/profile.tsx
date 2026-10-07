import { withSeugiApi } from "./client";
  
export const fetchingProfile = async (workspaceId: string) => {
    return withSeugiApi((api) => api.myProfile(workspaceId));
}

export const getMyInfos = async () => {
    return withSeugiApi((api) => api.memberInfo());
}
