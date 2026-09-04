// WHO DOES THIS JOB, AND WHO STANDS IN (Oskar, 2026-08-16).
//
// Two levels, because a capability now names its own model: pick the ACCOUNT
// first (what you have connected), then a model from that account's own
// adopted list — the models the Owner found, tested and chose to use under
// Models (Oskar, 2026-09-05: 上面只选,不找). A model already chosen but no
// longer adopted still stands rather than blanking a working setting.
//
// Every row but the main model may also FOLLOW the main model: it then uses
// the main model's account and model, and the main model's backup too, so a
// change to the main model changes every follower at once. The main model
// itself is a preselection — Text (chat and every written job) rides on it
// unless pointed elsewhere.
//
// The backup half is deliberately identical in shape and deliberately EMPTY
// until the Owner fills it: the app never chooses a stand-in. What it does do
// is say, on every use, that the stand-in answered and why.
import { useEffect, useState } from "react";

import {
  fetchAdoptedModels,
  fetchEnginePair,
  setEngineChoice,
  type EnginePairValue,
} from "./api";
import { Hint } from "./hint";
import { useI18n } from "./i18n";
import { Picker, type PickerOption } from "./picker";
import { showErrorToast } from "./toast";

const NONE = "__none__";
const DEFAULT_MODEL = "__default__";
/** The server's name for "follow the main model" (engine-slots.ts). */
export const FOLLOW_MAIN = "main";

/** Fired when the MAIN model (or the Text row it feeds) changes, so the
 *  switcher under the chat box — which shows the same value from a different
 *  window — updates with it instead of showing the model chosen before. */
export const MODEL_DEFAULT_CHANGED = "vaenyx:model-default-changed";
/** Fired when a model is adopted or dropped under Models, so every picker
 *  offering "which model" refreshes its list. */
export const ADOPTED_MODELS_CHANGED = "vaenyx:adopted-models-changed";

