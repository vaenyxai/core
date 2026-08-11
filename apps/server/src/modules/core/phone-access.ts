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
//   * this machine can NEVER verify the public side of a fresh funnel (its
//     own lookup resolves through MagicDNS back inside the tailnet), so no
//     field claims public reachability — the UI tells the owner the phone is
//     the only real test.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile, spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

import type {
  PhoneAccessStatus,
  PhoneLoginResponse,
  PhoneTunnelResponse,
} from "@vaenyx/contracts";

// The port the funnel forwards to — Vaenyx's own local port.
const LOCAL_PORT = 3000;

// The fixed sentences these flows produce are read by the Owner in the panel,
// so they follow the app's bilingual rule; the routes pass the language the
// Owner is reading the app in. Raw CLI output (winget's last line, a
// tailscale error with its admin-console link) still travels verbatim —
// translating a tool's own words would hide what actually happened.
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
const TAILSCALE_MSI_URL =
  "https://pkgs.tailscale.com/stable/tailscale-setup-latest-amd64.msi";

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
      installState.phase = "failed";
      installState.detail =
        lang === "zh"
          ? `没能下载 Tailscale 安装包(${String(error).slice(0, 100)})。`
          : `Could not download the Tailscale installer (${String(error).slice(0, 100)}).`;
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
      installState.phase = "failed";
      installState.detail =
        lang === "zh"
          ? `没能运行安装程序(${error.message.slice(0, 120)})。`
          : `Could not run the installer (${error.message.slice(0, 120)}).`;
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
      installState.phase = "failed";
      installState.detail =
        code === 1603 || code === 1625
          ? lang === "zh"
            ? "安装需要管理员权限。请用下面的链接自己装一次,然后回来点「再查一次」。"
            : "Installing it needs administrator rights. Use the link below to install it yourself, then press Check Again."
          : lang === "zh"
            ? `安装程序退出,代码 ${code}。`
            : `The installer exited with code ${code}.`;
    });
  })();

  return installState;
}

// ── Status ────────────────────────────────────────────────────────────────

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
          lang === "zh"
            ? "Tailscale 没有及时给出登录链接。"
            : "Tailscale did not print a sign-in link in time.",
        ),
      15_000,
    );
    timer.unref();
    const scan = (chunk: unknown) => {
      output += String(chunk);
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
      settle(null, error.message.slice(0, 200));
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
      const firstLine =
        output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)[0] ??
        (lang === "zh"
          ? "Tailscale 没能开始登录。"
          : "Tailscale could not start the sign-in.");
      settle(null, firstLine.slice(0, 200));
    });
    child.unref();
  });
}

// ── Tunnel ────────────────────────────────────────────────────────────────

// `tailscale funnel --bg 3000` persists the exact serve shape the status
// check looks for. When the tailnet has Funnel disabled the CLI prints an
// admin-console link and fails — that output goes back to the owner verbatim
// enough to act on.
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
    detail:
      combined ||
      (lang === "zh"
        ? "Tailscale Funnel 没能打开。"
        : "Tailscale Funnel could not be turned on."),
  };
}
