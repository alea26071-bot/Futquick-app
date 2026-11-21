/* Futquick service worker — web push (v2: heads-up + som padrão do sistema) */
const SW_VERSION = "futquick-sw-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Monta as opções da notificação. A tag combina o tipo do aviso com o destino,
 * assim avisos de conversas/jogos diferentes não se sobrescrevem; avisos do
 * mesmo destino se agrupam e, com renotify, voltam a tocar/vibrar.
 */
function buildNotification(payload) {
  const url = payload.url || "/descobrir";
  const tag = `${payload.tag || "futquick"}:${url}`;
  return {
    title: payload.title || "Futquick",
    options: {
      body: payload.body || "",
      tag,
      renotify: true,
      silent: false,
      requireInteraction: false,
      timestamp: Date.now(),
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [120, 60, 120],
      data: { url },
    },
  };
}
self.__futquickBuildNotification = buildNotification;

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Futquick", body: event.data ? event.data.text() : "" };
  }
  const { title, options } = buildNotification(payload || {});
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/descobrir";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
