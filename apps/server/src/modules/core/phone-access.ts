// Phone access (onboarding Part 2 section 5): the server-side half of getting
// Vaenyx onto the owner's phone. Vaenyx binds to 127.0.0.1 only, so a phone —
// even on the same WiFi — reaches it through the owner's own Tailscale
// account: install the client, sign in, then publish local port 3000 with
// `tailscale funnel --bg`, matching the serve shape a hand-run
// Vaenyx-Connect-Tailscale.cmd produces.
//
// Honesty rules baked in here:
//   * every status field comes from actually running the tailscale CLI —
//     nothing is inferred from wishes;
//   * the PUBLIC side is verified from here after all (2026-08-15). The old
//     rule said only the phone could prove it, because this machine's own
//     lookup resolves through MagicDNS back inside the tailnet — true for
//     the OS resolver, not for DNS-over-HTTPS: asking a public resolver
//     over plain HTTPS bypasses MagicDNS entirely. Funnel creates a public
//     DNS record the moment the cloud actually accepts it, so "does the
//     name exist publicly" is exactly the truth the QR code promises — and
//     the Owner's Surface proved the gap: local config said ON, the public
//     name did not exist, the QR led nowhere.
import { randomUUID } from "node:crypto";
import type { DatabaseHandle } from "../../db/database.js";
import { pushLanguage, sendPushToAllDevices } from "./push.js";
import { postInboxNote } from "./inbox-thread.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile, spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

import type {
  PhoneAccessStatus,
  PhoneLoginResponse,
  PhoneTunnelResponse,
} from "@vaenyx/contracts";
import {
  appendBoundedDiagnostic,
  OwnerDiagnosticError,
  ownerSafeErrorText,
} from "../../runtime/owner-safe-errors.js";

// The port the funnel forwards to — Vaenyx's own local port.
const LOCAL_PORT = 3000;

// The fixed sentences these flows produce are read by the Owner in the panel,
// so they follow the app's bilingual rule; the routes pass the language the
// Owner is reading the app in. Raw CLI output is retained only in the bounded,
// redacted local diagnostic log; the UI receives safe copy and a diagnostic ID.
export type PhoneLang = "en" | "zh";

// ── Locating the CLI ──────────────────────────────────────────────────────

// The installed client lives under Program Files (the retired arrangement of
// copying tailscale.exe into private\tools is gone). An env override exists
// so tests can point at a stub instead of the real thing.
export function findTailscaleCommand(): string | null {
  const override = process.env.VAENYX_TAILSCALE_COMMAND;
  if (override) return override;
  if (process.env.NODE_ENV === "test") return null;
  if (process.platform === "win32") {
    // 🔴 NOT ONLY THE ENV VARS. Vaenyx runs as SYSTEM under the watchdog, and
    // that account's environment does not reliably carry ProgramFiles — so
    // this returned null on a machine where Tailscale was installed, running
    // and serving. The consequences were not cosmetic: the screen said
    // "Tailscale is not on this computer yet", and the install button then
    // reinstalled it over the top and wiped the Owner's serve configuration,
    // taking his phone access down (2026-08-08). A lookup that reports
    // "absent" for something present is worse than one that fails loudly.
    const roots = [
      process.env.ProgramFiles,
      process.env["ProgramFiles(x86)"],
      `${process.env.SystemDrive ?? "C:"}\\Program Files`,
      `${process.env.SystemDrive ?? "C:"}\\Program Files (x86)`,
    ];
    for (const root of roots) {
      if (!root) continue;
      const candidate = join(root, "Tailscale", "tailscale.exe");
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }
  // On other platforms the CLI is on PATH when installed; `run` treats a
  // spawn failure as "not installed".
  return "tailscale";
}

/** Does Windows know about a Tailscale service? A second, independent answer
 *  to "is it installed", so one lookup failing cannot green-light an install
 *  that destroys a working configuration. */
export function tailscaleServiceExists(): boolean {
  if (process.platform !== "win32") return false;
  try {
    const result = spawnSync("sc.exe", ["query", "Tailscale"], {
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
    // 1060 = "the specified service does not exist"; anything else means
    // Windows has a record of it.
    return result.status === 0;
  } catch {
    return false;
  }
}

// THE "RESTART THE COMPUTER" FOLKLORE, RETIRED (Oskar, 2026-08-11: a fresh
// test install still would not reach the phone until a reboot). The silent
// MSI, run from the SYSTEM session, reliably COPIES Tailscale but does not
// reliably LEAVE ITS SERVICE RUNNING — and every CLI call needs that service,
// so sign-in "didn't work" until the next boot auto-started it. Starting it
// here is the same cure without the reboot. sc.exe rather than PowerShell:
// present on every Windows install, answers in milliseconds.
async function tailscaleServiceRunning(): Promise<boolean> {
  const result = await run("sc.exe", ["query", "Tailscale"], 5_000);
  return result.ok && /\bRUNNING\b/.test(result.stdout);
}

export async function ensureTailscaleServiceRunning(): Promise<boolean> {
  if (process.platform !== "win32") return true;
  if (await tailscaleServiceRunning()) return true;
  await run("sc.exe", ["start", "Tailscale"], 10_000);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await tailscaleServiceRunning()) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_500));
  }
  return false;
}

interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function run(
  command: string,
  args: string[],
  timeoutMs = 10_000,
): Promise<RunResult> {
  return new Promise((resolveRun) => {
    execFile(
      command,
      args,
      { timeout: timeoutMs, windowsHide: true, encoding: "utf8" },
      (error, stdout, stderr) => {
        resolveRun({ ok: !error, stdout: stdout ?? "", stderr: stderr ?? "" });
      },
    );
  });
}

// ── Parsing (pure, unit-tested) ───────────────────────────────────────────

export interface ParsedBackendStatus {
  backendState: string | null;
  authUrl: string | null;
  dnsName: string | null;
}

// `tailscale status --json`: BackendState is "Running" once signed in,
// "NeedsLogin" (often with an AuthURL) before that.
export function parseBackendStatus(jsonText: string): ParsedBackendStatus {
  try {
    const parsed = JSON.parse(jsonText) as {
      BackendState?: unknown;
      AuthURL?: unknown;
      Self?: { DNSName?: unknown };
    };
    const dnsRaw =
      typeof parsed.Self?.DNSName === "string" ? parsed.Self.DNSName : null;
    return {
      backendState:
        typeof parsed.BackendState === "string" ? parsed.BackendState : null,
      authUrl:
        typeof parsed.AuthURL === "string" && parsed.AuthURL.length > 0
          ? parsed.AuthURL
          : null,
      dnsName: dnsRaw ? dnsRaw.replace(/\.$/, "") : null,
    };
  } catch {
    return { backendState: null, authUrl: null, dnsName: null };
  }
}

// ── The public side, asked directly ───────────────────────────────────────

// Cached briefly: the panel polls every few seconds, and a DNS record does
// not flicker. A fresh tunnel-enable clears the cache so the first status
// read after it asks for real.
let dnsCache: { host: string; at: number; value: boolean | null } = {
  host: "",
  at: 0,
  value: null,
};

export function clearPublicDnsCache(): void {
  dnsCache = { host: "", at: 0, value: null };
}

export async function checkPublicDns(host: string): Promise<boolean | null> {
  if (dnsCache.host === host && Date.now() - dnsCache.at < 30_000) {
    return dnsCache.value;
  }
  const resolvers = [
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
  ];
  let value: boolean | null = null;
  for (const url of resolvers) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) continue;
      const parsed = (await response.json()) as {
        Status?: number;
        Answer?: unknown[];
      };
      // 0 with answers = the name exists; 3 = NXDOMAIN, it does not.
      if (parsed.Status === 0 && (parsed.Answer?.length ?? 0) > 0) {
        value = true;
        break;
      }
      if (parsed.Status === 3) {
        value = false;
        break;
      }
    } catch {
      // Try the next resolver; both failing leaves null = unknown, which the
      // UI treats as "cannot check", never as a verdict.
    }
  }
  dnsCache = { host, at: Date.now(), value };
  return value;
}

/** The one-time approval link Tailscale prints when the tailnet has not
 *  allowed this node to Funnel. One click on that page (signed in) fixes it
 *  for good — so it must reach the Owner as a button, never as a line lost
 *  in CLI output. */
