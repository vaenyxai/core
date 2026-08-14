import { describe, expect, it } from "vitest";

import {
  findFunnelEnableUrl,
  parseBackendStatus,
  parseServeStatus,
} from "../src/modules/core/phone-access.js";

// The JSON shapes below are captured from a real `tailscale` 1.98 client —
// the same shapes a live machine's funnel config produces — so the parsers
// are tested against reality, not against what the docs imply. The hostname
// itself is a made-up example: a real machine's tailnet name is personal data
// and must never sit in this repository.
describe("parseBackendStatus", () => {
  it("reads a signed-in backend", () => {
    const parsed = parseBackendStatus(
      JSON.stringify({
        Version: "1.98.4-t9e69045b2-ged3a62f14",
        BackendState: "Running",
        AuthURL: "",
        Self: { DNSName: "example-pc.taile1234.ts.net." },
      }),
    );
    expect(parsed.backendState).toBe("Running");
    expect(parsed.authUrl).toBeNull();
    // The MagicDNS trailing dot is stripped so the name can build a URL.
    expect(parsed.dnsName).toBe("example-pc.taile1234.ts.net");
  });

  it("reads a needs-login backend with an auth URL", () => {
    const parsed = parseBackendStatus(
      JSON.stringify({
        BackendState: "NeedsLogin",
        AuthURL: "https://login.tailscale.com/a/0123456789abcdef",
      }),
    );
    expect(parsed.backendState).toBe("NeedsLogin");
    expect(parsed.authUrl).toBe(
      "https://login.tailscale.com/a/0123456789abcdef",
    );
    expect(parsed.dnsName).toBeNull();
  });

  it("survives non-JSON output", () => {
    const parsed = parseBackendStatus("failed to connect to local tailscaled");
    expect(parsed.backendState).toBeNull();
    expect(parsed.authUrl).toBeNull();
  });
});

describe("parseServeStatus", () => {
  const liveShape = JSON.stringify({
    TCP: { "443": { HTTPS: true } },
    Web: {
      "example-pc.taile1234.ts.net:443": {
        Handlers: { "/": { Proxy: "http://127.0.0.1:3000" } },
      },
    },
    AllowFunnel: { "example-pc.taile1234.ts.net:443": true },
  });

  it("recognises the live machine's funnel-to-3000 shape", () => {
    const parsed = parseServeStatus(liveShape);
    expect(parsed.tunnelUp).toBe(true);
    expect(parsed.phoneUrl).toBe("https://example-pc.taile1234.ts.net");
  });

  it("keeps a non-443 funnel port in the URL", () => {
    const parsed = parseServeStatus(
      JSON.stringify({
        Web: {
          "example-pc.taile1234.ts.net:8443": {
            Handlers: { "/": { Proxy: "http://127.0.0.1:3000" } },
          },
        },
        AllowFunnel: { "example-pc.taile1234.ts.net:8443": true },
      }),
    );
    expect(parsed.tunnelUp).toBe(true);
    expect(parsed.phoneUrl).toBe("https://example-pc.taile1234.ts.net:8443");
  });

  it("reports a tailnet-only serve (no funnel) as down", () => {
    const parsed = parseServeStatus(
      JSON.stringify({
        Web: {
          "example-pc.taile1234.ts.net:443": {
            Handlers: { "/": { Proxy: "http://127.0.0.1:3000" } },
          },
        },
        // AllowFunnel absent: reachable inside the tailnet, not publicly.
      }),
    );
    expect(parsed.tunnelUp).toBe(false);
    expect(parsed.phoneUrl).toBeNull();
  });

  it("ignores a funnel that forwards some other port", () => {
    const parsed = parseServeStatus(
      JSON.stringify({
        Web: {
          "example-pc.taile1234.ts.net:443": {
            Handlers: { "/": { Proxy: "http://127.0.0.1:8080" } },
          },
        },
        AllowFunnel: { "example-pc.taile1234.ts.net:443": true },
      }),
    );
    expect(parsed.tunnelUp).toBe(false);
  });

  it("survives empty and non-JSON output", () => {
    expect(parseServeStatus("{}").tunnelUp).toBe(false);
    expect(parseServeStatus("No serve config").tunnelUp).toBe(false);
  });
});

// The Surface lesson (2026-08-15): local serve config can say "funnel on"
// while the Tailscale cloud never published the name, because the tailnet
// still wants a one-time approval. The CLI prints the approval link — this
// finder must lift it out of real CLI phrasing so the UI can make it a
// button.
describe("findFunnelEnableUrl", () => {
  it("lifts the approval link out of the CLI's warning text", () => {
    const cliText = [
      "Funnel is not enabled on your tailnet.",
      "To enable, visit:",
      "",
      "\thttps://login.tailscale.com/f/funnel?node=nHcc7yqFEt11CNTRL",
      "",
    ].join("\n");
    expect(findFunnelEnableUrl(cliText)).toBe(
      "https://login.tailscale.com/f/funnel?node=nHcc7yqFEt11CNTRL",
    );
  });

  it("stops at quotes and closing brackets around the link", () => {
    expect(
      findFunnelEnableUrl(
        'visit "https://login.tailscale.com/f/funnel?node=abc123" to enable',
      ),
    ).toBe("https://login.tailscale.com/f/funnel?node=abc123");
    expect(
      findFunnelEnableUrl(
        "(see https://login.tailscale.com/f/funnel?node=abc123)",
      ),
    ).toBe("https://login.tailscale.com/f/funnel?node=abc123");
  });

  it("returns null for healthy funnel output and unrelated links", () => {
    const healthy = [
      "# Funnel on:",
      "#     - https://example-pc.taile1234.ts.net",
      "",
      "https://example-pc.taile1234.ts.net (Funnel on)",
      "|-- / proxy http://127.0.0.1:3000",
    ].join("\n");
    expect(findFunnelEnableUrl(healthy)).toBeNull();
    expect(
      findFunnelEnableUrl("https://login.tailscale.com/a/0123456789abcdef"),
    ).toBeNull();
    expect(findFunnelEnableUrl("")).toBeNull();
  });
});
