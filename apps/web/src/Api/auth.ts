import { withPublicSeugiApi } from "./client";

export const sendVerificationCode = (email: string) =>
  withPublicSeugiApi((api) => api.sendVerification(email));

export const registerMember = (input: {
  name?: string;
  email: string;
  password: string;
  code: string;
}) => withPublicSeugiApi((api) => api.register(input));

export const loginMember = (input: { email: string; password: string; token?: string }) =>
  withPublicSeugiApi((api) => api.login(input));

export const authenticateGoogle = (code: string, token?: string) =>
  withPublicSeugiApi((api) => api.authenticateGoogle({ code, token, platform: "WEB" }));

export const authenticateApple = (code: string, name?: string, token?: string) =>
  withPublicSeugiApi((api) => api.authenticateApple({ code, name, token, platform: "WEB" }));
