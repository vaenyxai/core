import { useEffect, useRef, useState } from "react";
import type { LibraryRoutineSummary, VaenyxThread } from "@vaenyx/contracts";
import { fetchRoutineShelf } from "./api";
import { isDinnerView } from "./dinner-planner-data";
import "./suggested-routines.css";

export function suggestedDinner(
  routines: LibraryRoutineSummary[],
  removedIds: string[],
) {
  return routines.find(
    (routine) =>
      routine.id === "vaenyx-dinner-planner" &&
      isDinnerView(routine.view) &&
      !removedIds.includes(routine.id),
  );
}

export function existingRoutineConversation(
  threads: VaenyxThread[],
  routineId: string,
) {
  return (
    threads
      .filter(
        (thread) =>
          thread.routineId === routineId &&
          thread.status !== "archived" &&
          thread.conversationId,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
      ?.conversationId ?? null
  );
}

export function SuggestedRoutines({
  routines,
  language,
  onStart,
}: {
  routines: LibraryRoutineSummary[];
  language: "en" | "zh";
  onStart: (routine: LibraryRoutineSummary) => Promise<void>;
}) {
  const zh = language === "zh";
  const [removedIds, setRemovedIds] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const opening = useRef(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    fetchRoutineShelf()
      .then((shelf) => {
        if (active) {
          setRemovedIds(shelf.removedIds);
          setError("");
        }
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
  }, [reload]);
  const routine = removedIds
    ? suggestedDinner(routines, removedIds)
    : undefined;
  if (!routine && !error) return null;
  async function start() {
    if (!routine || opening.current) return;
    opening.current = true;
    setBusy(true);
    setError("");
    try {
      // Honour shelf changes from another device before opening the suggestion.
      const shelf = await fetchRoutineShelf();
      setRemovedIds(shelf.removedIds);
      if (!shelf.removedIds.includes(routine.id)) await onStart(routine);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      opening.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="suggested-routines"
      aria-label={zh ? "推荐 Routine" : "Suggested Routines"}
    >
      <p className="suggested-routines-label">
        {zh ? "从这里开始" : "Try A Routine"}
      </p>
      {routine ? (
        <button
          className="suggested-routine-card"
          type="button"
          disabled={busy}
          onClick={() => void start()}
        >
          <span className="suggested-routine-icon" aria-hidden="true">
            🍽
          </span>
          <span className="suggested-routine-copy">
            <strong>Dinner</strong>
            <span>
              {zh
                ? "用手边的食材，安排今晚晚餐。"
                : "Make tonight’s dinner with what you have."}
            </span>
            <small>
              {zh
                ? "拍照或填食材 · 一键做一道菜"
                : "Photo or ingredients · One tap, one dish"}
            </small>
          </span>
          <span className="suggested-routine-open">
            {busy ? (zh ? "正在打开…" : "Opening…") : zh ? "打开 →" : "Open →"}
          </span>
        </button>
      ) : null}
      {error ? (
        <div role="alert" className="form-error">
          {error}
          {!routine ? (
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
            >
              {zh ? "重试" : "Retry"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
