import { useEffect, useState } from "react";
import type { AppProfile, RelayConnectRequestView } from "@vaenyx/contracts";
import { useI18n } from "./i18n.js";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Connection request failed.",
    );
  return result as T;
}

export function RelayConnectPanel({ requestId }: { requestId: string }) {
  const { lang } = useI18n(),
    zh = lang === "zh";
  const [entry, setEntry] = useState<RelayConnectRequestView | null>(null);
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    let active = true;
    if (!/^[A-Za-z0-9_-]{43}$/.test(requestId)) {
      setError("RELAY_CONNECT_INVALID_REQUEST");
      return;
    }
    Promise.all([
      request<RelayConnectRequestView>("/v1/app-profiles/connect/" + requestId),
      request<AppProfile[]>("/v1/app-profiles"),
    ])
      .then(([value, apps]) => {
        if (active) {
          setEntry(value);
          setProfiles(apps.filter((p) => p.kind === "relay" && p.enabled));
        }
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Connection request failed.",
          );
      });
    return () => {
      active = false;
    };
  }, [requestId]);
  async function act(approve: boolean) {
    if (!entry || busy || finished || entry.status !== "pending") return;
    setBusy(true);
    setError("");
    try {
      if (!approve) {
        await request("/v1/app-profiles/connect/" + requestId + "/deny", {});
        setFinished(true);
        return;
      }
      const result = await request<{
        code: string;
        state: string;
        return_uri: string;
      }>("/v1/app-profiles/connect/" + requestId + "/approve", {
        profile_id: selected,
        confirmed_origin: entry.client_origin,
      });
      setFinished(true);
      // No credential or handover code in a URL, clipboard, browser store or log.
      // The server-approved exact destination receives only a short-lived PKCE-bound code.
      if (
        result.return_uri !== entry.return_uri ||
        new URL(result.return_uri).origin !== entry.client_origin
      )
        throw new Error("RELAY_CONNECT_ORIGIN_MISMATCH");
      const form = document.createElement("form");
      form.method = "POST";
      form.action = result.return_uri;
      form.hidden = true;
      for (const [name, value] of [
        ["code", result.code],
        ["state", result.state],
      ] as const) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.append(input);
      }
      document.body.append(form);
      form.submit();
      form.remove();
    } catch (e) {
      // Approval responses are single-use; an uncertain response is never retried here.
      setFinished(true);
      setError(e instanceof Error ? e.message : "Connection request failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="loading-screen">
      <section style={{ maxWidth: 600, width: "100%", padding: 24 }}>
        <h1>{zh ? "连接你的 App" : "Connect Your App"}</h1>
        <p>
          {zh
            ? "仅批准你刚刚发起的连接。核对网址，再选择这个 App 已有的钥匙。"
            : "Approve only a connection you just started. Check the website, then select this app’s existing key."}
        </p>
        {error && <p role="alert">{error}</p>}
        {entry ? (
          <>
            <p>
              {zh ? "请求方自报名称" : "Name Supplied By Requester"}:{" "}
              <strong>{entry.client_name}</strong>
            </p>
            <p>
              {zh ? "接收网站" : "Receiving Website"}:{" "}
              <strong style={{ overflowWrap: "anywhere" }}>
                {entry.client_origin}
              </strong>
            </p>
            <p style={{ overflowWrap: "anywhere" }}>
              {zh ? "返回地址" : "Return Address"}: {entry.return_uri}
            </p>
            <ul>
              <li>
                {zh
                  ? "交接现有 App Key；不改变它的权限、型号或订阅登录。"
                  : "Hands over the existing App Key without changing its permissions, model or subscription login."}
              </li>
              <li>
                {zh
                  ? "这不是当前设备专用钥匙。轮换或撤销会影响同一 App 的其他设备。"
                  : "This is not a device-only key. Rotating or revoking it affects other devices using this app key."}
              </li>
              <li>
                {zh
                  ? "不运行研究，不传递 Owner 记忆、其他会话或业务资料。"
                  : "Does not run research or transfer Owner memory, other conversations or business data."}
              </li>
            </ul>
            <label>
              {zh ? "已有 App" : "Existing App"}
              <select
                value={selected}
                disabled={busy || finished || entry.status !== "pending"}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">{zh ? "请选择" : "Choose An App"}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {!profiles.length && (
              <p>
                {zh
                  ? "没有可用 App。请先到设置创建或启用 Relay App。"
                  : "No eligible app. Create or enable a Relay App in Settings first."}
              </p>
            )}
            <p>
              <button
                disabled={
                  !selected || busy || finished || entry.status !== "pending"
                }
                onClick={() => void act(true)}
              >
                {busy
                  ? zh
                    ? "处理中…"
                    : "Working…"
                  : zh
                    ? "批准并返回 App"
                    : "Approve And Return To App"}
              </button>{" "}
              <button
                disabled={busy || finished || entry.status !== "pending"}
                onClick={() => void act(false)}
              >
                {zh ? "拒绝" : "Deny"}
              </button>
            </p>
            {(finished || entry.status !== "pending") && (
              <p>
                {zh
                  ? "此请求已结束。如未完成，请回到 App 重新发起连接。"
                  : "This request has ended. If needed, start a new connection from your app."}
              </p>
            )}
          </>
        ) : (
          !error && (
            <p>{zh ? "正在读取连接请求…" : "Loading Connection Request…"}</p>
          )
        )}
        <a href="/?view=settings">{zh ? "返回设置" : "Back To Settings"}</a>
      </section>
    </main>
  );
}
