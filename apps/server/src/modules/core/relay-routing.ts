// A Relay Key identifies one App profile. Model selection belongs to this instance.
import { randomUUID } from "node:crypto";
import type { RelayRunRequest } from "@vaenyx/contracts";
import type { DatabaseHandle } from "../../db/database.js";
import { relayModelCatalogue, relayProfileEngineStatus } from "./relay.js";
import { apiCatalogue } from "./relay-api.js";
import { isApiEngine } from "./relay-api-config.js";
import { ApiRelayError, refuse } from "./relay-api-wire.js";
export interface RelayChoice {
  engine: string;
  model: string;
  effort?: string;
}
export interface AppRouting {
  revision: string | null;
  primary: RelayChoice | null;
  overrides: Record<string, RelayChoice>;
}
const key = (profile: string) => "relay.routing." + profile;
export function readAppRouting(
  db: DatabaseHandle,
  profile: string,
): AppRouting {
  try {
    const row = db.sqlite
      .prepare("SELECT value FROM instance_settings WHERE key=?")
      .get(key(profile)) as { value: string } | undefined;
    const value = JSON.parse(row?.value ?? "null");
    if (
      value &&
      typeof value.revision === "string" &&
      value.overrides &&
      typeof value.overrides === "object"
    )
      return value;
  } catch {
    /* An absent or corrupt choice is unconfigured, never a model default. */
  }
  return { revision: null, primary: null, overrides: {} };
}
export async function saveAppRouting(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  draft: AppRouting,
  authorized: () => boolean = () => true,
): Promise<AppRouting> {
  const current = readAppRouting(db, profile);
  if (current.revision !== draft.revision) refuse("RELAY_ROUTING_CHANGED");
  const choices = [
    ...(draft.primary
      ? [{ capability: "text_analysis", choice: draft.primary }]
      : []),
    ...Object.entries(draft.overrides).map(([capability, choice]) => ({
      capability,
      choice,
    })),
  ];
  const knownCapabilities = new Set([
    "text_analysis",
    "structured_output",
    "vision_analysis",
    "document_analysis",
    "web_search",
    "research",
  ]);
  if (
    choices.length > 7 ||
    choices.some((x) => !knownCapabilities.has(x.capability))
  )
    refuse("RELAY_ROUTING_INVALID");
  const subscription = await relayModelCatalogue(db, secrets, profile);
  const paid = await apiCatalogue(db, secrets, profile);
  for (const { capability, choice } of choices) {
    if (
      !choice.engine ||
      !choice.model ||
      choice.model.length > 160 ||
      (!isApiEngine(choice.engine) &&
        !["openai-cli", "claude-cli"].includes(choice.engine))
    )
      refuse("RELAY_ROUTING_INVALID");
    const engine = [...subscription.engines, ...paid].find(
      (e) => e.engine === choice.engine,
    );
    const model = engine?.models.find(
      (m) => m.id === choice.model && m.selectable,
    );
    if (!model) refuse("RELAY_MODEL_NOT_AVAILABLE");
    if (
      !model!.verified.some(
        (v) =>
          v.ok &&
          v.capability === capability &&
          (v.effort ?? null) === (choice.effort ?? null),
      )
    )
      refuse("RELAY_MODEL_TEST_REQUIRED");
  }
  if (readAppRouting(db, profile).revision !== current.revision)
    refuse("RELAY_ROUTING_CHANGED");
  if (!authorized()) refuse("RELAY_ROUTING_AUTHORITY_CHANGED");
  const value = {
    revision: randomUUID(),
    primary: draft.primary,
    overrides: draft.overrides,
  };
  db.sqlite
    .prepare(
      "INSERT INTO instance_settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .run(key(profile), JSON.stringify(value));
  return value;
}
export function resolveAppRoute(
  db: DatabaseHandle,
  profile: string,
  request: RelayRunRequest,
): {
  request: RelayRunRequest & {
    engine: NonNullable<RelayRunRequest["engine"]>;
    model: string;
  };
  binding: AppRouting | null;
} {
  const routing = readAppRouting(db, profile);
  const canonical: Record<string, string> = {
    text: "text_analysis",
    vision: "vision_analysis",
    reading: "document_analysis",
    web: "web_search",
  };
  const choice =
    routing.overrides[canonical[request.capability] ?? request.capability] ??
    routing.primary;
  const configured = request.selection === "configured" || choice !== null;
  if (configured) {
    if (!choice) refuse("RELAY_ROUTING_REQUIRED");
    if (
      request.routing_revision &&
      request.routing_revision !== routing.revision
    )
      refuse("RELAY_ROUTING_CHANGED");
    if (
      (request.engine && request.engine !== choice!.engine) ||
      (request.model && request.model !== choice!.model) ||
      (request.effort && request.effort !== choice!.effort)
    )
      refuse("RELAY_SELECTION_MANAGED");
    return {
      request: {
        ...request,
        engine: choice!.engine as NonNullable<RelayRunRequest["engine"]>,
        model: choice!.model,
        effort: choice!.effort,
      },
      binding: routing,
    };
  }
  // Old explicitly selected clients remain compatible until the Owner configures this App.
  if (
    request.engine &&
    !request.model &&
    ["openai-cli", "claude-cli"].includes(request.engine) &&
    !relayProfileEngineStatus(db, profile).engines.find(
      (e) => e.id === request.engine,
    )?.connected
  )
    throw new Error("RELAY_PROFILE_NOT_CONNECTED:" + request.engine);
  if (!request.engine || !request.model)
    throw new ApiRelayError("RELAY_ROUTING_REQUIRED");
  return {
    request: request as RelayRunRequest & {
      engine: NonNullable<RelayRunRequest["engine"]>;
      model: string;
    },
    binding: null,
  };
}
