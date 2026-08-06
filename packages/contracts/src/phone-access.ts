import { type Static, Type } from "@sinclair/typebox";

// Phone access (onboarding Part 2 section 5): getting the owner's Vaenyx onto
// a phone through their own Tailscale account. Every field here is a REAL
// check the server ran against the tailscale CLI — nothing is guessed, and
// nothing claims public reachability the machine cannot verify (a fresh
// funnel resolves back inside the tailnet from this machine, so only the
// phone itself can prove the public side works).
export const PhoneAccessStatusSchema = Type.Object(
  {
    // The Tailscale client is present on this machine.
    installed: Type.Boolean(),
    version: Type.Union([Type.String(), Type.Null()]),
    // The client is signed in to a tailnet (`tailscale status` reports
    // BackendState "Running").
    signedIn: Type.Boolean(),
    backendState: Type.Union([Type.String(), Type.Null()]),
    // A sign-in URL the CLI is currently offering, if any.
    loginUrl: Type.Union([Type.String(), Type.Null()]),
    // The serve/funnel config forwards public HTTPS to local port 3000.
    tunnelUp: Type.Boolean(),
    // The address a phone opens, when the tunnel is configured.
    phoneUrl: Type.Union([Type.String(), Type.Null()]),
    // Progress of a server-driven `winget install tailscale.tailscale`.
    installPhase: Type.Union([
      Type.Literal("idle"),
      Type.Literal("installing"),
      Type.Literal("failed"),
    ]),
    detail: Type.Union([Type.String(), Type.Null()]),
  },
  {
    $id: "PhoneAccessStatus",
    additionalProperties: false,
  },
);

export type PhoneAccessStatus = Static<typeof PhoneAccessStatusSchema>;

export const PhoneLoginResponseSchema = Type.Object(
  {
    // The URL the Tailscale CLI printed for the browser sign-in; null when
    // the client is already signed in or the CLI did not offer one.
    url: Type.Union([Type.String(), Type.Null()]),
    alreadySignedIn: Type.Boolean(),
    detail: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export type PhoneLoginResponse = Static<typeof PhoneLoginResponseSchema>;

export const PhoneTunnelResponseSchema = Type.Object(
  {
    tunnelUp: Type.Boolean(),
    phoneUrl: Type.Union([Type.String(), Type.Null()]),
    detail: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export type PhoneTunnelResponse = Static<typeof PhoneTunnelResponseSchema>;
