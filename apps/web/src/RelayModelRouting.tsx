import { useEffect, useState } from "react";
import {
  fetchAppRelayRouting,
  fetchAppRelayModels,
  testAppRelayModel,
  saveAppRelayRouting,
  fetchAppRelayProofs,
  type AppRelayProof,
  type AppRelayRouting,
  type AppRelayCatalogue,
} from "./api";
export function RelayModelRouting({
  profileId,
  lang,
}: {
  profileId: string;
  lang: string;
}) {
  const zh = lang === "zh";
  const [routing, setRouting] = useState<AppRelayRouting>({
      revision: null,
      primary: null,
      overrides: {},
    }),
    [catalogue, setCatalogue] = useState<AppRelayCatalogue>({ engines: [] }),
    [engine, setEngine] = useState(""),
    [model, setModel] = useState(""),
    [effort, setEffort] = useState(""),
    [proofs, setProofs] = useState<AppRelayProof[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let current = true;
    void Promise.all([
      fetchAppRelayRouting(profileId),
      fetchAppRelayProofs(profileId),
    ])
      .then(([value, evidence]) => {
        if (!current) return;
        setProofs(evidence.proofs);
        setRouting(value);
        setEngine(value.primary?.engine ?? "");
        setModel(value.primary?.model ?? "");
        setEffort(value.primary?.effort ?? "");
      })
      .catch(() => {
        if (current)
          setMessage(zh ? "无法读取模型设置" : "Cannot read model settings");
      });
    return () => {
      current = false;
    };
  }, [profileId, zh]);
  const models =
      catalogue.engines.find((e) => e.engine === engine)?.models ?? [],
    selected = models.find((m) => m.id === model);
  const proof = [
    ...proofs,
    ...(selected?.verified ?? []).map((p) => ({ ...p, engine, model })),
  ]
    .filter(
      (p) =>
        p.engine === engine &&
        p.model === model &&
        p.capability === "text_analysis" &&
        (p.effort ?? "") === effort,
    )
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  async function action(kind: "find" | "test" | "use" | "clear") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (kind === "find") {
        setCatalogue(await fetchAppRelayModels(profileId));
        setMessage(
          zh
            ? "目录已更新；工作型号未改变"
            : "Catalogue updated; working selection unchanged",
        );
      }
      if (kind === "test") {
        const r = await testAppRelayModel(profileId, {
          engine,
          model,
          ...(effort ? { effort } : {}),
          capability: "text_analysis",
        });
        setProofs((await fetchAppRelayProofs(profileId)).proofs);
        setMessage(
          r.status === "ok"
            ? zh
              ? "文字测试通过；按使用后生效"
              : "Text test passed; select Use to apply"
            : (r.unavailable_reason ?? (zh ? "测试失败" : "Test failed")),
        );
      }
      if (kind === "use" || kind === "clear") {
        const value = await saveAppRelayRouting(profileId, {
          ...routing,
          primary:
            kind === "clear"
              ? null
              : { engine, model, ...(effort ? { effort } : {}) },
        });
        setRouting(value);
        setMessage(
          zh
            ? "已保存；下一次 App 任务使用新设置"
            : "Saved; the next App task uses this setting",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : zh
            ? "操作失败"
            : "Action failed",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card relay-model-routing">
      <h3>{zh ? "这个 App 使用哪个模型" : "Model For This App"}</h3>
      <p>
        {routing.primary
          ? (zh ? "正在使用：" : "In use: ") +
            routing.primary.engine +
            " / " +
            routing.primary.model
          : zh
            ? "未配置；App 不会偷选默认型号"
            : "Unconfigured; the App will not choose a default model"}
      </p>
      <button
        className="door-copy"
        type="button"
        disabled={busy}
        onClick={() => void action("find")}
      >
        {zh ? "找型号" : "Find Models"}
      </button>
      <label>
        {zh ? "连接" : "Connection"}{" "}
        <select
          value={engine}
          disabled={busy}
          onChange={(e) => {
            setEngine(e.target.value);
            setModel("");
            setEffort("");
            setMessage("");
          }}
        >
          <option value="">{zh ? "选择连接" : "Choose Connection"}</option>
          {catalogue.engines.map((e) => (
            <option
              value={e.engine}
              key={e.engine}
              disabled={e.catalogue_status !== "ok"}
            >
              {e.engine}
              {e.catalogue_status === "ok"
                ? ""
                : " · " + (e.unavailable_reason ?? e.catalogue_status)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {zh ? "型号" : "Model"}{" "}
        <select
          value={model}
          disabled={busy}
          onChange={(e) => {
            setModel(e.target.value);
            setEffort("");
            setMessage("");
          }}
        >
          <option value="">{zh ? "选择型号" : "Choose Model"}</option>
          {models.map((m) => (
            <option value={m.id} key={m.id} disabled={!m.selectable}>
              {m.display_name || m.id}
            </option>
          ))}
        </select>
      </label>
      {selected?.efforts.length ? (
        <label>
          {zh ? "思考等级" : "Effort"}{" "}
          <select
            value={effort}
            disabled={busy}
            onChange={(e) => {
              setEffort(e.target.value);
              setMessage("");
            }}
          >
            <option value="">{zh ? "不指定" : "Not Specified"}</option>
            {selected.efforts.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p>
        {zh
          ? "测试会实际调用所选型号。API 可能计费；订阅使用其已有额度。没有自动付费备用。"
          : "Testing calls the selected model. APIs may charge; subscriptions use their allowance. No automatic paid fallback."}
      </p>
      <button
        className="door-copy"
        type="button"
        disabled={busy || !selected}
        onClick={() => void action("test")}
      >
        {zh ? "测试" : "Test"}
      </button>
      <button
        className="door-copy"
        type="button"
        disabled={busy || !selected || !proof?.ok}
        onClick={() => void action("use")}
      >
        {zh ? "使用" : "Use"}
      </button>
      <button
        className="door-copy"
        type="button"
        disabled={busy || !routing.primary}
        onClick={() => void action("clear")}
      >
        {zh ? "取消分配" : "Clear Selection"}
      </button>
      <p>
        {proof
          ? (proof.ok
              ? zh
                ? "✓ 最近测试通过 · "
                : "✓ Last Test Passed · "
              : zh
                ? "✗ 最近测试失败 · "
                : "✗ Last Test Failed · ") +
            new Date(proof.at).toLocaleString() +
            (proof.reason ? " · " + proof.reason : "")
          : zh
            ? "未测试 / 需要重测"
            : "Not Tested / Retest Required"}
      </p>
      <p role="status">{busy ? (zh ? "处理中…" : "Working…") : message}</p>
    </section>
  );
}
