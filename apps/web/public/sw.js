// Bump this on any change so the browser sees a new service worker, reinstalls,
// and the activate handler below purges every older cache — that is what stops a
// device getting stuck on a stale app shell (phones have no Ctrl+Shift+R).
const CACHE_NAME = "vaenyx-shell-v8";

self.addEventListener("install", () => {
  // v8 caches NOTHING (Oskar, 2026-08-15: the phone went white). The cached
  // shell was the poison: opened during the boot window, the SW served an
  // index.html from an older build, whose hashed assets no longer exist —
  // a dead white page that never healed. The app cannot do anything without
  // its server anyway, so an offline copy of its shell buys nothing; when
  // the server is unreachable the fetch handler now answers with a small
  // self-retrying page instead.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any cache from a previous build so an old shell can't linger.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// The page shown when the server cannot be reached — a computer that is
// still booting, mid-restart, or briefly off the tailnet. It retries by
// itself every two seconds and reloads into the real app the moment the
// server answers, so nobody is left staring at a dead page wondering
// whether to refresh (Oskar, 2026-08-15, and his "页面自愈" pick).
function bootWaitPage() {
  const html = [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Vaenyx</title>",
    "<style>body{margin:0;display:grid;place-items:center;min-height:100dvh;",
    "background:#262624;color:#ece9e0;font-family:system-ui,sans-serif}",
    "div{text-align:center}p{color:#8f8c83;font-size:14px}",
    "b{font-size:18px;font-weight:600}</style></head><body><div>",
    "<b>Vaenyx</b>",
    "<p>Starting up… this page will open by itself.<br>",
    "正在启动…这个页面会自己打开。</p>",
    "</div><script>setInterval(function(){",
    'fetch("/v1/system/status",{cache:"no-store"}).then(function(r){',
    "if(r.ok)location.reload()}).catch(function(){})},2000)",
    "</scr" + "ipt></body></html>",
  ].join("");
  return new Response(html, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") {
    return;
  }

  // Network-first for navigations: always try the live index.html so a fresh
  // build is picked up immediately. When the server is unreachable the
  // answer is the self-retrying wait page — never a stale cached shell,
  // whose long-gone hashed assets were exactly the phone's white screen.
  event.respondWith(fetch(event.request).catch(() => bootWaitPage()));
});

// Web Push: something finished — show it. The payload is JSON
// { title, body, url } sent by the local Vaenyx server.
//
// ONE TRAY ENTRY, HOWEVER MANY RESULTS (Oskar, 2026-08-11). Two results used
// to be two separate notifications; native apps fold theirs into one
// expandable group, and the web platform has no API for that group — so this
// builds the equivalent by hand. A push that arrives while nothing is showing
// is a normal, full notification. A push that arrives while one IS showing
// folds every waiting item into a single "Vaenyx (n)" whose body lists one
// item per line — Android renders a multi-line body expandable, which reads
// exactly like the native groups beside it. The digest carries its items in
// notification.data, so the next push extends it instead of starting over,
// and it opens the app's front page: its items point at different places, and
// the front page shows what is new.
const DIGEST_TAG = "vaenyx-digest";

function digestLine(item) {
  const title = (item.title || "Vaenyx").trim();
  const body = (item.body || "").trim();
  const line = body ? title + " — " + body : title;
  return line.length > 70 ? line.slice(0, 69) + "…" : line;
}

async function foldIntoTray(data) {
  // The app is on this screen RIGHT NOW (Oskar, 2026-08-12): the result is
  // already in front of the Owner, and a banner over the very app it is
  // about is noise. The server's presence check covers the common case
  // across devices; this covers THIS device, for every push category.
  // Skipping while a visible window exists is exactly what the browsers'
  // notification quota permits.
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (windows.some((client) => client.visibilityState === "visible")) return;

  const incoming = {
    title: data.title || "Vaenyx",
    body: data.body || "",
    url: data.url || "/",
  };
  // Whatever is still on screen — a single result or an earlier digest —
  // becomes lines of the new digest. Dismissed notifications are gone from
  // getNotifications(), so an emptied tray naturally starts fresh.
  const showing = await self.registration.getNotifications();
  const items = [];
  for (const notification of showing) {
    const held = notification.data && notification.data.items;
    if (Array.isArray(held) && held.length) {
      items.push(...held);
    } else {
      items.push({
        title: notification.title,
        body: notification.body,
        url: (notification.data && notification.data.url) || "/",
      });
    }
    notification.close();
  }
  items.push(incoming);
  if (items.length === 1) {
    await self.registration.showNotification(incoming.title, {
      body: incoming.body,
      icon: "/vaenyx-icon-192.png",
      badge: "/vaenyx-icon-192.png",
      tag: DIGEST_TAG,
      data: { url: incoming.url, items },
    });
    return;
  }
  await self.registration.showNotification("Vaenyx (" + items.length + ")", {
    body: items.map(digestLine).join("\n"),
    icon: "/vaenyx-icon-192.png",
    badge: "/vaenyx-icon-192.png",
    tag: DIGEST_TAG,
    // The tag makes this REPLACE the previous notification; renotify keeps
    // the replacement buzzing, so a folded second result still announces
    // itself the way a separate one would have.
    renotify: true,
    data: { url: "/", items },
  });
}

// Two schedules on the same minute is the normal case, not the rare one — and
// two concurrent handlers would each read the tray before the other wrote it,
// losing an item. One chain serialises them.
let pushChain = Promise.resolve();

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Non-JSON payload: fall back to a generic notification.
  }
  pushChain = pushChain.then(() => foldIntoTray(data)).catch(() => undefined);
  event.waitUntil(pushChain);
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
      const url =
        (event.notification.data && event.notification.data.url) || "/";
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
