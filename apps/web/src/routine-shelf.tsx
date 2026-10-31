import { useEffect, useState, type ReactNode } from "react";
import type { LibraryRoutineSummary } from "@vaenyx/contracts";
import { fetchRoutineShelf, updateRoutineShelf } from "./api";
import { useI18n } from "./i18n";
import "./routine-shelf.css";

export function RoutineShelf({
  routines,
  renderRoutine,
}: {
  routines: LibraryRoutineSummary[];
  renderRoutine: (routine: LibraryRoutineSummary) => ReactNode;
}) {
  const { lang } = useI18n();
  const zh = lang === "zh";
  const [removed, setRemoved] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    fetchRoutineShelf()
      .then((value) => {
        if (active) {
          setRemoved(value.removedIds);
          setError("");
        }
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error ? err.message : "Could not read the Library.",
          );
      });
    return () => {
      active = false;
    };
  }, [reload]);
  async function update(ids: string[], remove: boolean) {
    setBusy(true);
    setError("");
    try {
      const next = await updateRoutineShelf(ids, remove);
      setRemoved(next.removedIds);
      setSelected([]);
      setManaging(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update the Library.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (removed === null)
    return (
      <div role="status">
        {error || (zh ? "正在读取…" : "Reading…")}
        {error ? (
          <button type="button" onClick={() => setReload((v) => v + 1)}>
            {zh ? "重试" : "Retry"}
          </button>
        ) : null}
      </div>
    );
  const active = routines.filter((r) => !removed.includes(r.id));
  const archived = routines.filter((r) => removed.includes(r.id));
  return (
    <div className="routine-shelf">
      {error ? <p role="alert">{error}</p> : null}
      <div className="routine-shelf-heading">
        <h2>{zh ? "可以使用" : "Ready To Use"}</h2>
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => {
            setManaging(!managing);
            setSelected([]);
          }}
        >
          {managing
            ? zh
              ? "取消"
              : "Cancel"
            : zh
              ? "整理资源库"
              : "Organise Library"}
        </button>
      </div>
      {managing ? (
        <div className="routine-shelf-manage">
          <p>
            {zh
              ? "选择要移除的旧 Routine。聊天、照片和结果会保留，可随时恢复。"
              : "Choose old Routines to remove. Chats, photos and results stay, and you can restore them."}
          </p>
          {active.map((r) => (
            <label key={r.id}>
              <input
                type="checkbox"
                disabled={busy}
                checked={selected.includes(r.id)}
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, r.id]
                      : ids.filter((id) => id !== r.id),
                  )
                }
              />
              <span>
                {r.name}
                <small>{r.description}</small>
              </span>
            </label>
          ))}
          <button
            className="primary-button"
            type="button"
            disabled={busy || !selected.length}
            onClick={() => void update(selected, true)}
          >
            {busy
              ? zh
                ? "正在保存…"
                : "Saving…"
              : zh
                ? "从资源库移除所选"
                : "Remove Selected From Library"}
          </button>
        </div>
      ) : (
        <div className="library-list pills">{active.map(renderRoutine)}</div>
      )}
      {!active.length ? (
        <p>
          {zh
            ? "没有启用的 Routine。可以从下方恢复，或新建一个。"
            : "No active Routines. Restore one below or create a new one."}
        </p>
      ) : null}
      {archived.length ? (
        <details className="routine-shelf-removed">
          <summary>
            {zh ? "已移除" : "Removed"} ({archived.length})
          </summary>
          <p>
            {zh
              ? "仅从资源库主列表移除；历史对话继续保留。"
              : "Removed from the main shelf only; existing conversations are preserved."}
          </p>
          {archived.map((r) => (
            <div key={r.id}>
              <span>{r.name}</span>
              <button
                className="secondary-button"
                type="button"
                disabled={busy}
                aria-label={(zh ? "恢复 " : "Restore ") + r.name}
                onClick={() => void update([r.id], false)}
              >
                {zh ? "恢复" : "Restore"}
              </button>
            </div>
          ))}
        </details>
      ) : null}
    </div>
  );
}
