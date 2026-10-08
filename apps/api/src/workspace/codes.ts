import { randomInt } from "node:crypto";

const workspaceCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createWorkspaceInviteCode(length = 6) {
  return Array.from({ length }, () => workspaceCodeAlphabet[randomInt(workspaceCodeAlphabet.length)]).join("");
}

export const WORKSPACE_CODE_ALPHABET = workspaceCodeAlphabet;
