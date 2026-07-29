// A tiny global toast bus (Oskar, dev.169): every failed action pops a
// dismissable toast instead of relying on inline text the eye can miss.
// api.ts publishes automatically for failed mutations; anything else can call
// showErrorToast directly. Settings save themselves as you change them, which
// is silent by nature — so a success toast says it out loud (Oskar,
// 2026-07-29: "中间要跳出一个保存成功").
export type ToastTone = "error" | "success";

type ToastListener = (message: string, tone: ToastTone) => void;

let listener: ToastListener | null = null;

export function setToastListener(next: ToastListener | null): void {
  listener = next;
}

export function showErrorToast(message: string): void {
  if (message.trim()) listener?.(message.trim(), "error");
}

export function showSavedToast(message: string): void {
  if (message.trim()) listener?.(message.trim(), "success");
}
