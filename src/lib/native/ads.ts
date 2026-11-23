// AdMob for the Android/iOS app only. Off unless VITE_ADMOB_ENABLED="true".
// Until real IDs are provided, only Google's official TEST ad units are used.
import { isNativeApp, nativePlatform } from "@/lib/native/platform";

export const ADMOB_TEST_BANNER = {
  android: "ca-app-pub-3940256099942544/6300978111",
  ios: "ca-app-pub-3940256099942544/2934735716",
} as const;

export function adsEnabled(): boolean {
  return isNativeApp() && import.meta.env.VITE_ADMOB_ENABLED === "true";
}

/** Real IDs come from public build variables; without them the official test unit is used. */
export function bannerUnitId(): { id: string; testing: boolean } {
  const platform = nativePlatform() === "ios" ? "ios" : "android";
  const real =
    platform === "ios"
      ? import.meta.env.VITE_ADMOB_BANNER_IOS
      : import.meta.env.VITE_ADMOB_BANNER_ANDROID;
  return typeof real === "string" && real.startsWith("ca-app-pub-")
    ? { id: real, testing: false }
    : { id: ADMOB_TEST_BANNER[platform], testing: true };
}

let ready: Promise<{ personalized: boolean } | null> | null = null;

/** Initializes the SDK and Google's consent form (UMP). Returns null when ads must not be shown. */
export function initAds() {
  ready ??= (async () => {
    try {
      const { AdMob, AdmobConsentStatus } = await import("@capacitor-community/admob");
      await AdMob.initialize({ initializeForTesting: bannerUnitId().testing });
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        consent = await AdMob.showConsentForm();
      }
      if (!consent.canRequestAds) return null;
      // Personalized only when the user consented; otherwise non-personalized ads.
      return {
        personalized:
          consent.status === AdmobConsentStatus.OBTAINED ||
          consent.status === AdmobConsentStatus.NOT_REQUIRED,
      };
    } catch (e) {
      console.warn("[ads] unavailable", e);
      return null;
    }
  })();
  return ready;
}

/** Shows a small banner above the bottom navigation. `bottomMargin` keeps buttons uncovered. */
export async function showBanner(bottomMargin: number): Promise<boolean> {
  if (!adsEnabled()) return false;
  const state = await initAds();
  if (!state) return false;
  try {
    const { AdMob, BannerAdPosition, BannerAdSize } = await import("@capacitor-community/admob");
    const unit = bannerUnitId();
    await AdMob.showBanner({
      adId: unit.id,
      isTesting: unit.testing,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: bottomMargin,
      npa: !state.personalized,
    });
    return true;
  } catch (e) {
    console.warn("[ads] banner failed", e);
    return false;
  }
}

export async function removeBanner() {
  if (!isNativeApp()) return;
  const { AdMob } = await import("@capacitor-community/admob");
  await AdMob.removeBanner().catch(() => undefined);
}

/** Opens Google's privacy options so the user can change ad consent later. */
export async function openAdPrivacyOptions() {
  if (!adsEnabled()) return;
  const { AdMob } = await import("@capacitor-community/admob");
  await AdMob.showPrivacyOptionsForm().catch(() => undefined);
}
