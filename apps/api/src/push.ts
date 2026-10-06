import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export type PushPayload = { title: string; body: string; imageUrl?: string };

/** Firebase Cloud Messaging adapter. It is deliberately inert until credentials are configured. */
export class PushNotifications {
  private enabled = false;
  constructor() {
    const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!rawCredentials) return;
    const credentials = JSON.parse(rawCredentials) as Record<string, string>;
    if (!getApps().length) initializeApp({ credential: cert(credentials) });
    this.enabled = true;
  }
  async send(tokens: Iterable<string>, payload: PushPayload) {
    const target = [...new Set(tokens)].filter(Boolean);
    if (!this.enabled || !target.length) return;
    await getMessaging().sendEachForMulticast({ tokens: target, notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl } });
  }
}