export function EnginePairPicker({
  slot,
  providerOptions,
  /** Called after a save so the row above can refresh whatever it shows. */
  onChanged,
  renderUnder,
}: {
  slot: string;
  /** The accounts that can do THIS job, already labelled by the caller. */
  providerOptions: PickerOption[];
  onChanged?: (pair: EnginePairValue) => void;
  /** Settings that belong to ONE side because they depend on which engine that
   *  side is set to — Speaking's voice list, above all. It has to sit under
   *  the engine it belongs to: a voice picker floating above both rows is a
   *  list of Gemini voices that silently means nothing the moment the row is
   *  switched to Cloudflare (Oskar, 2026-08-17: voice 的选项是根据不同的模型
   *  才出现的,所以它不应该在最上面). */
  renderUnder?: (
    which: "primary" | "backup",
    providerId: string | null,
  ) => React.ReactNode;
}) {
  const { lang } = useI18n();
  const zh = lang === "zh";
  const [pair, setPair] = useState<EnginePairValue | null>(null);
  // The main model itself, for every other row: "follow" is only offered
  // when the main model's account can do THIS job (a text-only main model
  // cannot suddenly see), and Text may always follow.
  const [mainPair, setMainPair] = useState<EnginePairValue | null>(null);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<"primary" | "backup" | null>(null);
  const isMain = slot === "chat";
  const isText = slot === "text";

  useEffect(() => {
    let active = true;
    function load() {
      fetchEnginePair(slot)
        .then((next) => {
          if (active) setPair(next);
        })
        .catch(() => undefined);
      if (!isMain) {
        fetchEnginePair("chat")
          .then((next) => {
            if (active) setMainPair(next);
          })
          .catch(() => undefined);
      }
    }
    load();
    // A follower shows the main model's real answer, so it re-reads when the
    // main model changes — from this row's neighbour or from the chat box.
    if (!isMain) window.addEventListener(MODEL_DEFAULT_CHANGED, load);
    return () => {
      active = false;
      if (!isMain) window.removeEventListener(MODEL_DEFAULT_CHANGED, load);
    };
  }, [slot, isMain]);

  function mainCanServe(which: "primary" | "backup"): boolean {
    const choice = which === "primary" ? mainPair?.primary : mainPair?.backup;
    return (
      Boolean(choice) &&
      providerOptions.some((option) => option.value === choice?.provider)
    );
  }

  // The adopted lists, all accounts at once — one small read, refreshed when
  // Models adopts or drops one. A failure is not fatal: the model picker then
  // offers the default and whatever is already chosen.
  useEffect(() => {
    let active = true;
    function load() {
      fetchAdoptedModels()
        .then((result) => {
          if (!active) return;
          const next: Record<string, string[]> = {};
          for (const [provider, entries] of Object.entries(result.adopted)) {
            next[provider] = entries.map((entry) => entry.id);
          }
          setModels(next);
        })
        .catch(() => undefined);
    }
    load();
    window.addEventListener(ADOPTED_MODELS_CHANGED, load);
    return () => {
      active = false;
      window.removeEventListener(ADOPTED_MODELS_CHANGED, load);
    };
  }, []);

  async function save(
    which: "primary" | "backup",
    provider: string,
    model: string,
  ): Promise<void> {
    setBusy(which);
    try {
      const next = await setEngineChoice(
        slot,
        which,
        provider === NONE
          ? null
          : provider === FOLLOW_MAIN
            ? { provider: FOLLOW_MAIN }
            : {
                provider,
                ...(model && model !== DEFAULT_MODEL ? { model } : {}),
              },
      );
      setPair(next);
      onChanged?.(next);
      if (isMain || isText) {
        window.dispatchEvent(new Event(MODEL_DEFAULT_CHANGED));
      }
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : zh
            ? "没能保存这个选择。"
            : "That choice could not be saved.",
      );
    } finally {
      setBusy(null);
    }
  }

  // No adopted model, nothing pinned: no second picker at all — the account
  // answers with its own default, and a menu offering only "default" said
  // nothing (Oskar, 2026-09-05). Once models are adopted, the unpinned state
  // is one honest entry among them.
  function modelOptions(
    provider: string | undefined,
    chosen: string | undefined,
  ): PickerOption[] | null {
    const listed = provider ? (models[provider] ?? []) : [];
    if (listed.length === 0 && !chosen) return null;
    const options: PickerOption[] = [
      {
        label: zh ? "未指定(引擎默认)" : "Not pinned (engine default)",
        value: DEFAULT_MODEL,
      },
      ...listed.map((id) => ({ label: id, value: id })),
    ];
    // A model already chosen but missing from the list (dropped from the
    // adopted list, or an id the account no longer offers) stays selectable —
    // blanking a working setting because a list changed would be worse than
    // showing it.
    if (chosen && !listed.includes(chosen)) {
      options.push({ label: chosen, value: chosen });
    }
    return options;
  }

  function providerLabel(id: string): string {
    return providerOptions.find((option) => option.value === id)?.label ?? id;
  }

  if (!pair) return null;

  // "Primary" and "Backup" need no gloss — the words are the explanation
  // (Oskar, 2026-08-17). What is NOT obvious is when the backup fires, so that
  // one sentence lives behind a "?" instead of under every row forever.
  const rows: { which: "primary" | "backup"; label: string; hint?: string }[] =
    [
      { which: "primary", label: zh ? "主用" : "Primary" },
      {
        which: "backup",
        label: zh ? "备用" : "Backup",
        hint: zh
          ? "只有主用完全答不上来时才会用它(额度用完、钥匙失效、对方挂了)。用了会在回复里说明。答得不好不算。"
          : "Used only when the primary cannot answer at all — out of quota, key rejected, provider down. The reply says so when it happens. A poor answer does not count.",
      },
    ];

  return (
    <div className="engine-pair">
      {rows.map((row) => {
        const choice = row.which === "primary" ? pair.primary : pair.backup;
        const follows =
          !isMain && (pair.follows?.[row.which] ?? false);
        const providerValue = follows
          ? FOLLOW_MAIN
          : (choice?.provider ?? NONE);
        const modelValue = choice?.model ?? DEFAULT_MODEL;
        const under = renderUnder?.(row.which, choice?.provider ?? null);
        // A follower can only follow into an account this job can use: the
        // main model on a text-only backend cannot suddenly see.
        const canServe =
          !choice ||
          providerOptions.some((option) => option.value === choice.provider);
        const modelMenu =
          choice && !follows ? modelOptions(choice.provider, choice.model) : null;
        return (
          <div className="engine-pair-side" key={row.which}>
            <div className="engine-pair-row">
              <span className="engine-pair-label">
                {row.label}
                {row.hint ? <Hint text={row.hint} /> : null}
              </span>
              <Picker
                ariaLabel={`${slot} ${row.which} provider`}
                disabled={busy !== null}
                onChange={(next) => void save(row.which, next, DEFAULT_MODEL)}
                options={[
                  // "Off" is a real choice for a capability, but not for the
                  // main model or for Text: an app with nothing to talk to is
                  // not a setting.
                  ...(row.which === "primary" && (isMain || isText)
                    ? []
                    : [
                        {
                          label:
                            row.which === "backup"
                              ? zh
                                ? "不设备用"
                                : "No backup"
                              : zh
                                ? "关闭"
                                : "Off",
                          value: NONE,
                        },
                      ]),
                  // Offered when the main model can do this job (Text
                  // always can), and kept while a row already follows so the
                  // current value never vanishes from its own menu.
                  ...(!isMain && (isText || follows || mainCanServe(row.which))
                    ? [
                        {
                          label:
                            row.which === "backup"
                              ? zh
                                ? "跟随主模型的备用"
                                : "Follow the main model's backup"
                              : zh
                                ? "跟随主模型"
                                : "Follow the main model",
                          value: FOLLOW_MAIN,
                        },
                      ]
                    : []),
                  ...providerOptions,
                ]}
                value={providerValue}
              />
              {choice && modelMenu ? (
                <Picker
                  ariaLabel={`${slot} ${row.which} model`}
                  disabled={busy !== null}
                  onChange={(next) =>
                    void save(row.which, choice.provider, next)
                  }
                  options={modelMenu}
                  value={modelValue}
                />
              ) : (
                // Holds its column so the two rows stay aligned.
                <span className="engine-pair-model-empty" />
              )}
            </div>
            {follows ? (
              // What following means right now, in real names — a row that
              // says "follows" and nothing else makes the Owner work it out.
              <p
                className={
                  canServe
                    ? "engine-pair-follow"
                    : "engine-pair-follow engine-pair-follow-warning"
                }
              >
                {choice
                  ? `${zh ? "现在实际 = " : "Right now = "}${providerLabel(
                      choice.provider,
                    )} / ${choice.model ?? (zh ? "默认型号" : "default model")}${
                      canServe
                        ? ""
                        : zh
                          ? " —— 主模型做不了这一项,请单独选"
                          : " — the main model cannot do this job; choose one here"
                    }`
                  : row.which === "backup"
                    ? zh
                      ? "主模型没有设备用,所以这里也没有"
                      : "The main model has no backup, so neither does this"
                    : zh
                      ? "主模型还没选"
                      : "No main model chosen yet"}
              </p>
            ) : null}
            {under ? <div className="engine-pair-under">{under}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
