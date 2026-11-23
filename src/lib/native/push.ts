// Native push for the Capacitor app (FCM on Android, FCM -> APNs on iOS).
// Loaded only inside the app; browsers keep using the Web Push service worker.
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { App } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { nativePlatform } from "@/lib/native/platform";

export type NativePushState = "granted" | "denied" | "default" | "error";

let cached: NativePushState = "default";
export const cachedNativePermission = () => cached;

function deviceId(): string {
  const key = "futquick-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function saveToken(token: string) {
  const version = await App.getInfo()
    .then((i) => `${i.version} (${i.build})`)
    .catch(() => "unknown");
  const { error } = await supabase.rpc("register_push_device", {
    _platform: nativePlatform(),
    _token: token,
    _device_id: deviceId(),
    _app_version: version,
  });
  if (error) throw error;
  localStorage.setItem("futquick-native-token", token);
}

export async function readNativePermission(): Promise<NativePushState> {
  try {
    const { receive } = await FirebaseMessaging.checkPermissions();
    cached = receive === "granted" ? "granted" : receive === "denied" ? "denied" : "default";
  } catch {
    cached = "error";
  }
  return cached;
}

/** Shows the system prompt (Android 13+ / iOS) and registers this device for the signed-in user. */
export async function enableNativePush(): Promise<NativePushState> {
  try {
    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== "granted") {
      cached = receive === "denied" ? "denied" : "default";
      return cached;
    }
    const { token } = await FirebaseMessaging.getToken();
    await saveToken(token);
    cached = "granted";
    return cached;
  } catch (e) {
    console.error("[native-push] enable failed", e);
    cached = "error";
    return cached;
  }
}

export async function syncNativePushIfGranted() {
  if ((await readNativePermission()) === "granted") await enableNativePush();
}

/** Called on sign-out and when the user turns pushes off: the phone stops receiving this account's alerts. */
export async function disableNativePush() {
  const token = localStorage.getItem("futquick-native-token");
  if (token) await supabase.from("push_devices").delete().eq("token", token);
  localStorage.removeItem("futquick-native-token");
  await FirebaseMessaging.deleteToken().catch(() => undefined);
}

/** Foreground messages become an in-app toast; taps (background/closed app) open the target screen. */
export async function listenNativePush(handlers: {
  onForeground: (title: string, body: string | undefined, url: unknown) => void;
  onOpen: (url: unknown) => void;
}) {
  await FirebaseMessaging.removeAllListeners();
  await FirebaseMessaging.addListener("tokenReceived", ({ token }) => {
    if (cached === "granted") void saveToken(token).catch(() => undefined);
  });
  await FirebaseMessaging.addListener("notificationReceived", ({ notification }) => {
    const data = (notification.data ?? {}) as Record<string, unknown>;
    handlers.onForeground(notification.title ?? "Futquick", notification.body, data["url"]);
  });
  await FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
    const data = (notification.data ?? {}) as Record<string, unknown>;
    handlers.onOpen(data["url"]);
  });
}
