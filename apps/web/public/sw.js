// Bump this on any change so the browser sees a new service worker, reinstalls,
// and the activate handler below purges every older cache — that is what stops a
// device getting stuck on a stale app shell (phones have no Ctrl+Shift+R).
const CACHE_NAME = "vaenyx-shell-v11";

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
// still booting, mid-restart, or a device whose network cannot get to it. It
// retries by itself every two seconds and reloads into the real app the moment
// the server answers, so nobody is left staring at a dead page wondering
// whether to refresh (Oskar, 2026-08-15, and his "页面自愈" pick).
//
// 🔴 IT MUST STOP SAYING "STARTING UP" WHEN THAT IS NO LONGER TRUE. A restart
// takes about ten seconds. Past that, "starting up… this page will open by
// itself" is a promise the page cannot keep, and the Owner sits watching it
// instead of fixing the one thing that is actually wrong. Twice now (see the
// two incidents below) it cost real time. So after SIX seconds the first line
// is REPLACED — not annotated underneath — with what is actually wrong and
// what to do about it.
//
// THE TWO INCIDENTS THIS WORDING IS PAID FOR BY, both diagnosed the long way:
//
//   2026-08-04 — Vaenyx's own "install Tailscale" button re-ran the MSI over a
//   working Tailscale with `/quiet /norestart`. The `/norestart` was ours. It
//   left Windows on PendingFileRename with the tunnel driver half-replaced, so
//   tailscaled stayed at BackendState=NoState forever: the tunnel was gone and
//   restarting the SERVICE could never fix it. Only rebooting Windows did.
//   Symptom here was this page, forever.
//
//   2026-08-17 — public DNS caches held a NEGATIVE answer for the Funnel
//   hostname. Measured, because three earlier guesses were all wrong: the four
//   authoritative ts.net nameservers each answered correctly 8/8 when asked
//   directly, the tailnet's own zone was 0/12 NXDOMAIN, a deliberately fake
//   name was 12/12 — and the Owner's address was 5/12. So the record was right
//   at the source and "no such name" was cached in the recursive resolvers in
//   between. Roughly one lookup in three failed, and a browser that hears
//   NXDOMAIN remembers it for minutes, which is why it felt totally dead.
//   Re-publishing the funnel did NOT help (5/12 -> 4/15 -> 3/20); the caches
//   simply expired and it returned to 0/15 on its own. Vaenyx, the funnel and
//   the tailnet were healthy throughout — verified by reaching the funnel's
//   public IPv4 directly and getting real JSON back.
//
//   The lesson worth more than the incident: FOUR causes were announced before
//   being verified (IPv6-only DNS, a lying status field, a pending Windows
//   reboot, inconsistent Tailscale nameservers) and all four were wrong. What
//   actually worked was a controlled comparison — a known-good name, a
//   known-bad name, and the suspect name, sampled a dozen times each. Start
//   there.
//
// The common shape: this page appears for problems that are NOT Vaenyx
// starting up, and both times the honest sentence would have saved the day.
function bootWaitPage() {
  const html = [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Vaenyx</title>",
    "<style>body{margin:0;display:grid;place-items:center;min-height:100dvh;",
    "background:#262624;color:#ece9e0;font-family:system-ui,sans-serif}",
    "div{text-align:center;max-width:36em;padding:24px}",
    "p{color:#8f8c83;font-size:14px;line-height:1.55}",
    "ul{color:#8f8c83;font-size:14px;line-height:1.6;text-align:left;",
    "margin:10px auto 0;padding-left:1.1em}li{margin:4px 0}",
    "code{color:#ece9e0;font-size:13px}",
    "b{font-size:18px;font-weight:600}</style></head><body><div>",
    "<b>Vaenyx</b>",
    '<p id="wait">Starting up… this page will open by itself.<br>',
    "正在启动…这个页面会自己打开。</p>",
    // Dot points, not a paragraph — the Owner is reading this while something
    // is broken, and the causes are ordered by how often they are the answer.
    //
    // 🔴 EVERY LINE HERE NEEDS ITS OWN TRAILING SPACE. These are joined with
    // no separator, so a line ending in a word and the next starting with one
    // becomes "may beperfectly fine" — which shipped, and which the Owner read
    // before I did (2026-08-17).
    '<div id="hint" style="display:none">',
    "<p>This device cannot reach Vaenyx's computer. Vaenyx itself may be ",
    "perfectly fine — the usual causes, in order:</p><ul>",
    "<li>That computer is off, asleep, or still booting.</li>",
    // The cause below is the MEASURED one. An earlier version of this page
    // blamed the home router for handing out an IPv6 DNS server; that was
    // wrong, and it was wrong in the Owner's face for a day. What actually
    // happens: the address is correct at its source (all four authoritative
    // nameservers answer it), while ONE of the big public resolvers is holding
    // a cached "no such name". Which resolver is the broken one changes — it
    // was Google one morning and Cloudflare the same evening — so the advice
    // is "use a different one", never a fixed address.
    "<li><b>A public DNS service has this address cached as “does not ",
    "exist”.</b> If the address bar says <code>ERR_NAME_NOT_RESOLVED</code> or ",
    "<code>DNS_PROBE_FINISHED_NXDOMAIN</code>, it is this, and nothing on your ",
    "side is broken. It clears by itself, usually within a few hours. To get ",
    "in now, point this device — or this browser's secure DNS — at a different ",
    "provider (<code>8.8.8.8</code> and <code>1.1.1.1</code> are the two big ",
    "ones, and they fail at different times).</li>",
    "<li>This device is on a different network from the one Vaenyx expects.</li>",
    "</ul>",
    "<p>这台设备连不上 Vaenyx 所在的电脑。Vaenyx 本身可能完全正常 —— ",
    "按可能性排序:</p><ul>",
    "<li>那台电脑关机了、睡着了,或者还在开机。</li>",
    "<li><b>某家公共 DNS 把这个地址记成了「不存在」。</b>如果报的是 ",
    "<code>ERR_NAME_NOT_RESOLVED</code> 或 ",
    "<code>DNS_PROBE_FINISHED_NXDOMAIN</code>,就是这个 —— 你这边什么都没坏。",
    "它会自己过期,通常几个小时。想现在就进去,把这台设备(或这个浏览器的 ",
    "secure DNS)换一家:<code>8.8.8.8</code> 和 <code>1.1.1.1</code> 是两家大的,",
    "而且它们不会同时坏。</li>",
    "<li>这台设备连的网络,跟 Vaenyx 所在的网络对不上。</li>",
    "</ul>",
    // The one address that never needs DNS at all.
    "<p>On the computer Vaenyx runs on, <code>http://127.0.0.1:3000</code> ",
    "always works — it never looks anything up.<br>",
    "在跑 Vaenyx 的那台电脑上,<code>http://127.0.0.1:3000</code> 永远能开 —— ",
    "它根本不查 DNS。</p>",
    "</div>",
    // The clock must survive a reopen. A device that can NEVER connect used to
    // restart the countdown on every visit, so the honest text was the one
    // thing it could never reach. The marker is cleared the moment the server
    // answers, so an ordinary restart still reads as "starting up".
    "</div><script>(function(){",
    'var K="vaenyx.waitSince",t=0;',
    'try{t=parseInt(localStorage.getItem(K)||"0",10)||0}catch(e){}',
    "if(!t){t=Date.now();try{localStorage.setItem(K,String(t))}catch(e){}}",
    "function honest(){",
    'document.getElementById("wait").style.display="none";',
    'document.getElementById("hint").style.display="block"}',
    "if(Date.now()-t>=6000)honest();",
    "setInterval(function(){if(Date.now()-t>=6000)honest();",
    'fetch("/v1/system/status",{cache:"no-store"}).then(function(r){',
    "if(r.ok){try{localStorage.removeItem(K)}catch(e){}location.reload()}",
    "}).catch(function(){})},2000)})()",
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
  // A digest folds several results and its own url is "/" — which used to
  // mean the tap landed on the HOME screen with the news still two taps away
  // (Oskar, 2026-08-18). The tap now opens the FIRST folded item's own
  // conversation (reading order); the sidebar dots carry you to the rest.
  // Resolved at click time, so a digest already sitting in the tray from an
  // older service worker gets the same behaviour.
  const data = event.notification.data || {};
  let url = data.url || "/";
  if (url === "/" && Array.isArray(data.items)) {
    const first = data.items.find(
      (item) => item && item.url && item.url !== "/",
    );
    if (first) url = first.url;
  }
  event.waitUntil(
    (async () => {
      // Tapping the tray means the tray is dealt with: every Vaenyx
      // notification goes, not just the one under the finger — a digest
      // that navigated away but left itself sitting in the tray read as
      // 'nothing happened' (Oskar, 2026-08-18).
      for (const shown of await self.registration.getNotifications()) {
        shown.close();
      }
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
