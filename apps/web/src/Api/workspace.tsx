import { withSeugiApi } from "./client";

export const getMyWorkspaces = async () => {
    return withSeugiApi((api) => api.workspaces());
};

export const getMyWaitingWorkspace = async () => {
    return withSeugiApi((api) => api.myWaitingWorkspaces());
}

export const WorkspaceName = async (workspaceId: string) => {
    return withSeugiApi((api) => api.workspaceDetails(workspaceId));
}

export const getWorkspaceInfo = async (verificationCode: string) => {
    return withSeugiApi((api) => api.searchWorkspace(verificationCode));
}

export const getWorkspaceCode = async (verificationCode: string) => {
    return withSeugiApi((api) => api.searchWorkspace(verificationCode));
}

export const joinWorkspace = async (input: { workspaceId?: string; workspaceCode?: string; role: "STUDENT" | "TEACHER" }) => {
    return withSeugiApi((api) => api.joinWorkspace(input));
}
