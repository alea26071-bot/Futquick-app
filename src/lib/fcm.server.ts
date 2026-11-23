// Native push (Android FCM, iOS via FCM -> APNs) through the Firebase Cloud Messaging connector.
// Sends nothing until the connector is linked; Web Push keeps working on its own.
import type { PushMessage } from "@/lib/web-push.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export type NativeResult = "ok" | "gone" | "error" | "unconfigured";

export function nativePushConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["FIREBASE_MESSAGING_API_KEY"]);
}

/** Builds the FCM v1 message. Content stays generic: callers already pass privacy-safe text. */
export function buildFcmMessage(token: string, platform: string, message: PushMessage) {
  const url = message.url && message.url.startsWith("/") ? message.url : "/notificacoes";
  const tag = (message.tag ?? url).slice(0, 64);
  return {
    message: {
      token,
      notification: { title: message.title, ...(message.body ? { body: message.body } : {}) },
      data: { url, tag },
      ...(platform === "android"
        ? {
            android: {
              priority: "HIGH",
              collapse_key: tag,
              ttl: "86400s",
              notification: {
                channel_id: "futquick_default",
                tag,
                default_sound: true,
                default_vibrate_timings: true,
              },
            },
          }
        : {
            apns: {
              headers: { "apns-priority": "10", "apns-collapse-id": tag },
              payload: { aps: { sound: "default", "thread-id": tag } },
            },
          }),
    },
  };
}

export async function sendNativePush(
  token: string,
  platform: string,
  message: PushMessage,
): Promise<NativeResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connectionKey) return "unconfigured";
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildFcmMessage(token, platform, message)),
    });
    if (res.ok) return "ok";
    const text = await res.text().catch(() => "");
    if (
      res.status === 404 ||
      (res.status === 400 && /UNREGISTERED|INVALID_ARGUMENT|registration-token/i.test(text))
    )
      return "gone";
    console.error(`[fcm] failed [${res.status}]: ${text.slice(0, 300)}`);
    return "error";
  } catch (e) {
    console.error("[fcm] error", e);
    return "error";
  }
}
