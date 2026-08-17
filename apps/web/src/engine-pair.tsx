// WHO DOES THIS JOB, AND WHO STANDS IN (Oskar, 2026-08-16).
//
// Two levels, because a capability now names its own model: pick the ACCOUNT
// first (what you have connected), then a model from that account's own live
// list. The backend supplies the list, so a retired model id cannot be
// offered — and a list that cannot be fetched still lets the current value
// stand rather than blanking a working setting.
//
// The backup half is deliberately identical in shape and deliberately EMPTY
// until the Owner fills it: the app never chooses a stand-in. What it does do
// is say, on every use, that the stand-in answered and why.
import { useEffect, useState } from "react";

import {
  fetchEnginePair,
  fetchProviderModels,
  setEngineChoice,
  type EnginePairValue,
} from "./api";
import { useI18n } from "./i18n";
import { Picker, type PickerOption } from "./picker";
import { showErrorToast } from "./toast";

const NONE = "__none__";
const DEFAULT_MODEL = "__default__";

export function EnginePairPicker({
  slot,
  providerOptions,
  /** Called after a save so the row above can refresh whatever it shows. */
  onChanged,
}: {
  slot: string;
  /** The accounts that can do THIS job, already labelled by the caller. */
  providerOptions: PickerOption[];
  onChanged?: (pair: EnginePairValue) => void;
}) {
  const { lang } = useI18n();
  const zh = lang === "zh";
  const [pair, setPair] = useState<EnginePairValue | null>(null);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<"primary" | "backup" | null>(null);

  useEffect(() => {
    let active = true;
    fetchEnginePair(slot)
      .then((next) => {
        if (active) setPair(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [slot]);

  // One list per account, fetched the first time that account is shown. A
  // failure is not fatal: the model picker then offers the default and
  // whatever is already chosen.
  useEffect(() => {
    const wanted = [pair?.primary?.provider, pair?.backup?.provider].filter(
      (id): id is string => typeof id === "string" && !(id in models),
    );
    for (const id of wanted) {
      void fetchProviderModels(id)
        .then((result) =>
          setModels((current) => ({ ...current, [id]: result.models })),
        )
        .catch(() => setModels((current) => ({ ...current, [id]: [] })));
    }
  }, [pair, models]);

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
          : {
              provider,
              ...(model && model !== DEFAULT_MODEL ? { model } : {}),
            },
      );
      setPair(next);
      onChanged?.(next);
      if (provider !== NONE && !(provider in models)) {
        void fetchProviderModels(provider)
          .then((result) =>
            setModels((current) => ({ ...current, [provider]: result.models })),
          )
          .catch(() =>
            setModels((current) => ({ ...current, [provider]: [] })),
          );
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

  function modelOptions(
    provider: string | undefined,
    chosen: string | undefined,
  ) {
    const listed = provider ? (models[provider] ?? []) : [];
    const options: PickerOption[] = [
      {
        label: zh ? "默认型号" : "Default model",
        value: DEFAULT_MODEL,
      },
      ...listed.map((id) => ({ label: id, value: id })),
    ];
    // A model already chosen but missing from the list (offline, or an id the
    // account no longer lists) stays selectable — blanking a working setting
    // because a list did not load would be worse than showing it.
    if (chosen && !listed.includes(chosen)) {
      options.push({ label: chosen, value: chosen });
    }
    return options;
  }

  if (!pair) return null;

  const rows: { which: "primary" | "backup"; label: string; hint: string }[] = [
    {
      which: "primary",
      label: zh ? "主用" : "Primary",
      hint: zh ? "平时就用它" : "used for this job",
    },
    {
      which: "backup",
      label: zh ? "备用" : "Backup",
      hint: zh
        ? "主用完全答不了时才用,用了会在结果里说明"
        : "used only when the primary cannot answer at all — and said so when it is",
    },
  ];

  return (
    <div className="engine-pair">
      {rows.map((row) => {
        const choice = row.which === "primary" ? pair.primary : pair.backup;
        const providerValue = choice?.provider ?? NONE;
        const modelValue = choice?.model ?? DEFAULT_MODEL;
        return (
          <div className="engine-pair-row" key={row.which}>
            <span className="engine-pair-label">
              {row.label}
              <em>{row.hint}</em>
            </span>
            <div className="engine-pair-controls">
              <Picker
                ariaLabel={`${slot} ${row.which} provider`}
                disabled={busy !== null}
                onChange={(next) => void save(row.which, next, DEFAULT_MODEL)}
                options={[
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
                  ...providerOptions,
                ]}
                value={providerValue}
              />
              {choice ? (
                <Picker
                  ariaLabel={`${slot} ${row.which} model`}
                  disabled={busy !== null}
                  onChange={(next) =>
                    void save(row.which, choice.provider, next)
                  }
                  options={modelOptions(choice.provider, choice.model)}
                  value={modelValue}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
