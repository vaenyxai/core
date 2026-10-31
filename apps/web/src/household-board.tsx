import { useEffect, useRef, useState } from "react";
import type {
  RoutineGalleryItem,
  RoutineJournalEntry,
} from "@vaenyx/contracts";
import { runRoutineInChat } from "./api";
import { HouseholdSources } from "./household-sources";
import { HouseholdResult } from "./household-result";
import {
  emptyHousehold,
  hasHouseholdText,
  householdInputKey,
  householdScenes,
  readHouseholdInput,
  readHouseholdOutput,
  type HouseholdInput,
  type HouseholdKind,
} from "./household-data";
import "./dinner-planner.css";
import "./household.css";
export function HouseholdBoard({
  conversationId,
  kind,
  language,
  journal,
  gallery,
  restore,
  onSaved,
}: {
  conversationId: string;
  kind: HouseholdKind;
  language: "en" | "zh";
  journal: RoutineJournalEntry[];
  gallery: RoutineGalleryItem[];
  restore: RoutineJournalEntry | null;
  onSaved: () => Promise<void>;
}) {
  const zh = language === "zh",
    scene = householdScenes[kind];
  const [draft, setDraft] = useState<HouseholdInput>(() =>
    emptyHousehold(language),
  );
  const [result, setResult] = useState<RoutineGalleryItem | null>(null);
  const [resultInput, setResultInput] = useState<HouseholdInput | null>(null);
  const [busy, setBusy] = useState(false),
    [reading, setReading] = useState(false),
    [error, setError] = useState("");
  const hydrated = useRef(false),
    running = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null),
    formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const entries = journal.filter((e) => e.chatId === conversationId);
    const results = gallery.filter((e) => e.chatId === conversationId);
    if (hydrated.current || (!entries.length && !results.length)) return;
    hydrated.current = true;
    const prior = readHouseholdInput(entries[0]?.content),
      last = results[0] ?? null;
    if (prior) setDraft({ ...prior, language });
    setResult(last);
    setResultInput(
      readHouseholdInput(
        entries.find((e) => e.id === last?.journalEntryId)?.content,
      ),
    );
  }, [journal, gallery, language, conversationId]);
  useEffect(() => {
    if (!restore || restore.chatId !== conversationId) return;
    const input = readHouseholdInput(restore.content);
    if (!input) return;
    hydrated.current = true;
    setDraft({ ...input, language });
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [restore, language, conversationId]);
  function change(patch: Partial<HouseholdInput>) {
    hydrated.current = true;
    setDraft((current) => ({ ...current, ...patch }));
  }
  const input = { ...draft, language },
    disabled = busy || reading;
  const stale =
    result &&
    (!resultInput ||
      householdInputKey(input) !== householdInputKey(resultInput));
  async function generate() {
    if (running.current || reading || !hasHouseholdText(input)) return;
    const submitted = readHouseholdInput(input);
    if (!submitted) {
      setError(
        zh ? "请检查输入的资料。" : "Please check the source information.",
      );
      return;
    }
    hydrated.current = true;
    running.current = true;
    setBusy(true);
    setError("");
    outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const response = await runRoutineInChat(
        conversationId,
        submitted.sourceText ||
          (zh ? "整理所附资料" : "Organise attached sources"),
        submitted,
        false,
        submitted.attachments.find((s) => s.kind === "image")?.assetId,
        language,
      );
      if ("needsInput" in response)
        throw new Error(
          zh
            ? "输入未能提交，请检查 Routine 设置。"
            : "Input could not be submitted. Check the Routine settings.",
        );
      setResult(response.galleryItem ?? null);
      setResultInput(submitted);
      if (
        !response.outputValid ||
        !readHouseholdOutput(response.output) ||
        !response.galleryItem
      )
        throw new Error(
          zh
            ? "结果不完整。输入已保留，请重试。"
            : "Incomplete result. Inputs are kept; try again.",
        );
      await onSaved().catch(() => {});
      requestAnimationFrame(() =>
        outputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="dinner-planner household-board">
      <div className="dinner-intro">
        <div>
          <span className="dinner-eyebrow">{scene.name}</span>
          <h2>{zh ? scene.zh : scene.name}</h2>
          <p>{scene.hint[zh ? 1 : 0]}</p>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={disabled}
          onClick={() => {
            change(emptyHousehold(language));
            setError("");
          }}
        >
          {zh ? "清空输入" : "Clear Inputs"}
        </button>
      </div>
      <div className="dinner-layout">
        <form
          className="dinner-form"
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <fieldset className="dinner-module">
            <legend>
              <span>1</span>
              {zh ? "放入资料" : "Your Sources"}
            </legend>
            <HouseholdSources
              kind={kind}
              language={language}
              sources={draft.attachments}
              disabled={disabled}
              onBusy={setReading}
              onRemove={(id) =>
                change({
                  attachments: draft.attachments.filter(
                    (s) => s.assetId !== id,
                  ),
                })
              }
              onChange={(source) => {
                hydrated.current = true;
                setDraft((current) => ({
                  ...current,
                  attachments: current.attachments.some(
                    (s) => s.assetId === source.assetId,
                  )
                    ? current.attachments.map((s) =>
                        s.assetId === source.assetId ? source : s,
                      )
                    : [...current.attachments, source],
                }));
              }}
            />
            <label>
              {zh ? "或粘贴／输入文字" : "Or Paste / Type Text"}
              <textarea
                rows={5}
                maxLength={12000}
                value={draft.sourceText}
                disabled={disabled}
                onChange={(e) => change({ sourceText: e.target.value })}
                placeholder={
                  zh
                    ? "照片读出的内容在各资料卡中，也可以直接在这里输入。"
                    : "Photos are read into their source cards. You can also type directly here."
                }
              />
            </label>
          </fieldset>
          <details className="dinner-module household-corrections">
            <summary>
              {zh ? "补充或更正（选填）" : "Add Or Correct Details (Optional)"}
            </summary>
            <p>
              {zh
                ? "只有需要补充时再填写，不确定的内容可以留空。"
                : "Fill only what needs correcting. Leave uncertain details blank."}
            </p>
            {scene.corrections.map(([key, en, cn, type]) => (
              <label key={key}>
                {zh ? cn : en}
                <input
                  type={type}
                  maxLength={500}
                  value={draft.corrections[key] ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    change({
                      corrections: {
                        ...draft.corrections,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
          </details>
          {error && (
            <p role="alert" className="dinner-error">
              {error}
            </p>
          )}
          <button
            className="dinner-generate"
            type="submit"
            disabled={disabled || !hasHouseholdText(input)}
          >
            {busy
              ? zh
                ? "正在整理…"
                : "Organising…"
              : reading
                ? zh
                  ? "正在读取…"
                  : "Reading…"
                : scene.action[zh ? 1 : 0]}
          </button>
          <p className="dinner-save-note">
            {zh
              ? "结果自动保存在这个对话的记录与图集。"
              : "Results are saved in this conversation’s Journal and Gallery."}
          </p>
        </form>
        <div
          className="household-output"
          ref={outputRef}
          aria-live="polite"
          aria-busy={busy}
        >
          {busy && (
            <p role="status" className="household-progress">
              <span className="dinner-photo-spinner" aria-hidden="true" />{" "}
              {zh
                ? "正在用你选定的模型整理资料…"
                : "Organising with your selected model…"}
            </p>
          )}
          {stale && (
            <p className="dinner-stale">
              {zh
                ? "资料已改变。下方是旧结果，重新整理后更新。"
                : "Sources changed. This is the previous result; organise again to update it."}
            </p>
          )}
          {result ? (
            <>
              <HouseholdResult
                output={result.outputValid ? result.output : null}
                input={resultInput}
                kind={kind}
                language={language}
              />
              <p className="dinner-result-footer">
                {zh ? "已保存 · " : "Saved · "}
                {new Date(result.createdAt).toLocaleString(
                  zh ? "zh-CN" : "en-AU",
                )}
              </p>
            </>
          ) : (
            <div className="dinner-empty">
              <span aria-hidden="true">{scene.icon}</span>
              <h3>{zh ? "资料卡会出现在这里" : "Your Record Goes Here"}</h3>
              <p>
                {zh
                  ? "放入资料后点整理；缺失和不明确的信息会单独标出。"
                  : "Add your sources and organise. Missing or uncertain details will be marked clearly."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
