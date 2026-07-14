import type { InstanceSettings, SystemStatus } from "@vaenyx/contracts";

export function getStatusCopy(status: SystemStatus | null): string {
  if (!status) {
    return "Connecting to your private Vaenyx Instance";
  }

  return status.status === "ready"
    ? "Your private Vaenyx Instance is ready"
    : "Your Vaenyx Instance needs attention";
}

export function getProviderConnectionCopy(
  providerConnection: InstanceSettings["providerConnection"],
): string {
  if (providerConnection === "chatgpt-connected") {
    return "Connected through ChatGPT / Codex Auth";
  }

  if (providerConnection === "unsupported-auth") {
    return "Codex is signed in, but not with ChatGPT Auth";
  }

  return "Not connected";
}

export function getProviderConnectionDetail(
  providerConnection: InstanceSettings["providerConnection"],
): string {
  if (providerConnection === "chatgpt-connected") {
    return "Vaenyx can use the official Codex harness for approved Forge read-only tasks. Your token stays with Codex and is never sent to the browser.";
  }

  if (providerConnection === "unsupported-auth") {
    return "Forge requires Codex to be signed in with ChatGPT Subscription Auth. Other auth methods stay blocked for this route.";
  }

  return "Run Vaenyx-Connect-Codex.cmd, sign in with ChatGPT, then return here.";
}

export function getCodexAuthCopy(
  authMethod: InstanceSettings["codex"]["authMethod"],
): string {
  if (authMethod === "chatgpt") return "ChatGPT Subscription Auth";
  if (authMethod === "api-key") return "API key auth";
  if (authMethod === "unknown") return "Signed in, unknown method";
  return "Not signed in";
}

export function getRemoteAccessCopy(
  remoteAccess: SystemStatus["remoteAccess"] | null | undefined,
): string {
  if (!remoteAccess) return "Local only";

  if (remoteAccess.cloudflaredServiceStatus === "running") {
    return "Tunnel service running";
  }

  return remoteAccess.cloudflaredInstalled
    ? "Cloudflare ready"
    : "Local only";
}

export function getRemoteAccessDetail(
  remoteAccess: SystemStatus["remoteAccess"] | null | undefined,
): string {
  if (!remoteAccess) {
    return "Remote access readiness has not been checked yet.";
  }

  if (remoteAccess.cloudflaredServiceStatus === "running") {
    return "cloudflared is running as a Windows service. Use only behind the Owner-approved Cloudflare Access policy.";
  }

  if (remoteAccess.cloudflaredInstalled) {
    return "cloudflared is installed. Install the Cloudflare Tunnel service after the Owner-approved Access policy is ready.";
  }

  return "Recommended path: Cloudflare Tunnel with Access. Vaenyx is not exposed to the internet.";
}
