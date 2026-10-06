import { createRemoteJWKSet, jwtVerify } from "jose";

export type Identity = { email: string; name: string };
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export class OAuthProvider {
  private async verify(idToken: string, issuer: string, audience: string, keys: ReturnType<typeof createRemoteJWKSet>, fallbackName = "") {
    const { payload } = await jwtVerify(idToken, keys, { issuer, audience });
    if (typeof payload.email !== "string") throw new Error("OAuth 공급자가 이메일을 제공하지 않았습니다");
    return { email: payload.email, name: typeof payload.name === "string" ? payload.name : fallbackName || payload.email.split("@")[0] };
  }
  async google(code: string, platform = "WEB"): Promise<Identity> {
    const clientId = process.env.GOOGLE_CLIENT_ID; const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET이 필요합니다");
    const redirectUri = platform === "WEB" ? process.env.GOOGLE_WEB_REDIRECT_URI : process.env.GOOGLE_MOBILE_REDIRECT_URI;
    if (!redirectUri) throw new Error("Google redirect URI가 설정되지 않았습니다");
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    if (!response.ok) throw new Error("Google authorization code 교환에 실패했습니다");
    const token = await response.json() as { id_token?: string }; if (!token.id_token) throw new Error("Google ID token이 없습니다");
    return this.verify(token.id_token, "https://accounts.google.com", clientId, googleKeys);
  }
  async apple(code: string, platform = "WEB", fallbackName = ""): Promise<Identity> {
    const clientId = platform === "WEB" ? process.env.APPLE_WEB_CLIENT_ID : process.env.APPLE_MOBILE_CLIENT_ID;
    const clientSecret = process.env.APPLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("APPLE client ID와 client secret이 필요합니다");
    const response = await fetch("https://appleid.apple.com/auth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code" }) });
    if (!response.ok) throw new Error("Apple authorization code 교환에 실패했습니다");
    const token = await response.json() as { id_token?: string }; if (!token.id_token) throw new Error("Apple ID token이 없습니다");
    return this.verify(token.id_token, "https://appleid.apple.com", clientId, appleKeys, fallbackName);
  }
}
