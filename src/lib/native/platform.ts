// Browser-safe helpers: true only inside the Capacitor Android/iOS app, never in a normal browser.
import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function nativePlatform(): "android" | "ios" | "web" {
  if (!isNativeApp()) return "web";
  const p = Capacitor.getPlatform();
  return p === "ios" ? "ios" : "android";
}

/** Keeps pushes and deep links inside the app: only same-site relative paths are accepted. */
export function safeAppPath(url: unknown, fallback = "/notificacoes"): string {
  if (typeof url !== "string") return fallback;
  try {
    const parsed = new URL(url, "https://futquick-app.lovable.app");
    if (parsed.hostname !== "futquick-app.lovable.app") return fallback;
    const path = `${parsed.pathname}${parsed.search}`;
    return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
  } catch {
    return fallback;
  }
}
