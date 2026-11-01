import { useEffect, useState } from "react";
import { useI18n } from "./i18n.js";

interface Manifest {
  batch_id: string;
  task_id: string;
  profile_name: string;
  client_origin: string;
  files: {
    id: string;
    name: string;
    sha256: string;
    original_from: number;
    original_to: number;
    allowed_pages: { from: number; to: number };
  }[];
}
async function call(path: string, body?: unknown) {
  const r = await fetch(path, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await r.json();
  if (!r.ok) throw new Error(value.error ?? "Request Failed");
  return value;
}
export function LocalFilesPanel() {
  const { lang } = useI18n(),
    zh = lang === "zh";
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    void call("/v1/app-profiles/local-files")
      .then((r) => setManifest(r.manifest))
      .catch((e) => setMessage(e.message));
  }, []);
  async function act(revoke: boolean) {
    if (!manifest || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await call(
        "/v1/app-profiles/local-files" + (revoke ? "/revoke" : ""),
        revoke
          ? { task_id: manifest.task_id }
          : { batch_id: manifest.batch_id, file_ids: ids },
      );
      setMessage(
        revoke
          ? zh
            ? "已撤销此任务的文件授权。"
            : "File Grants Revoked."
          : (zh
              ? "已授权十分钟。请回到 App 取得已授权文件。"
              : "Authorized For Ten Minutes. Return To Your App And Load Authorized Files.") +
              ` (${result.grants.length})`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request Failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="loading-screen">
      <section style={{ maxWidth: 850, width: "100%", padding: 24 }}>
        <h1>{zh ? "临时本机文件授权" : "Temporary Local Files"}</h1>
        <p>
          {zh
            ? "只能批准操作端预先登记的明确文件。不接受本机路径，不扫描目录，不共享记忆。"
            : "Only explicitly registered files are eligible. No path input, folder scanning or memory access."}
        </p>
        {manifest ? (
          <>
            <p>
              <strong>{manifest.profile_name}</strong> ·{" "}
              {manifest.client_origin}
            </p>
            <p>
              {zh ? "任务" : "Task"}: {manifest.task_id}
            </p>
            <p>
              {zh
                ? "每个引用十分钟有效，仅供此 App 的指定任务使用。文件名和页码映射由操作端提供；不代表模型已经读过。"
                : "Each reference lasts ten minutes for this App and task only. Operator-supplied names and page mappings do not prove model reading."}
            </p>
            {manifest.files.map((f) => (
              <label key={f.id} style={{ display: "block", padding: 8 }}>
                <input
                  type="checkbox"
                  checked={ids.includes(f.id)}
                  disabled={busy}
                  onChange={(e) =>
                    setIds(
                      e.target.checked
                        ? [...ids, f.id]
                        : ids.filter((id) => id !== f.id),
                    )
                  }
                />
                {f.name} · {zh ? "原件页" : "Original Pages"} {f.original_from}–
                {f.original_to}
                <small style={{ display: "block", overflowWrap: "anywhere" }}>
                  SHA-256: {f.sha256}
                </small>
              </label>
            ))}
            <button
              disabled={busy || !ids.length}
              onClick={() => void act(false)}
            >
              {zh
                ? "授权所选文件十分钟"
                : "Authorize Selected Files For Ten Minutes"}
            </button>{" "}
            <button disabled={busy} onClick={() => void act(true)}>
              {zh ? "撤销此任务授权" : "Revoke This Task"}
            </button>
          </>
        ) : (
          <p>{zh ? "尚无可授权文件清单。" : "No Eligible File Manifest."}</p>
        )}
        <p role="status">{message}</p>
        <a href="/?view=settings">{zh ? "返回设置" : "Back To Settings"}</a>
      </section>
    </main>
  );
}
