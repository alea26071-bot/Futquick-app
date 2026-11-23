import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { isNativeApp, safeAppPath } from "@/lib/native/platform";

/** Android/iOS app only: push taps, foreground pushes and app links open the right screen. Renders nothing. */
export function NativeAppBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    const go = (url: unknown) => void navigate({ to: safeAppPath(url) as never });
    void (async () => {
      const [{ listenNativePush }, { App }] = await Promise.all([
        import("@/lib/native/push"),
        import("@capacitor/app"),
      ]);
      if (cancelled) return;
      await listenNativePush({
        onForeground: (title, body, url) =>
          toast(title, {
            description: body,
            duration: 6000,
            action: { label: "Abrir", onClick: () => go(url) },
          }),
        onOpen: go,
      });
      const link = await App.addListener("appUrlOpen", ({ url }) => go(url));
      cleanups.push(() => void link.remove());
    })();
    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
    };
  }, [navigate]);
  return null;
}
