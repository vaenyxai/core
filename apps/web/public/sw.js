// Bump this on any change so the browser sees a new service worker, reinstalls,
// and the activate handler below purges every older cache — that is what stops a
// device getting stuck on a stale app shell (phones have no Ctrl+Shift+R).
const CACHE_NAME = "vaenyx-shell-v5";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/", "/index.html"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any cache from a previous build so an old shell can't linger.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") {
    return;
  }

  // Network-first for navigations: always try the live (no-cache) index.html so a
  // fresh build is picked up immediately; fall back to the cached shell offline.
  event.respondWith(
    fetch(event.request).catch(() => caches.match("/index.html")),
  );
});

// Web Push: a scheduled task finished — show it. The payload is JSON
// { title, body, url } sent by the local Vaenyx server.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Non-JSON payload: fall back to a generic notification.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Vaenyx", {
      body: data.body || "",
      icon: "/vaenyx-icon-192.png",
      badge: "/vaenyx-icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

// Browsers occasionally rotate or drop a push subscription on their own.
// Re-subscribe with the server's key and hand the new subscription back, so
// notifications keep working without the Owner touching anything.
function base64ToUint8(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch("/v1/push/public-key", {
          credentials: "include",
        });
        const { key } = await response.json();
        if (!key) return;
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8(key),
        });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys) return;
        await fetch("/v1/push/subscriptions", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          }),
        });
      } catch {
        // Best-effort — the in-page self-heal covers the rest.
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = (event.notification.data && event.notification.data.url) || "/";
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ("focus" in client) {
          // Focus AND go to the target. Focusing alone left the app on
          // whatever page was already open, so a notification about a
          // finished task dropped you on the home screen and you had to go
          // find it (Oskar, 2026-07-27).
          await client.focus();
          if ("navigate" in client && url !== "/") {
            try {
              await client.navigate(url);
            } catch {
              // Some browsers refuse navigate() on a focused client; the
              // notification has still done its job of bringing the app up.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
