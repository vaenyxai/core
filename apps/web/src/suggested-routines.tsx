import { householdKind, householdScenes } from "./household-data";
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

export function suggestedHousehold(
  routines: LibraryRoutineSummary[],
  removedIds: string[],
) {
  return Object.values(householdScenes).flatMap((scene) => {
    const routine = routines.find(
      (r) =>
        r.id === scene.id &&
        householdKind(r.view) !== null &&
        !removedIds.includes(r.id),
    );
    return routine ? [routine] : [];
  });
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
  const [removedIds, setRemovedIds] = useState<string[] | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  const opening = useRef(false);
  useEffect(() => {
    let active = true;
    fetchRoutineShelf()
      .then((shelf) => {
        if (active) {
          setRemovedIds(shelf.removedIds);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, [reload]);
  const dinner = removedIds ? suggestedDinner(routines, removedIds) : undefined;
  const available = removedIds
    ? [...(dinner ? [dinner] : []), ...suggestedHousehold(routines, removedIds)]
    : [];
  if (!available.length && !error) return null;
  async function start(routine: LibraryRoutineSummary) {
    if (opening.current) return;
    opening.current = true;
    setBusy(routine.id);
    setError("");
    try {
      const shelf = await fetchRoutineShelf();
      setRemovedIds(shelf.removedIds);
      if (!shelf.removedIds.includes(routine.id)) await onStart(routine);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      opening.current = false;
      setBusy(null);
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
      {available.map((routine) => {
        const kind = householdKind(routine.view),
          scene = kind ? householdScenes[kind] : null;
        return (
          <button
            key={routine.id}
            className="suggested-routine-card"
            type="button"
            disabled={busy !== null}
            onClick={() => void start(routine)}
          >
            <span className="suggested-routine-icon" aria-hidden="true">
              {scene?.icon ?? "🍽"}
            </span>
            <span className="suggested-routine-copy">
              <strong>{scene ? (zh ? scene.zh : scene.name) : "Dinner"}</strong>
              <span>
                {scene
                  ? scene.hint[zh ? 1 : 0]
                  : zh
                    ? "用手边的食材，安排今晚晚餐。"
                    : "Make tonight’s dinner with what you have."}
              </span>
              <small>
                {scene
                  ? zh
                    ? "拍照、文件或文字 · 模块资料卡"
                    : "Photo, file or text · A clear reference card"
                  : zh
                    ? "拍照或填食材 · 一键做一道菜"
                    : "Photo or ingredients · One tap, one dish"}
              </small>
            </span>
            <span className="suggested-routine-open">
              {busy === routine.id
                ? zh
                  ? "正在打开…"
                  : "Opening…"
                : zh
                  ? "打开 →"
                  : "Open →"}
            </span>
          </button>
        );
      })}
      {error && (
        <div role="alert" className="form-error">
          {error}
          {!available.length && (
            <button type="button" onClick={() => setReload((v) => v + 1)}>
              {zh ? "重试" : "Retry"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
