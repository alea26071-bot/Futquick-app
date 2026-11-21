export function oauthReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  // A fixed parsing origin keeps route search validation safe during SSR.
  const origin = "https://app.invalid";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.pathname.startsWith("//")) return "/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

const KEY = "futquick_auth_next";

/** Remember a validated return path (e.g. the connector consent URL) across sign-in. */
export function rememberReturnPath(value: unknown) {
  const path = oauthReturnPath(value);
  if (path !== "/" && typeof window !== "undefined") window.sessionStorage.setItem(KEY, path);
}

/** Read and clear the remembered return path, or null when none. */
export function consumeReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  window.sessionStorage.removeItem(KEY);
  const path = oauthReturnPath(raw);
  return path === "/" ? null : path;
}
