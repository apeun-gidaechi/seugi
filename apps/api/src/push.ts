import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export type PushPayload = { title: string; body: string; imageUrl?: string };

/** Firebase Cloud Messaging adapter. It is deliberately inert until credentials are configured. */
export class PushNotifications {
  private enabled = false;
  constructor(private readonly fetcher: typeof fetch = fetch) {
    const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!rawCredentials) return;
    const credentials = JSON.parse(rawCredentials) as Record<string, string>;
    if (!getApps().length) initializeApp({ credential: cert(credentials) });
    this.enabled = true;
  }
  async send(tokens: Iterable<string>, payload: PushPayload) {
    const target = [...new Set(tokens)].filter(Boolean);
    const expo = target.filter((token) => /^Expo(nent)?PushToken\[/.test(token));
    const fcm = target.filter((token) => !/^Expo(nent)?PushToken\[/.test(token));
    if (expo.length) await Promise.all(this.chunks(expo, 100).map(async (chunk) => {
      const response = await this.fetcher("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(chunk.map((to) => ({ to, title: payload.title, body: payload.body, sound: "default", ...(payload.imageUrl ? { data: { imageUrl: payload.imageUrl } } : {}) }))) });
      if (!response.ok) throw new Error("EXPO_PUSH_REQUEST_FAILED");
    }));
    if (this.enabled && fcm.length) await Promise.all(this.chunks(fcm, 500).map((chunk) => getMessaging().sendEachForMulticast({ tokens: chunk, notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl } })));
  }
  private chunks<T>(items: T[], size: number) { return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size)); }
}