export function findFunnelEnableUrl(text: string): string | null {
  const match = text.match(/https:\/\/login\.tailscale\.com\/f\/[^\s"')]+/);
  return match ? match[0] : null;
}

export interface ParsedServeStatus {
  tunnelUp: boolean;
  phoneUrl: string | null;
}

// `tailscale serve status --json` in the exact shape the live machine runs
// today: a Web entry keyed "host:port" whose "/" handler proxies to
// 127.0.0.1:3000, plus AllowFunnel true for the same key. Only that
// combination counts as "tunnel up" — a tailnet-only serve (no funnel) or a
// forward to some other port is honestly reported as down.
export function parseServeStatus(jsonText: string): ParsedServeStatus {
  try {
    const parsed = JSON.parse(jsonText) as {
      Web?: Record<string, { Handlers?: Record<string, { Proxy?: unknown }> }>;
      AllowFunnel?: Record<string, unknown>;
    };
    for (const [hostPort, entry] of Object.entries(parsed.Web ?? {})) {
      const proxy = entry?.Handlers?.["/"]?.Proxy;
      if (typeof proxy !== "string") continue;
      if (!/^https?:\/\/127\.0\.0\.1:3000\/?$/.test(proxy)) continue;
      if (parsed.AllowFunnel?.[hostPort] !== true) continue;
      const lastColon = hostPort.lastIndexOf(":");
      const host = lastColon > 0 ? hostPort.slice(0, lastColon) : hostPort;
      const port = lastColon > 0 ? hostPort.slice(lastColon + 1) : "443";
      return {
        tunnelUp: true,
        phoneUrl:
          port === "443" ? `https://${host}` : `https://${host}:${port}`,
      };
    }
    return { tunnelUp: false, phoneUrl: null };
  } catch {
    return { tunnelUp: false, phoneUrl: null };
  }
}

// ── Install (winget, same pattern as the Node install in setup) ──────────

interface InstallState {
  phase: PhoneAccessStatus["installPhase"];
  detail: string | null;
}

const installState: InstallState = { phase: "idle", detail: null };

function setInstallFailure(error: unknown, lang: PhoneLang): void {
  installState.phase = "failed";
  installState.detail = ownerSafeErrorText(
    new OwnerDiagnosticError("TAILSCALE_INSTALL_FAILED", error),
    "component-install",
    lang,
  ).text;
}

// INSTALLING TAILSCALE, from Tailscale's own MSI.
//
// It used to shell out to `winget install --id tailscale.tailscale`, and on
// the Owner's machine that answered "No package found matching input
// criteria" and did nothing (2026-08-08). winget is not a dependable way to
// fetch one specific thing: the package id has to exist in whatever source
// that account has configured, the source has to be accepted, and the whole
// mechanism is missing entirely for the SYSTEM account the watchdog usually
// runs Vaenyx under.
//
// The MSI is the vendor's own permanent URL, always the current version, and
// msiexec is in every Windows install. Verified: 36.6 MB, HTTP 200.
//
// Fire-and-poll rather than a long-hanging request: the download takes minutes
// on a slow line. The failure detail is formatted in the language of the click
// that started it, because the exit lands after that request has answered.
// By architecture (sweep, 2026-08-16): the amd64 MSI on Windows-on-ARM
// installs a client whose tunnel driver cannot load, and the retry button
// retried the same wrong package forever.
const TAILSCALE_MSI_URL = `https://pkgs.tailscale.com/stable/tailscale-setup-latest-${
  process.arch === "arm64" ? "arm64" : "amd64"
}.msi`;

export function installTailscale(lang: PhoneLang = "en"): InstallState {
  if (installState.phase === "installing") return installState;
  // 🔴 TWO INDEPENDENT WAYS OF ASKING "IS IT ALREADY HERE", because getting
  // this wrong is destructive rather than merely useless. Running the MSI over
  // a working Tailscale is an upgrade-in-place that resets its serve
  // configuration — the Owner's phone access vanished exactly that way. The
  // executable lookup missed it once already, so the service registration is
  // asked as well: either one saying "installed" is enough to refuse.
  if (findTailscaleCommand() || tailscaleServiceExists()) {
    installState.phase = "idle";
    installState.detail = null;
    return installState;
  }
  installState.phase = "installing";
  installState.detail = null;

  void (async () => {
    const target = join(tmpdir(), `vaenyx-tailscale-${randomUUID()}.msi`);
    try {
      const response = await fetch(TAILSCALE_MSI_URL, { redirect: "follow" });
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }
      await writeFile(target, Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      setInstallFailure(error, lang);
      return;
    }

    // /quiet needs elevation. The watchdog runs Vaenyx as SYSTEM, which has
    // it; an instance started by hand from a normal account does not, and
    // msiexec answers 1603 or 1625. Both cases end at the same place: the
    // manual download link the UI already shows beside this.
    const child = spawn("msiexec", ["/i", target, "/quiet", "/norestart"], {
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: true,
    });
    child.once("error", (error) => {
      setInstallFailure(error, lang);
    });
    child.once("exit", (code) => {
      void rm(target, { force: true });
      // 🔴 SAY IT NEEDS A RESTART RATHER THAN CLAIMING SUCCESS.
      //
      // /norestart is right — a household assistant does not get to reboot
      // somebody's computer — but suppressing the restart is only half the
      // job. Tailscale installs a network driver, and Windows cannot replace
      // files that are in use: it queues them for the next boot and sets
      // PendingFileRenameOperations. Until that boot the daemon never reaches
      // a working state. Reporting "installed" there is a lie the Owner then
      // spends an evening on (2026-08-08): the button looked like it had
      // worked, the phone address stayed dead, and restarting the service
      // could not have helped.
      //
      // 3010 is msiexec's own "success, reboot required" — the ONE reboot
      // verdict this code still believes. It used to also consult the global
      // PendingFileRenameOperations registry flag, and that flag is machine-
      // wide noise: Windows Update, the Node MSI the Vaenyx installer itself
      // just ran, anything — so on a fresh machine every Tailscale install
      // was mislabelled "restart the computer" (Oskar, 2026-08-11).
      if (code === 3010) {
        installState.phase = "failed";
        installState.detail =
          lang === "zh"
            ? "Tailscale 装好了,但要重启电脑才能用 —— Windows 得在重启时替换正在使用的网络驱动。重启后回来点「再查一次」。"
            : "Tailscale is installed, but the computer has to be restarted before it works — Windows replaces the network driver it is using at the next boot. Restart, then press Check Again.";
        return;
      }
      // The command appearing is the only proof that counts — msiexec can
      // report success and still have put nothing where we look. Then start
      // the service the silent install left registered-but-stopped, so the
      // sign-in that follows works NOW rather than after a reboot.
      if (findTailscaleCommand()) {
        installState.phase = "idle";
        installState.detail = null;
        void ensureTailscaleServiceRunning();
        return;
      }
      if (code === 1603 || code === 1625) {
        installState.phase = "failed";
        installState.detail =
          lang === "zh"
            ? "安装需要管理员权限。请用下面的链接自己装一次,然后回来点「再查一次」。"
            : "Installing it needs administrator rights. Use the link below to install it yourself, then press Check Again.";
        return;
      }
      setInstallFailure(`msiexec exit=${code ?? "UNKNOWN"}`, lang);
    });
  })();

  return installState;
}

// ── Status ────────────────────────────────────────────────────────────────

// ── The DNS sentinel ────────────────────────────────────────────────────────
// Third strike of the same outage (2026-08-17 twice, 2026-08-25): a public
// resolver caches NXDOMAIN for the funnel hostname while the record is fine at
// its source, and whichever household device uses that resolver silently
// cannot open Vaenyx. The Owner found each one by a family member's dead
// screen. The server can see it FIRST: every half hour it asks both big
// resolvers about its own name, and a sustained "does not exist" becomes one
// push notification — deliverable exactly then, because Web Push rides FCM,
// not our hostname. Throttled to one alert per 12 hours; recovery resets it.
const SENTINEL_INTERVAL_MS = 30 * 60 * 1000;
const SENTINEL_ALERT_GAP_MS = 12 * 60 * 60 * 1000;
// 🔴 ON DISK, not in memory (Oskar, 2026-08-31: 昨天到现在提示3次了). The
// throttle lived in a variable, the server restarts on every deploy, and a
// deploy-heavy day during an outage re-alerted after every restart. The file
// survives restarts; the 12 hours mean 12 hours.
let sentinelStampPath: string | null = null;
let sentinelTimer: ReturnType<typeof setInterval> | null = null;

function sentinelLastAlertAt(): number {
  if (!sentinelStampPath) return 0;
  try {
    const stamp = Date.parse(readFileSync(sentinelStampPath, "utf8").trim());
    return Number.isNaN(stamp) ? 0 : stamp;
  } catch {
    return 0;
  }
}

function recordSentinelAlert(): void {
  if (!sentinelStampPath) return;
  try {
    writeFileSync(sentinelStampPath, `${new Date().toISOString()}\n`);
  } catch {
    // Best-effort; worst case is one extra alert after a restart.
  }
}

async function sampleResolver(url: string, host: string): Promise<number> {
  let bad = 0;
  for (let i = 0; i < 4; i += 1) {
    try {
      const response = await fetch(`${url}${encodeURIComponent(host)}&type=A`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(4000),
      });
      const parsed = (await response.json()) as { Status?: number };
      if (parsed.Status === 3) bad += 1;
    } catch {
      // Unreachable is not NXDOMAIN; only a lying answer counts.
    }
  }
  return bad;
}

async function sentinelTick(database: DatabaseHandle): Promise<void> {
  try {
    const command = findTailscaleCommand();
    if (!command) return;
    const serveResult = await run(command, ["serve", "status", "--json"]);
    const serve = parseServeStatus(serveResult.stdout);
    if (!serve.tunnelUp || !serve.phoneUrl) return;
    const host = new URL(serve.phoneUrl).hostname;
    const [google, cloudflare] = await Promise.all([
      sampleResolver("https://dns.google/resolve?name=", host),
      sampleResolver("https://cloudflare-dns.com/dns-query?name=", host),
    ]);
    if (google < 2 && cloudflare < 2) {
      // Healthy. Deliberately NOT resetting the throttle: this outage flaps
      // (a resolver's nodes disagree mid-incident), and reset-on-recovery
      // turned one incident into an alert per flap. One warning per 12 hours,
      // full stop — the waiting page carries the fix for anyone who hits it
      // in between.
      return;
    }
    if (Date.now() - sentinelLastAlertAt() < SENTINEL_ALERT_GAP_MS) return;
    recordSentinelAlert();
    const culprit =
      google >= 2 && cloudflare >= 2
        ? "Google + Cloudflare"
        : google >= 2
          ? "Google (8.8.8.8)"
          : "Cloudflare (1.1.1.1)";
    const zh = pushLanguage() === "zh";
    // The one-minute fix, named per culprit: both big resolvers run a public
    // "clear this name from our cache" page, and pressing it heals EVERY
    // device that uses that resolver — not just the one in your hand.
    const purge =
      google >= 2
        ? "dns.google/cache"
        : "one.one.one.one/purge-cache";
    const warning = zh
      ? `${culprit} 这家公共 DNS 正把你的远程地址记成「不存在」。用它解析的设备暂时打不开 Vaenyx —— 设备没坏,通常几小时自愈。可以先到 ${purge} 清一下缓存(有时管用);可靠的修法是把那台设备的 DNS 换到健康的那家。`
      : `The public resolver ${culprit} is currently answering "does not exist" for your remote address. Devices using it cannot open Vaenyx for now — nothing is broken on them, and it usually clears within hours. You can try ${purge} to clear the cache (sometimes works); the reliable fix is pointing that device at the healthy resolver.`;
    // The full warning lives in the Owner's main conversation (2026-08-30:
    // 任何通知都是主对话告诉我); the push announces it, to the Owner's own
    // (User Mode) devices.
    postInboxNote(
      database,
      null,
      zh ? `远程地址预警:\n• ${warning}` : `Remote address warning:\n• ${warning}`,
    );
    // "test" category on purpose: it is the always-send lane, and a warning
    // that some devices cannot reach the app must not depend on a preference
    // that was tuned for chatter. One per 12h keeps it from becoming noise.
    await sendPushToAllDevices(
      database,
      {
        title: zh ? "远程地址预警" : "Remote address warning",
        body: warning,
        url: "/",
        force: true,
      },
      "test",
      { modeId: null },
    );
  } catch {
    // The sentinel never breaks anything else.
  }
}

export function startFunnelDnsSentinel(
  database: DatabaseHandle,
  // Where the alert throttle stamp lives (the caller's data directory), so a
  // restart cannot forget when the last warning went out.
  dataDirectory?: string,
): void {
  if (sentinelTimer) return;
  if (dataDirectory) {
    sentinelStampPath = join(dataDirectory, "dns-sentinel-last-alert.txt");
  }
  sentinelTimer = setInterval(
    () => void sentinelTick(database),
    SENTINEL_INTERVAL_MS,
  );
  sentinelTimer.unref?.();
  // First look two minutes after boot, so a restart during an incident still
  // alerts promptly instead of half an hour later.
  setTimeout(() => void sentinelTick(database), 2 * 60 * 1000).unref?.();
}

export async function getPhoneAccessStatus(): Promise<PhoneAccessStatus> {
  const command = findTailscaleCommand();
  const base: PhoneAccessStatus = {
    installed: false,
    version: null,
    signedIn: false,
    backendState: null,
    loginUrl: null,
    tunnelUp: false,
    phoneUrl: null,
    installPhase: installState.phase,
    detail: installState.detail,
    publiclyResolvable: null,
    funnelEnableUrl: null,
  };
  if (!command) return base;

  const versionResult = await run(command, ["version"]);
  if (!versionResult.ok) return base;
  base.installed = true;
  base.version = versionResult.stdout.split(/\r?\n/)[0]?.trim() || null;

  let statusResult = await run(command, ["status", "--json"]);
  let backend = parseBackendStatus(statusResult.stdout);
  if (!backend.backendState) {
    // The exe is on disk but the CLI cannot reach tailscaled — the service is
    // stopped (a fresh silent install, or a machine that never rebooted after
    // the old advice). Start it and ask once more before reporting.
    if (await ensureTailscaleServiceRunning()) {
      statusResult = await run(command, ["status", "--json"]);
      backend = parseBackendStatus(statusResult.stdout);
    }
  }
  base.backendState = backend.backendState;
  base.signedIn = backend.backendState === "Running";
  base.loginUrl = backend.authUrl ?? capturedLoginUrl;

  if (base.signedIn) {
    const serveResult = await run(command, ["serve", "status", "--json"]);
    const serve = parseServeStatus(serveResult.stdout);
    base.tunnelUp = serve.tunnelUp;
    base.phoneUrl = serve.phoneUrl;
    // Fall back to MagicDNS for the address only when serve is actually
    // configured but printed no host we could parse — never invent a URL for
    // a tunnel that is not up.
    if (serve.tunnelUp && !serve.phoneUrl && backend.dnsName) {
      base.phoneUrl = `https://${backend.dnsName}`;
    }
    if (base.tunnelUp && base.phoneUrl) {
      // The cloud's verdict, not the local config's: the local serve config
      // can say AllowFunnel while Tailscale never published the name — the
      // QR then leads nowhere. Public DNS is the truth the phone will meet.
      try {
        base.publiclyResolvable = await checkPublicDns(
          new URL(base.phoneUrl).hostname,
        );
      } catch {
        base.publiclyResolvable = null;
      }
      if (base.publiclyResolvable === false) {
        // Not published: ask the CLI why. A missing one-time Funnel
        // approval prints its enable link here; the panel turns it into a
        // button.
        const funnelStatus = await run(command, ["funnel", "status"]);
        base.funnelEnableUrl = findFunnelEnableUrl(
          `${funnelStatus.stdout}\n${funnelStatus.stderr}`,
        );
      }
    }
  }
  return base;
}

// ── Sign-in ───────────────────────────────────────────────────────────────

// The `tailscale login` child hosts the browser flow; it keeps running until
// the owner finishes in the browser, so it is left running unref'd and only
// the printed URL is waited for — the same pattern as the Codex CLI login.
let loginInFlight = false;
let capturedLoginUrl: string | null = null;

export async function startTailscaleLogin(
  lang: PhoneLang = "en",
): Promise<PhoneLoginResponse> {
  const command = findTailscaleCommand();
  if (!command) {
    return {
      url: null,
      alreadySignedIn: false,
      detail:
        lang === "zh"
          ? "Tailscale 还没有安装。"
          : "Tailscale is not installed yet.",
    };
  }
  let statusResult = await run(command, ["status", "--json"]);
  let backend = parseBackendStatus(statusResult.stdout);
  if (!backend.backendState) {
    // Same self-heal as the status read: a stopped service is why "sign in"
    // used to do nothing until the machine was rebooted.
    if (await ensureTailscaleServiceRunning()) {
      statusResult = await run(command, ["status", "--json"]);
      backend = parseBackendStatus(statusResult.stdout);
    }
  }
  if (backend.backendState === "Running") {
    capturedLoginUrl = null;
    return { url: null, alreadySignedIn: true, detail: null };
  }
  // The backend may already be offering an auth URL from an earlier attempt.
  if (backend.authUrl) {
    return { url: backend.authUrl, alreadySignedIn: false, detail: null };
  }
  if (loginInFlight && capturedLoginUrl) {
    return { url: capturedLoginUrl, alreadySignedIn: false, detail: null };
  }
  loginInFlight = true;
  const child = spawn(command, ["login"], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  return new Promise((resolveLogin) => {
    let output = "";
    let settled = false;
    const settle = (url: string | null, detail: string | null = null) => {
      if (settled) return;
      settled = true;
      resolveLogin({ url, alreadySignedIn: false, detail });
    };
    const timer = setTimeout(
      () =>
        settle(
          null,
          ownerSafeErrorText(
            new OwnerDiagnosticError("TAILSCALE_LOGIN_TIMEOUT", output),
            "phone-setup",
            lang,
          ).text,
        ),
      15_000,
    );
    timer.unref();
    const scan = (chunk: unknown) => {
      output = appendBoundedDiagnostic(output, chunk);
      const match = output.match(/https:\/\/[^\s"']+/);
      if (match) {
        clearTimeout(timer);
        capturedLoginUrl = match[0].replace(/[).,]+$/, "");
        settle(capturedLoginUrl);
      }
    };
    child.stdout?.on("data", scan);
    child.stderr?.on("data", scan);
    child.once("error", (error) => {
      clearTimeout(timer);
      loginInFlight = false;
      settle(
        null,
        ownerSafeErrorText(
          new OwnerDiagnosticError("TAILSCALE_LOGIN_START_FAILED", error),
          "phone-setup",
          lang,
        ).text,
      );
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      loginInFlight = false;
      if (code === 0) {
        // Sign-in completed (or was already valid) before we saw a URL.
        capturedLoginUrl = null;
        settle(null);
        return;
      }
      settle(
        null,
        ownerSafeErrorText(
          new OwnerDiagnosticError(
            `TAILSCALE_LOGIN_EXITED_${code ?? "UNKNOWN"}`,
            output,
          ),
          "phone-setup",
          lang,
        ).text,
      );
    });
    child.unref();
  });
}

// ── Tunnel ────────────────────────────────────────────────────────────────

// `tailscale funnel --bg 3000` persists the exact serve shape the status
// check looks for. When the tailnet has Funnel disabled the CLI prints an
// admin-console link and fails. The link is parsed separately; raw CLI output
// remains in the redacted diagnostic log and never becomes UI copy.
export async function enablePhoneTunnel(
  lang: PhoneLang = "en",
): Promise<PhoneTunnelResponse> {
  const command = findTailscaleCommand();
  if (!command) {
    return {
      tunnelUp: false,
      phoneUrl: null,
      detail:
        lang === "zh"
          ? "Tailscale 还没有安装。"
          : "Tailscale is not installed yet.",
    };
  }
  const result = await run(
    command,
    ["funnel", "--bg", String(LOCAL_PORT)],
    30_000,
  );
  // A fresh enable changes the public side: the next status read must ask
  // DNS for real instead of serving a cached "not yet".
  clearPublicDnsCache();
  // Trust the re-read config, not the command's own claims.
  const serveResult = await run(command, ["serve", "status", "--json"]);
  const serve = parseServeStatus(serveResult.stdout);
  if (serve.tunnelUp) {
    return { tunnelUp: true, phoneUrl: serve.phoneUrl, detail: null };
  }
  const combined = `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
  return {
    tunnelUp: false,
    phoneUrl: null,
    detail: ownerSafeErrorText(
      new OwnerDiagnosticError("TAILSCALE_FUNNEL_FAILED", combined),
      "phone-setup",
      lang,
    ).text,
  };
}
