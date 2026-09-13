// Bump this on any change so the browser sees a new service worker, reinstalls,
// and the activate handler below purges every older cache — that is what stops a
// device getting stuck on a stale app shell (phones have no Ctrl+Shift+R).
const CACHE_NAME = "vaenyx-shell-v18";

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
    // Filled by the self-diagnosis below: a decisive verdict instead of the
    // three guesses above, once the page has ASKED the public resolvers
    // itself (Oskar, 2026-08-25: 其他用户不应该再出现这个问题).
    '<div id="verdict" style="display:none"></div>',
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
    // 🔴 DIAGNOSE, DON'T GUESS. The device that cannot resolve OUR name can
    // still reach dns.google and cloudflare-dns.com — the 2026-08-25 tablet
    // proved it. So the page asks both: name EXISTS there while this page
    // cannot load -> this device's resolver is lying, said as a verdict with
    // the one working resolver named. Both say NXDOMAIN -> the name really is
    // gone from public DNS for a while. Both unreachable -> no internet.
    "var diagnosed=false;",
    "function verdict(html){var v=document.getElementById('verdict');",
    "v.innerHTML=html;v.style.display='block'}",
    "function ask(url,extra){return fetch(url+encodeURIComponent(location.hostname)+'&type=A',",
    "Object.assign({cache:'no-store'},extra||{})).then(function(r){return r.json()})",
    ".then(function(j){return j.Status}).catch(function(){return null})}",
    "function diagnose(){if(diagnosed)return;diagnosed=true;",
    "Promise.all([ask('https://dns.google/resolve?name='),",
    "ask('https://cloudflare-dns.com/dns-query?name=',{headers:{accept:'application/dns-json'}})",
    "]).then(function(r){var g=r[0],c=r[1];",
    "if(g===null&&c===null){verdict(",
    "'<p><b>Diagnosis: this device has no internet right now.</b><br>诊断:这台设备现在没有网。</p>');return}",
    // One resolver answers, the other says "does not exist": name the broken
    // one. When it is Cloudflare, offer a ONE-TAP button that fires their
    // public purge API (no captcha; verified 2026-08-30) — labelled honestly
    // as "sometimes works", because that day's live test saw the purge
    // accepted yet the poison stay. Google's tool sits behind reCAPTCHA, so
    // it stays a link. The RELIABLE fix is pointing the device at the healthy
    // resolver, and no web page can press that switch for you — a page has no
    // access to a device's DNS settings, button or not (Oskar asked, 08-30).
    // This page already polls the door every 2s and reloads when it answers.
    "window.purgecf=function(){var b=document.getElementById('purgebtn');",
    "if(b){b.disabled=true;b.textContent=b.getAttribute('data-done')}",
    "['A','AAAA'].forEach(function(t){",
    "fetch('https://one.one.one.one/api/v1/purge?domain='+encodeURIComponent(location.hostname)+'&type='+t,",
    "{method:'POST',mode:'no-cors'}).catch(function(){})})};",
    "if(g===0||c===0){var use=g===0?'dns.google (8.8.8.8)':'1.1.1.1';",
    "var bad=g===0?'Cloudflare (1.1.1.1)':'Google (8.8.8.8)';",
    "var tryFix=g===0",
    "?'<button id=\"purgebtn\" onclick=\"purgecf()\" data-done=\"Request sent 已发送 — wait ~1 min\" style=\"font:inherit;padding:8px 14px;border-radius:8px;border:1px solid #666;background:transparent;color:inherit;cursor:pointer\">Ask Cloudflare to clear it — sometimes works · 让 Cloudflare 清掉(有时管用)</button>'",
    ":'<a href=\"https://dns.google/cache\" target=\"_blank\" rel=\"noopener\" style=\"color:inherit\">dns.google/cache</a> — enter <code>'+location.hostname+'</code>, type A, press Flush (sometimes works · 有时管用)';",
    "var goodHost=g===0?'dns.google':'one.one.one.one';",
    "var goodIp=g===0?'8.8.8.8':'1.1.1.1';",
    "var goodName=g===0?'Google':'Cloudflare';",
    "verdict(",
    "'<p><b>Diagnosis: the address EXISTS — the public resolver '+bad+' is answering wrongly for it.</b><br>',",
    "'<b>诊断:地址其实存在 —— 是 '+bad+' 这家公共 DNS 在答错。</b></p>',",
    "'<p>Worth one tap first · 先试一下:</p><p>'+tryFix+'</p>',",
    "'<p>The RELIABLE fix — point this device at <code>'+use+'</code> · 可靠修法 —— 把这台设备指到 <code>'+use+'</code>:<br>',",
    "'Android 安卓 — Settings → Network → Private DNS 私人 DNS → <code>'+goodHost+'</code><br>',",
    "'iPhone/iPad — Wi-Fi → (i) → Configure DNS 配置 DNS → Manual 手动 → <code>'+goodIp+'</code><br>',",
    "'PC/Mac — network adapter DNS 网卡 DNS → <code>'+goodIp+'</code>(or Chrome 设置 → 隐私与安全 → 安全 → Secure DNS → '+goodName+')<br>',",
    "'Fixed 修好后 — this page reloads by itself 本页会自己刷新。</p>');return}",
    "if(g===3&&c===3){verdict(",
    "'<p><b>Diagnosis: the address really is missing from public DNS right now.</b> Nothing on this device is broken — it usually returns within a few hours.<br>',",
    "'<b>诊断:这个地址此刻在公共 DNS 里确实查不到。</b>这台设备没坏 —— 通常几小时内自己恢复。</p>');return}",
    "verdict('<p>Diagnosis was inconclusive — one resolver did not answer.<br>诊断没有定论 —— 有一家解析服务没有应答。</p>');",
    "})}",
    "if(Date.now()-t>=6000){honest();diagnose();}",
    "setInterval(function(){if(Date.now()-t>=6000){honest();diagnose();}",
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

