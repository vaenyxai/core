import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { dataDirectory, databasePath } from "./lib/paths.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];

function add(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function findWindowsCommand(command) {
  if (process.platform !== "win32") return command;

  const found = spawnSync("where.exe", [command], {
    encoding: "utf8",
    shell: false,
    timeout: 10_000,
    windowsHide: true,
  });

  if (found.status !== 0) return command;

  return String(found.stdout).split(/\r?\n/).find(Boolean) ?? command;
}

function findCloudflaredCommand() {
  if (process.env.VAENYX_CLOUDFLARED_COMMAND) {
    return process.env.VAENYX_CLOUDFLARED_COMMAND;
  }

  const localCloudflared = resolve(
    root,
    "private",
    "tools",
    "cloudflared",
    process.platform === "win32" ? "cloudflared.exe" : "cloudflared",
  );

  return existsSync(localCloudflared)
    ? localCloudflared
    : findWindowsCommand("cloudflared");
}

add("Node.js", Number(process.versions.node.split(".")[0]) >= 24, process.versions.node);
const npmCommand = findWindowsCommand(process.platform === "win32" ? "npm.cmd" : "npm");
const npmCliPath =
  process.platform === "win32"
    ? resolve(dirname(npmCommand), "node_modules", "npm", "bin", "npm-cli.js")
    : null;
const npmVersion =
  npmCliPath && existsSync(npmCliPath)
    ? spawnSync(process.execPath, [npmCliPath, "--version"], {
        encoding: "utf8",
        shell: false,
        timeout: 10_000,
        windowsHide: true,
      })
    : spawnSync(npmCommand, ["--version"], {
        encoding: "utf8",
        shell: process.platform === "win32",
        timeout: 10_000,
        windowsHide: true,
      });
const npmMajor =
  npmVersion.status === 0
    ? Number(String(npmVersion.stdout).trim().split(".")[0])
    : 0;
add(
  "npm",
  npmVersion.status === 0 && npmMajor >= 11,
  npmVersion.status === 0 ? String(npmVersion.stdout).trim() : "Not found",
);

const curlCommand = findWindowsCommand("curl.exe");
const curlVersion = spawnSync(curlCommand, ["--version"], {
  encoding: "utf8",
  shell: false,
  timeout: 10_000,
  windowsHide: true,
});
add(
  "Windows curl.exe",
  process.platform !== "win32" || curlVersion.status === 0,
  process.platform !== "win32"
    ? "Not required on this platform"
    : curlVersion.status === 0
      ? String(curlVersion.stdout).split("\n")[0]
      : "Not found",
);

const cloudflaredCommand = findCloudflaredCommand();
const cloudflaredVersion = spawnSync(cloudflaredCommand, ["--version"], {
  encoding: "utf8",
  shell: false,
  timeout: 10_000,
  windowsHide: true,
});
add(
  "Cloudflare Tunnel tool",
  true,
  cloudflaredVersion.status === 0
    ? String(cloudflaredVersion.stdout || cloudflaredVersion.stderr).trim()
    : "Not installed; Vaenyx remains local-only",
);

add("Dependencies", existsSync(resolve(root, "node_modules")), "node_modules");
add("Server build", existsSync(resolve(root, "apps/server/dist/index.js")), "apps/server/dist");
add("Web build", existsSync(resolve(root, "apps/web/dist/index.html")), "apps/web/dist");

const codexScript =
  process.platform === "win32" && process.env.APPDATA
    ? resolve(
        process.env.APPDATA,
        "npm",
        "node_modules",
        "@openai",
        "codex",
        "bin",
        "codex.js",
      )
    : null;
const codexCommand = codexScript && existsSync(codexScript) ? process.execPath : "codex";
const codexArgs = codexScript && existsSync(codexScript) ? [codexScript] : [];
const codexVersion = spawnSync(codexCommand, [...codexArgs, "--version"], {
  encoding: "utf8",
  shell: process.platform === "win32" && !codexScript,
  timeout: 10_000,
  windowsHide: true,
});

if (codexVersion.status === 0) {
  const codexLogin = spawnSync(codexCommand, [...codexArgs, "login", "status"], {
    encoding: "utf8",
    shell: process.platform === "win32" && !codexScript,
    timeout: 10_000,
    windowsHide: true,
  });
  const loginOutput = `${codexLogin.stdout ?? ""}\n${codexLogin.stderr ?? ""}`;
  add("Codex CLI", true, String(codexVersion.stdout).trim());
  add(
    "Codex ChatGPT login",
    codexLogin.status === 0 && /ChatGPT/i.test(loginOutput),
    codexLogin.status === 0 ? loginOutput.trim() : "Not signed in",
  );
} else {
  add("Codex CLI", true, "Not installed; Mock mode remains available");
}

add("Data directory", true, dataDirectory);

if (existsSync(databasePath)) {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  const integrity = database.prepare("PRAGMA integrity_check").get();
  const migrations = database
    .prepare("SELECT COUNT(*) AS count FROM vanta_migrations")
    .get();
  database.close();
  add("Database integrity", integrity?.integrity_check === "ok", "SQLite integrity_check");
  add("Database migrations", true, String(migrations?.count ?? 0));
  add("Database file", true, `${Math.ceil(statSync(databasePath).size / 1024)} KB`);
} else {
  add("Database", true, "Not created yet");
}

try {
  const response = await fetch("http://127.0.0.1:3000/health", {
    signal: AbortSignal.timeout(1500),
  });
  add("Production server", response.ok, "http://127.0.0.1:3000");
} catch {
  add("Production server", true, "Not currently running");
}

console.log("Vaenyx diagnostic report (private content is not shown)");
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "[OK]" : "[FAIL]"} ${check.name}: ${check.detail}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
