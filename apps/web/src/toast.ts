// A tiny global error-toast bus (Oskar, dev.169): every failed action pops
// a dismissable toast instead of relying on inline text the eye can miss.
// api.ts publishes automatically for failed mutations; anything else can
// call showErrorToast directly.
type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

export function setToastListener(next: ToastListener | null): void {
  listener = next;
}

export function showErrorToast(message: string): void {
  if (message.trim()) listener?.(message.trim());
}
