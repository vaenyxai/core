import { useEffect, useState } from "react";
import {
  fetchAppApiProviders,
  connectAppApiProvider,
  disconnectAppApiProvider,
  type AppApiProvider,
} from "./api";
export function RelayApiConnections({
  profileId,
  lang,
}: {
  profileId: string;
  lang: string;
}) {
  const zh = lang === "zh";
  const [rows, setRows] = useState<AppApiProvider[]>([]),
    [selected, setSelected] = useState("gemini"),
    [key, setKey] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let current = true;
    fetchAppApiProviders(profileId)
      .then((r) => {
        if (current) setRows(r.providers);
      })
      .catch(() => {
        if (current)
          setMessage(zh ? "无法读取 API 连接" : "Cannot read API connections");
      });
    return () => {
      current = false;
    };
  }, [profileId, zh]);
  const row = rows.find((p) => p.id === selected);
  async function update(remove = false) {
    if (busy || !row) return;
    setBusy(true);
    setMessage("");
    try {
      if (remove)
        await disconnectAppApiProvider(profileId, row.id, row.revision!);
      else
        await connectAppApiProvider(profileId, {
          provider: row.id,
          api_key: key,
          expected_revision: row.revision,
        });
      setKey("");
      setRows((await fetchAppApiProviders(profileId)).providers);
      setMessage(
        zh
          ? "连接已更新；请在下方为此 App 测试和选择型号"
          : "Connection updated; test and select models for this App below",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : zh
            ? "更新失败"
            : "Update failed",
      );
    } finally {
      setBusy(false);
      setKey("");
    }
  }
  return (
    <section className="settings-card relay-api-connections">
      <h3>
        {zh
          ? "Model APIs · 这个 App 独立使用"
          : "Model APIs · Dedicated to this App"}
      </h3>
      <p>
        {zh
          ? "Key 加密保存在 Vaenyx。厂商按自己的条款和账号计费；连接不会运行模型。"
          : "Keys are encrypted in Vaenyx. Provider terms and account billing apply; connecting does not run a model."}
      </p>
      <label>
        {zh ? "厂商" : "Provider"}{" "}
        <select
          value={selected}
          disabled={busy}
          onChange={(e) => {
            setSelected(e.target.value);
            setKey("");
            setMessage("");
          }}
        >
          {rows.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
              {p.connected ? (zh ? " · 已连接" : " · Connected") : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        {zh ? "API Key" : "API Key"}{" "}
        <input
          type="password"
          autoComplete="off"
          value={key}
          disabled={busy}
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      <button
        className="door-copy"
        type="button"
        disabled={busy || !key.trim() || !row}
        onClick={() => void update()}
      >
        {busy
          ? zh
            ? "处理中…"
            : "Working…"
          : row?.connected
            ? zh
              ? "换 Key"
              : "Replace Key"
            : zh
              ? "连接"
              : "Connect"}
      </button>
      {row?.connected ? (
        <button
          className="door-copy"
          type="button"
          disabled={busy}
          onClick={() => void update(true)}
        >
          {zh ? "断开" : "Disconnect"}
        </button>
      ) : null}
      <p role="status">
        {message ||
          (row?.connected
            ? zh
              ? "已连接；不代表能力测试通过"
              : "Connected; capability tests are separate"
            : zh
              ? "未连接"
              : "Not connected")}
      </p>
    </section>
  );
}
