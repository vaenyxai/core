import { useEffect, useRef, useState } from "react";
import type {
  RoutineGalleryItem,
  RoutineJournalEntry,
} from "@vaenyx/contracts";
import { runRoutineInChat } from "./api";
import { DinnerInputs } from "./dinner-inputs";
import { DinnerResult } from "./dinner-result";
import {
  dinnerInputKey,
  emptyDinner,
  simpleDinnerInput,
  readDinnerInput,
  readDinnerOutput,
  type DinnerInput,
} from "./dinner-planner-data";
import "./dinner-planner.css";

export function DinnerPlanner({
  conversationId,
  language,
  journal,
  gallery,
  visionReady,
  restore,
  onSaved,
}: {
  conversationId: string;
  language: "en" | "zh";
  journal: RoutineJournalEntry[];
  gallery: RoutineGalleryItem[];
  visionReady: boolean;
  restore: RoutineJournalEntry | null;
  onSaved: () => Promise<void>;
}) {
  const zh = language === "zh";
  const [draft, setDraft] = useState<DinnerInput>(() => emptyDinner(language));
  const [result, setResult] = useState<RoutineGalleryItem | null>(null);
  const [resultInput, setResultInput] = useState<DinnerInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useRef(false);
  const running = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const ownJournal = journal.filter(
      (entry) => entry.chatId === conversationId,
    );
    const ownGallery = gallery.filter(
      (entry) => entry.chatId === conversationId,
    );
    if (hydrated.current || (!ownJournal.length && !ownGallery.length)) return;
    hydrated.current = true;
    const previous = readDinnerInput(ownJournal[0]?.content);
    const last = ownGallery[0] ?? null;
    const source = ownJournal.find(
      (entry) => entry.id === last?.journalEntryId,
    );
    if (previous) setDraft({ ...previous, language });
    setResult(last);
    setResultInput(readDinnerInput(source?.content));
  }, [journal, gallery, language, conversationId]);
  useEffect(() => {
    if (!restore || restore.chatId !== conversationId) return;
    const input = readDinnerInput(restore.content);
    if (!input) return;
    hydrated.current = true;
    setDraft({ ...input, language });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setError("");
  }, [restore, language, conversationId]);
  function change(patch: Partial<DinnerInput>) {
    hydrated.current = true;
    setDraft((current) => ({ ...current, ...patch }));
  }
  const submitted = simpleDinnerInput({ ...draft, language });
  const stale =
    result &&
    (!resultInput || dinnerInputKey(submitted) !== dinnerInputKey(resultInput));
  const disabled = busy || reading;
  const validResult = result?.outputValid && readDinnerOutput(result.output);
  async function generate() {
    if (running.current || reading) return;
    const input = readDinnerInput({
      ...submitted,
      ingredients: draft.ingredients.trim(),
    });
    if (!input) {
      setError(
        zh
          ? "先拍照或填写食材。"
          : "Take a photo or add some ingredients first.",
      );
      return;
    }
    hydrated.current = true;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await runRoutineInChat(
        conversationId,
        input.ingredients,
        input,
        false,
        input.attachments[0]?.assetId,
        language,
      );
      if ("needsInput" in response)
        throw new Error(
          zh
            ? "输入尚未确认，请检查 Routine 设置。"
            : "The input could not be confirmed. Check the routine settings.",
        );
      setResultInput(input);
      setResult(response.galleryItem ?? null);
      if (
        !response.outputValid ||
        !readDinnerOutput(response.output) ||
        !response.galleryItem
      ) {
        throw new Error(
          zh
            ? "AI 返回的结果不完整。输入已保留，可以重新生成。"
            : "The model returned an incomplete result. Your inputs are kept; try again.",
        );
      }
      // Persistence already succeeded. A refresh failure must not invite a
      // duplicate run or claim that the stored dinner was lost.
      await onSaved().catch(() => {});
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="dinner-planner">
      <div className="dinner-intro">
        <div>
          <span className="dinner-eyebrow">
            {zh ? "Dinner · 今晚吃什么" : "Dinner · Less Deciding, More Living"}
          </span>
          <h2>{zh ? "今晚吃什么？" : "What’s For Dinner?"}</h2>
          <p>
            {zh
              ? "拍照或填食材，一键做一道菜。"
              : "Photo or ingredients. One tap, one dish."}
          </p>
        </div>
        <button
          className="text-button"
          type="button"
          disabled={disabled}
          onClick={() => {
            change(emptyDinner(language));
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
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <DinnerInputs
            conversationId={conversationId}
            language={language}
            draft={draft}
            disabled={disabled}
            visionReady={visionReady}
            onReading={setReading}
            onChange={change}
            onPhoto={(photo, ingredients) => {
              hydrated.current = true;
              setDraft((current) => ({
                ...current,
                attachments: current.attachments.some(
                  (p) => p.assetId === photo.assetId,
                )
                  ? current.attachments.map((item) =>
                      item.assetId === photo.assetId ? photo : item,
                    )
                  : [...current.attachments, photo],
                ingredients: [current.ingredients, ingredients]
                  .filter(Boolean)
                  .join("\n")
                  .slice(0, 6000),
              }));
            }}
          />
          {error && (
            <p role="alert" className="dinner-error">
              {error}
            </p>
          )}
          <button
            className="dinner-generate"
            disabled={disabled || !draft.ingredients.trim()}
            type="submit"
          >
            {busy
              ? zh
                ? "正在安排晚餐…"
                : "Planning Dinner…"
              : reading
                ? zh
                  ? "正在读取照片…"
                  : "Reading Photos…"
                : result
                  ? zh
                    ? "重新生成晚餐方案"
                    : "Plan Dinner Again"
                  : zh
                    ? "生成晚餐方案"
                    : "Plan My Dinner"}
          </button>
          <p className="dinner-save-note" role="status">
            {busy
              ? zh
                ? "正在使用你已连接的模型。输入已保留，请稍候。"
                : "Using your connected model. Your inputs are kept; this may take a moment."
              : zh
                ? "生成后自动保存在这个对话的记录与图集。"
                : "Each run is saved to this conversation’s Journal and Gallery."}
          </p>
        </form>
        <div
          className="dinner-output"
          ref={outputRef}
          aria-live="polite"
          aria-busy={busy}
        >
          {stale && (
            <p className="dinner-stale">
              {zh
                ? "输入已改变。下方是上一份方案，重新生成后才会更新。"
                : "Inputs changed. This is the previous dinner; plan again to update it."}
            </p>
          )}
          {validResult ? (
            <>
              <DinnerResult
                key={result.id}
                output={result.output}
                language={language}
              />
              <div className="dinner-result-footer">
                {zh ? "已保存 · " : "Saved · "}
                {new Date(result.createdAt).toLocaleString(
                  language === "zh" ? "zh-CN" : "en-AU",
                )}
              </div>
            </>
          ) : result ? (
            <DinnerResult output={null} language={language} />
          ) : (
            <div className="dinner-empty">
              <span aria-hidden="true">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="25" cy="24" r="13" />
                  <circle cx="25" cy="24" r="9" />
                  <path d="M5 8v12m4-12v12M5 16h4M7 20v20M43 8v32m0-32c-5 3-5 11 0 14" />
                </svg>
              </span>
              <h3>{zh ? "晚餐方案会出现在这里" : "Your Dinner Goes Here"}</h3>
              <p>
                {zh
                  ? "先填写食材。已有食材、缺少的东西和烹饪步骤，一眼就能看清。"
                  : "Start with your ingredients. See what you have, what’s missing and how to cook it."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