// The notification's pictures travel INSIDE this file (Oskar, 2026-09-13:
// 推送有时是 Chrome 图标). A URL icon is downloaded the moment the
// notification is shown, and when the phone cannot resolve this address right
// then, Chrome silently shows its own logo instead. The badge is a white
// crescent on transparent: Android draws the badge from its alpha alone.
const NOTIFICATION_ICON = "data:image/png;base64,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";
const NOTIFICATION_BADGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAACBklEQVR42u2dYY3DMAxGB6EQCiEQBiUQBiEMBqFQAqEQCqEQvDuplU6n6W6N3caJnqVP6r9Ffp3jOIl7E5EbqiecAAAAIAAAAAEAAAgAAEAAAAACAAAQAD5SEJH49ZxEJG/aLQLAXsPm2ElEVnlvayvObwlA+MfpP50fCEF2uv8KK1053zOA8YDjm4r5LQBIctwiWZBNnJ8LnD+RhuoVP5hg39nMOqBOyNkn3REAOk1Sbg9WwvWcnylF1Ak7u40A0E24GksU43Sp5qpw/rrVgwBQqJm3vx4Abdzv7u2/EsAoenuyIVOubABgBEB5SVlruUfnXwXA4u2PAChPOy1sAMD15Ybuw8/ZAAbloqurolsNANEo/AQA1As/ctGZorQ9h54ArE7j/7ejlz9+c7ky6/Ke/TyN56R8EP7QKgCr+P8wdH5JIXA+G4LXwttudweLwdwigOwoA4qeV+LeAViMZTEYx9IaAHECIBiOJQCgXjJwWhjqHUAyHEsCAAAIQQBgEiYNZSHGQoxSBMU4inGUo9mQYUOGLUk25dmU51gKB7MAwNFEDucCgOPpXNAAAFeUuKQHAK6pclEbALQqoFkHAGhXQ8MmANCyjKZ9AKBtZSsANCGJxq0n1I5oXexANO92ND/Qvt6B+ICDw38GnzBBAAAAAgAAEAAAgAAAAAQAACAAAAABwL1eepzSBxML5IEAAAAASUVORK5CYII=";

// Web Push: something finished — show it. The payload is JSON
// { title, body, url } sent by the local Vaenyx server.
//
// ONE NOTIFICATION PER RESULT (Oskar, 2026-08-21, reversing the 2026-08-11
// hand-built digest). Android already does the grouping natively: several
// notifications from the same app collapse into one expandable stack, each
// row opening and dismissing on its own — the exact pattern he pointed at
// on his own phone. The hand-rolled "Vaenyx (n)" digest fought that: one
// tap had to pick a single destination for many results, and reading one
// news item swept the other away with it. Now each result stands alone —
// read one, the other stays.
//
// The tag is the target URL, so a rerun of the SAME task replaces its own
// older unread copy instead of stacking dated duplicates; renotify keeps
// the replacement buzzing.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Non-JSON payload: fall back to a generic notification.
  }
  event.waitUntil(
    (async () => {
      // 🔴 ONE GATE, AND IT IS THE SERVER'S. This used to skip any push while
      // a Vaenyx window was visible on this device. That was a SECOND gate on
      // top of the server's: schedulePresenceAwarePush already waits ~35s and
      // drops the push if any device reported looking at the app. So a push
      // that arrived here had already survived that decision — and this threw
      // it away anyway. Both of the morning news pushes were sent 1/1 by the
      // server on 2026-08-24 and neither was ever seen (Oskar). A notification
      // the server decided to send is now always shown.
      const url = data.url || "/";
      await self.registration.showNotification(data.title || "Vaenyx", {
        body: data.body || "",
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        tag: "vaenyx-" + url,
        renotify: true,
        data: { url },
      });
    })(),
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

// A window that is already open switches to the target IN PLACE (Oskar,
// 2026-09-13: 点推送要等一两秒): navigate() reloaded the whole app, one to two
// seconds on a phone. The page answers on the port when it handled the open;
// no answer in time (an older build, a sign-in screen) falls back to navigate.
function askWindowToOpen(client, url) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (handled) => {
      if (settled) return;
      settled = true;
      resolve(handled);
    };
    const timer = setTimeout(() => finish(false), 700);
    try {
      const channel = new MessageChannel();
      channel.port1.onmessage = (message) => {
        clearTimeout(timer);
        finish(Boolean(message.data && message.data.ok));
      };
      client.postMessage({ type: "vaenyx:open", url }, [channel.port2]);
    } catch {
      clearTimeout(timer);
      finish(false);
    }
  });
}

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
          if (url !== "/" && !(await askWindowToOpen(client, url))) {
            if ("navigate" in client) {
              try {
                await client.navigate(url);
              } catch {
                // Some browsers refuse navigate() on a focused client; the
                // notification has still done its job of bringing the app up.
              }
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
