import { type Static, Type } from "@sinclair/typebox";

export const OWNER_SAFE_ERROR_CODES = [
  "VX-COMPONENT-INSTALL",
  "VX-FORGE-VERIFY",
  "VX-MODEL-AUTH",
  "VX-MODEL-CANCELLED",
  "VX-MODEL-CONNECT",
  "VX-MODEL-INSTALL",
  "VX-MODEL-RESPONSE",
  "VX-MODEL-START",
  "VX-MODEL-TIMEOUT",
  "VX-PHONE-CONNECT",
  "VX-REQUEST",
  "VX-SAFETY-BOUNDARY",
  "VX-UPDATE",
] as const;

export type OwnerSafeErrorCode = (typeof OWNER_SAFE_ERROR_CODES)[number];

export const OwnerSafeErrorCodeSchema = Type.Union(
  OWNER_SAFE_ERROR_CODES.map((code) => Type.Literal(code)),
);

export const OwnerSafeErrorActionSchema = Type.Union([
  Type.Literal("open_settings"),
  Type.Literal("reconnect"),
  Type.Literal("retry"),
  Type.Literal("view_logs"),
]);

export const OwnerSafeErrorSchema = Type.Object(
  {
    action: OwnerSafeErrorActionSchema,
    code: OwnerSafeErrorCodeSchema,
    dataSafe: Type.Literal(true),
    diagnosticId: Type.String({ minLength: 8, maxLength: 40 }),
    message: Type.String(),
    retryable: Type.Boolean(),
  },
  { additionalProperties: false },
);

export type OwnerSafeError = Static<typeof OwnerSafeErrorSchema>;
export type OwnerSafeErrorAction = Static<typeof OwnerSafeErrorActionSchema>;

const COPY: Record<
  OwnerSafeErrorCode,
  {
    action: OwnerSafeErrorAction;
    en: string;
    retryable: boolean;
    zh: string;
  }
> = {
  "VX-COMPONENT-INSTALL": {
    action: "retry",
    retryable: true,
    en: "The optional component did not install. Check the internet connection and press the same Connect button again. Everything else still works and your existing data is safe.",
    zh: "这个可选组件没有装好。检查网络后再点一次同一个连接按钮。其他功能仍可使用,已有数据是安全的。",
  },
  "VX-FORGE-VERIFY": {
    action: "retry",
    retryable: true,
    en: "Forge answered, but Vaenyx could not verify the result. Press Retry. Your existing data is safe.",
    zh: "Forge 已经回答,但 Vaenyx 无法确认结果。请点重试。已有数据是安全的。",
  },
  "VX-MODEL-AUTH": {
    action: "reconnect",
    retryable: false,
    en: "This model connection is using the wrong sign-in type. Open Settings → AI Settings → Models and reconnect it, then try again. Your existing data is safe.",
    zh: "这个模型连接用了不支持的登录方式。到设置 → AI Settings → Models 重新连接,然后再试。已有数据是安全的。",
  },
  "VX-MODEL-CANCELLED": {
    action: "retry",
    retryable: true,
    en: "This run was stopped before it finished. Press Retry when you want to run it again. Your existing data is safe.",
    zh: "这次运行在完成前被停止了。需要时请点重试。已有数据是安全的。",
  },
  "VX-MODEL-CONNECT": {
    action: "reconnect",
    retryable: false,
    en: "The selected model is not connected. Open Settings → AI Settings → Models and reconnect it, then try again. Your existing data is safe.",
    zh: "所选模型尚未连接。到设置 → AI Settings → Models 重新连接,然后再试。已有数据是安全的。",
  },
  "VX-MODEL-INSTALL": {
    action: "open_settings",
    retryable: false,
    en: "The selected model component is not installed. Open Settings → AI Settings → Models and press Connect. Your existing data is safe.",
    zh: "所选模型组件尚未安装。到设置 → AI Settings → Models 点连接。已有数据是安全的。",
  },
  "VX-MODEL-RESPONSE": {
    action: "retry",
    retryable: true,
    en: "The model connection ended before a complete answer arrived. Press Retry; if it repeats, reconnect that model in Settings. Your existing data is safe.",
    zh: "模型连接在完整答案回来前中断了。请点重试;如果再次发生,到设置里重新连接该模型。已有数据是安全的。",
  },
  "VX-MODEL-START": {
    action: "reconnect",
    retryable: true,
    en: "The selected model could not start. Reconnect it under Settings → AI Settings → Models, then press Retry. Your existing data is safe.",
    zh: "所选模型没能启动。到设置 → AI Settings → Models 重新连接,然后点重试。已有数据是安全的。",
  },
  "VX-MODEL-TIMEOUT": {
    action: "retry",
    retryable: true,
    en: "The model took too long to answer. Press Retry. Your existing data is safe.",
    zh: "模型等待太久仍未回答。请点重试。已有数据是安全的。",
  },
  "VX-PHONE-CONNECT": {
    action: "retry",
    retryable: true,
    en: "Phone access could not finish connecting. Press the same button again; if it repeats, open Settings → Phone Access and check the three status lights. Your existing data is safe.",
    zh: "手机访问没有连接完成。请再点一次同一个按钮;如果再次发生,到设置 → 手机访问查看三盏状态灯。已有数据是安全的。",
  },
  "VX-REQUEST": {
    action: "view_logs",
    retryable: true,
    en: "Vaenyx could not complete that request. Press Retry. If it repeats, note the diagnostic number below; redacted details are saved in userdata/logs/owner-errors.log. Your existing data is safe.",
    zh: "Vaenyx 没能完成这次请求。请点重试。如果再次发生,记下下方的诊断编号;隐去敏感信息的详情保存在 userdata/logs/owner-errors.log。已有数据是安全的。",
  },
  "VX-SAFETY-BOUNDARY": {
    action: "retry",
    retryable: true,
    en: "Vaenyx stopped this run because it crossed a safety boundary. Review the request and press Retry. No action outside the boundary was performed and your data is safe.",
    zh: "这次运行越过了安全边界,Vaenyx 已将它停止。检查请求后点重试。边界之外没有执行任何动作,数据是安全的。",
  },
  "VX-UPDATE": {
    action: "retry",
    retryable: true,
    en: "Vaenyx could not prepare the update. The current app and data were not replaced. Press Download again; if it repeats, note the diagnostic number below and check userdata/logs/owner-errors.log.",
    zh: "Vaenyx 没能准备好更新。当前程序和数据都没有被替换。请再点一次下载;如果再次发生,记下下方的诊断编号并查看 userdata/logs/owner-errors.log。",
  },
};

export function ownerSafeErrorCopy(
  code: OwnerSafeErrorCode,
  language: "en" | "zh",
): Pick<OwnerSafeError, "action" | "message" | "retryable"> {
  const copy = COPY[code];
  return {
    action: copy.action,
    message: language === "zh" ? copy.zh : copy.en,
    retryable: copy.retryable,
  };
}

export function formatOwnerSafeError(
  error: OwnerSafeError,
  language: "en" | "zh",
): string {
  const copy = ownerSafeErrorCopy(error.code, language);
  return language === "zh"
    ? `${copy.message} 错误 ${error.code} · 诊断编号 ${error.diagnosticId}`
    : `${copy.message} Error ${error.code} · Diagnostic ${error.diagnosticId}`;
}
