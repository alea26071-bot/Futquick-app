import type { CapacitorConfig } from "@capacitor/cli";

// The app is server-rendered and depends on server functions, so the native shell loads the
// published site instead of bundling a static copy. native-shell/ is only the offline fallback.
const APP_URL = "https://futquick-app.lovable.app";

const config: CapacitorConfig = {
  appId: "com.futquick.app",
  appName: "Futquick",
  webDir: "native-shell",
  server: {
    url: APP_URL,
    cleartext: false,
    errorPath: "index.html",
    // Only the app's own domain and Google sign-in/maps hosts may load inside the app.
    allowNavigation: [
      "futquick-app.lovable.app",
      "accounts.google.com",
      "*.googleapis.com",
      "*.gstatic.com",
      "*.supabase.co",
    ],
  },
  android: { allowMixedContent: false },
  plugins: {
    FirebaseMessaging: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
