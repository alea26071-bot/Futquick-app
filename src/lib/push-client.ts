import { getPushConfig, savePushSubscription, removePushSubscription } from "@/lib/notifications.functions";

export type PushState = "unsupported" | "denied" | "granted" | "default" | "error";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushPermission(): PushState {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as PushState;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function keyToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    void reg.update().catch(() => undefined);
    return reg;
  } catch {
    return null;
  }
}

/** Asks for permission (if needed), subscribes and persists the subscription. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  try {
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return permission as PushState;

    const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
    if (!registration) return "error";
    await navigator.serviceWorker.ready;

    const { publicKey } = await getPushConfig();
    if (!publicKey) return "error";

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      }));

    await savePushSubscription({
      data: {
        endpoint: subscription.endpoint,
        p256dh: keyToBase64(subscription.getKey("p256dh")),
        auth: keyToBase64(subscription.getKey("auth")),
        userAgent: navigator.userAgent,
      },
    });
    return "granted";
  } catch (e) {
    console.error("[push] enable failed", e);
    return "error";
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await removePushSubscription({ data: { endpoint: subscription.endpoint } }).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}

/** Silent refresh: keeps the stored subscription in sync when permission is already granted. */
export async function syncPushIfGranted(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") {
    if (pushSupported()) await registerServiceWorker();
    return;
  }
  await enablePush();
}
