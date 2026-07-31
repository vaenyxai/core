// CAPABILITIES — the second half of a Method (design: private/docs/
// library-architecture.md §能力, locked 2026-07-31).
//
// A Method is the recipe; a capability is the kitchen equipment. The community
// writes unlimited recipes; only the operator builds equipment. That is the
// whole security story: a Method is "a Skill with the trust direction
// reversed" — a Skill carries the author's script, so you must defend against
// the author's code, while a Method can only REFERENCE what the operator wrote.
// The author never has code. Not a lock added: nothing to pry.
//
// The vocabulary is CLOSED and shared with routine.json and the model-connection
// screen. Two vocabularies would need a lookup table, lookup tables rot, and the
// Owner would see "Picture in" in Settings and "needs vision" on a Method
// without knowing they are the same thing.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CAPABILITIES = [
  "vision",
  "documents",
  "voice-in",
  "voice-out",
  "draw",
  "web",
  "files",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

// Deliberately kept apart from `vision`: reading one receipt and reading thirty
// pages of drawings are different levels of reliability AND of cost, and one
// name for both would turn the capability contract into a lie.
export function isCapability(value: unknown): value is Capability {
  return (
    typeof value === "string" &&
    (CAPABILITIES as readonly string[]).includes(value)
  );
}

// Whose finger is on the trigger, not how dangerous it is. Reactive
// capabilities happen because the Owner pressed something, so they start on;
// autonomous ones — the Method decides when to act, with nobody watching —
// start off. `documents` is off for cost, `draw` because connecting an image
// engine is itself the switch.
export const CAPABILITY_DEFAULT_ON: Record<Capability, boolean> = {
  vision: true,
  "voice-in": true,
  "voice-out": true,
  documents: false,
  draw: false,
  web: false,
  files: false,
};

export class UnknownCapabilityError extends Error {
  readonly unknown: string[];
  constructor(unknown: string[]) {
    super(`MANIFEST_UNKNOWN_CAPABILITY:${unknown.join(",")}`);
    this.name = "UnknownCapabilityError";
    this.unknown = unknown;
  }
}

export interface MethodManifest {
  capabilities: Capability[];
  /** The oldest Vaenyx that can honour this manifest, when the author set one. */
  minimumVersion: string | null;
}

// Read and normalise a Method's manifest.
//
// 🔴 An unknown capability name REFUSES THE RUN. This is the opposite of
// routine.json, which silently drops what it does not recognise — and the
// difference is deliberate. routine.json only draws chips, so dropping one
// costs a label. The manifest is the ENFORCEMENT list: dropping an unknown
// entry would let an old client run a Method WITHOUT a capability it needed,
// while looking perfectly fine. That is the kind of bug nobody ever finds.
export function readMethodManifest(directory: string): MethodManifest {
  const path = join(directory, "manifest.json");
  if (!existsSync(path)) return { capabilities: [], minimumVersion: null };
  try {
    return capabilitiesFromManifest(
      JSON.parse(readFileSync(path, "utf8")) as unknown,
    );
  } catch (error) {
    if (error instanceof UnknownCapabilityError) throw error;
    // A manifest that cannot be read is not an empty manifest. Refuse rather
    // than run with no restrictions at all.
    throw new Error("MANIFEST_UNREADABLE", { cause: error });
  }
}

// The same rules against an already-parsed manifest — LoadedMethod carries one,
// so a run never has to touch the disk again to know what it may reach for.
export function capabilitiesFromManifest(parsed: unknown): MethodManifest {
  const raw =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};

  const declared = Array.isArray(raw.capabilities) ? raw.capabilities : null;
  if (declared) {
    const unknown = declared.filter((entry) => !isCapability(entry));
    if (unknown.length > 0) {
      throw new UnknownCapabilityError(unknown.map((entry) => String(entry)));
    }
    return {
      capabilities: [...new Set(declared as Capability[])],
      minimumVersion:
        typeof raw.minimumVersion === "string" ? raw.minimumVersion : null,
    };
  }

  // The old shape, still on disk in every Method written before today:
  // {"permissions":{"network":false,"readFiles":false}}. Two booleans map
  // straight onto two capabilities, which is exactly how the design says to
  // start. Nothing needs rewriting on disk for a Method to keep working.
  const permissions =
    raw.permissions && typeof raw.permissions === "object"
      ? (raw.permissions as Record<string, unknown>)
      : {};
  const migrated: Capability[] = [];
  if (permissions.network === true) migrated.push("web");
  if (permissions.readFiles === true) migrated.push("files");
  return { capabilities: migrated, minimumVersion: null };
}

// The message the Owner sees when a Method reaches for something it never
// declared. Naming the capability matters: "this Method wants the web but never
// declared it" is actionable, a wrong answer is not.
export function undeclaredCapabilityMessage(capability: Capability): string {
  const plain: Record<Capability, string> = {
    vision: "look at pictures",
    documents: "read multi-page documents",
    "voice-in": "listen",
    "voice-out": "speak",
    draw: "make pictures",
    web: "use the web",
    files: "read files",
  };
  return `This Method tried to ${plain[capability]}, but its manifest never declared that capability. It was refused.`;
}
