import { useEffect, useState } from "react";
import { adsEnabled, removeBanner, showBanner } from "@/lib/native/ads";

const NAV_CLEARANCE = 84; // keeps the native banner above the bottom navigation

/** Android/iOS app only, and only when ads are enabled. Reserves space so the banner never covers content. */
export function NativeAdBanner() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!adsEnabled()) return;
    let active = true;
    void showBanner(NAV_CLEARANCE).then((ok) => active && setShown(ok));
    return () => {
      active = false;
      void removeBanner();
    };
  }, []);
  return shown ? <div aria-hidden style={{ height: 64 }} /> : null;
}
