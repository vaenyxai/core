/** Bound waiting without pretending a remote cancellation was acknowledged. */
export function researchDeadline<T>(
  work: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    void work.catch(() => {});
    return Promise.reject(new Error("timeout"));
  }
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("timeout"));
    signal.addEventListener("abort", abort, { once: true });
    work
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
