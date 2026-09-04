// THE LIVE MODEL CATALOGUE, per subscription and per calling profile.
//
// Which models a login may use is the engine's fact, not ours: Codex answers
// `model/list` for the ChatGPT plan behind the login, the Claude SDK answers
// `supportedModels()` for its login. Both change under us, so nothing here is
// a stored list — the answer is fetched from the engine that will run the
// call, cached briefly per profile, and stamped with WHEN it was asked
// (`verified_at`), so a caller's dropdown can say how fresh it is.
//
// Evidence, plainly labelled (live-verified 2026-09-01):
//   * Claude reports the model that actually answered on every assistant
//     message and in the result's modelUsage → `model_reported_by_engine`.
//   * Codex reports no per-turn model. It echoes the thread's configured
//     model, and a model the plan does not allow FAILS the turn with the
//     backend's own words rather than running on a substitute. The catalogue
//     says so per row, and a run's `model_evidence` names which case it is.
import { listCodexRelayModels } from "../harness/codex.js";
import { claudeSubscriptionModels } from "../models/claude-subscription-provider.js";

export type RelayModelEngine = "openai-cli" | "claude-cli";

// Effort tiers each engine's calls may ask for. Codex: from every row of the
// live catalogue (low…xhigh). Claude: the SDK's effort levels; a row that
// does not support effort (Haiku) lists none, and a call naming one there is
// refused rather than quietly dropped.
export const RELAY_ENGINE_EFFORTS: Record<RelayModelEngine, string[]> = {
  "openai-cli": ["low", "medium", "high", "xhigh"],
  "claude-cli": ["low", "medium", "high", "xhigh", "max"],
};

export interface RelayCatalogueModel {
  // The id a call sends. Stable within the engine's own catalogue.
  id: string;
  // What the id resolves to when it is an alias ("sonnet" → "claude-sonnet-5").
  resolved_id: string;
  display_name: string;
  default: boolean;
  selectable: boolean;
  unavailable_reason: string | null;
  efforts: string[];
  default_effort: string | null;
  input: string[];
  upgrade_to: string | null;
  model_reported_by_engine: boolean;
}

export interface RelayModelCatalogue {
  engine: RelayModelEngine;
  verified_at: string;
  default_model: string | null;
  models: RelayCatalogueModel[];
}

const CATALOGUE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { catalogue: RelayModelCatalogue; expiresAt: number }>();

function cacheKey(engine: RelayModelEngine, profileKey: string): string {
  return `${profileKey}|${engine}`;
}

async function fetchCatalogue(
  engine: RelayModelEngine,
  profileKey: string,
  secretsDirectory: string,
): Promise<RelayModelCatalogue> {
  const verifiedAt = new Date().toISOString();
  if (engine === "openai-cli") {
    const rows = await listCodexRelayModels(profileKey);
    const models: RelayCatalogueModel[] = rows.map((row) => ({
      id: row.id,
      resolved_id: row.id,
      display_name: row.displayName,
      default: row.isDefault,
      selectable: !row.hidden,
      unavailable_reason: row.hidden ? "HIDDEN_BY_ENGINE" : null,
      efforts: row.efforts,
      default_effort: row.defaultEffort,
      input: row.inputModalities,
      upgrade_to: row.upgradeTo,
      model_reported_by_engine: false,
    }));
    return {
      engine,
      verified_at: verifiedAt,
      default_model: models.find((model) => model.default)?.id ?? null,
      models,
    };
  }
  const rows = await claudeSubscriptionModels(secretsDirectory, profileKey);
  const models: RelayCatalogueModel[] = rows.map((row) => ({
    id: row.id,
    resolved_id: row.resolvedModel,
    display_name: row.displayName,
    default: row.id === "default",
    selectable: true,
    unavailable_reason: null,
    efforts: row.efforts,
    // The SDK documents "high" as its default tier where effort is supported.
    default_effort: row.efforts.includes("high") ? "high" : null,
    input: ["text", "image", "pdf"],
    upgrade_to: null,
    model_reported_by_engine: true,
  }));
  return {
    engine,
    verified_at: verifiedAt,
    default_model: models.find((model) => model.default)?.id ?? null,
    models,
  };
}

/** The engine's catalogue for this profile — fresh within the last ten
 *  minutes, or asked again. Throws the engine's own login/transport code. */
export async function loadRelayModelCatalogue(
  engine: RelayModelEngine,
  profileKey: string,
  secretsDirectory: string,
  options: { force?: boolean } = {},
): Promise<RelayModelCatalogue> {
  const key = cacheKey(engine, profileKey);
  const hit = cache.get(key);
  if (!options.force && hit && hit.expiresAt > Date.now()) return hit.catalogue;
  const catalogue = await fetchCatalogue(engine, profileKey, secretsDirectory);
  cache.set(key, { catalogue, expiresAt: Date.now() + CATALOGUE_TTL_MS });
  return catalogue;
}

/** What is already known without asking the engine — for health, which must
 *  stay cheap. Null when this profile's catalogue was never fetched. */
export function cachedRelayModelCatalogue(
  engine: RelayModelEngine,
  profileKey: string,
): RelayModelCatalogue | null {
  return cache.get(cacheKey(engine, profileKey))?.catalogue ?? null;
}

/** A login came or went: what its engine listed is no longer the answer. */
export function forgetRelayModelCatalogue(profileKey: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${profileKey}|`)) cache.delete(key);
  }
}

/** The row a caller named — by the id it sends, or by what that id resolves
 *  to — or null when the engine lists nothing of the kind. */
export function findRelayModel(
  catalogue: RelayModelCatalogue,
  requested: string,
): RelayCatalogueModel | null {
  const wanted = requested.trim();
  return (
    catalogue.models.find((model) => model.id === wanted) ??
    catalogue.models.find((model) => model.resolved_id === wanted) ??
    null
  );
}
