import { withSeugiApi } from "./client";
import type { Workspace } from "@seugi/contracts";

export interface WorkspaceCard {
    workspaceId: string;
    workspaceName: string;
    workspaceImageUrl: string;
    workspaceAdmin: string;
    middleAdmin: string[];
    teacher: string[];
    student: string[];
}
export interface PendingWorkspaceCard extends WorkspaceCard { studentCount: string; teacherCount: string }

const toWorkspaceCard = (workspace: Workspace): WorkspaceCard => ({
    workspaceId: workspace.workspaceId ?? workspace.id,
    workspaceName: workspace.workspaceName ?? workspace.name,
    workspaceImageUrl: workspace.workspaceImageUrl ?? workspace.image ?? "",
    workspaceAdmin: workspace.workspaceAdmin ?? workspace.ownerId,
    middleAdmin: workspace.middleAdmin ?? [],
    teacher: workspace.teacher ?? [],
    student: workspace.student ?? [],
});

export const getMyWorkspaces = async () => {
    const workspaces = await withSeugiApi((api) => api.workspaces());
    return workspaces.map(toWorkspaceCard);
};

export const getMyWaitingWorkspace = async () => {
    const workspaces = await withSeugiApi((api) => api.myWaitingWorkspaces());
    return workspaces.map((workspace): PendingWorkspaceCard => ({ ...toWorkspaceCard(workspace), studentCount: String(workspace.student?.length ?? 0), teacherCount: String(workspace.teacher?.length ?? 0) }));
}

export const WorkspaceName = async (workspaceId: string) => {
    const workspace = await withSeugiApi((api) => api.workspaceDetails(workspaceId));
    return { ...workspace, workspaceId: workspace.workspaceId ?? workspace.id, workspaceName: workspace.workspaceName ?? workspace.name, workspaceImageUrl: workspace.workspaceImageUrl ?? workspace.image ?? "" };
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

export const createWorkspace = async (input: { workspaceName: string; workspaceImageUrl: string }) => {
    return withSeugiApi((api) => api.createWorkspace(input));
}
