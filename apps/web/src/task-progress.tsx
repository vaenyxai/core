import type { TaskRunProgress } from "@vaenyx/contracts";

const TERMINAL_STATES = new Set<TaskRunProgress["state"]>([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
]);

export function acceptTaskProgressUpdate(
  current: TaskRunProgress | null,
  next: TaskRunProgress | null,
): TaskRunProgress | null {
  if (!next) return current;
  if (!current) return next;
  if (next.runId === current.runId) {
    return next.revision > current.revision ? next : current;
  }
  return next.startedAt >= current.startedAt ? next : current;
}

function stateLabel(state: TaskRunProgress["state"], zh: boolean): string {
  const labels: Record<TaskRunProgress["state"], [string, string]> = {
    queued: ["Queued", "等待开始"],
    running: ["Running", "进行中"],
    waiting_for_owner: ["Waiting for you", "等待你的回复"],
    completed: ["Completed", "已完成"],
    failed: ["Failed", "失败"],
    cancelled: ["Cancelled", "已取消"],
    interrupted: ["Interrupted", "已中断"],
  };
  return labels[state]?.[zh ? 1 : 0] ?? state;
}

function progressTime(value: string, zh: boolean): string {
  return new Intl.DateTimeFormat(zh ? "zh-CN" : "en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayProgressText(text: string, zh: boolean): string {
  if (!zh) return text;
  const known: Record<string, string> = {
    "Queued to start.": "已排队，等待开始。",
    "Task is running.": "任务正在进行。",
    "The first attempt could not continue. Retrying once.":
      "第一次尝试无法继续，正在安全地重试一次。",
    "Task completed. The result is ready.": "任务已完成，结果已经保存。",
    "Task failed. Review the safe error and retry when ready.":
      "任务失败。查看安全错误说明，准备好后可重试。",
    "Task was cancelled. Retry when ready.": "任务已取消。准备好后可重试。",
    "Task was interrupted by a restart. Retry when ready.":
      "任务被重启中断。准备好后可重试。",
    "Preparing task": "准备任务",
    "Working on your task": "处理任务",
    "Retrying the model request": "重试模型请求",
    Started: "已开始",
    "Prepared a safe retry": "已准备安全重试",
    "Worked on task": "已处理任务",
    "Result saved": "已保存结果",
  };
  return known[text] ?? text;
}

export function TaskProgressCard({
  lang,
  onOutcome,
  onReply,
  onRetry,
  progress,
}: {
  lang: string;
  onOutcome: (messageId: string) => void;
  onReply: () => void;
  onRetry: () => void;
  progress: TaskRunProgress;
}) {
  const zh = lang === "zh";
  const terminal = TERMINAL_STATES.has(progress.state);
  const canRetry = ["failed", "cancelled", "interrupted"].includes(
    progress.state,
  );

  return (
    <details
      className={`task-progress-card task-progress-card--${progress.state}`}
      key={`${progress.runId}:${terminal ? "terminal" : "active"}`}
      open={!terminal}
    >
      <summary>
        <span className="task-progress-state">
          <span aria-hidden="true" className="task-progress-dot" />
          {stateLabel(progress.state, zh)}
        </span>
        <span aria-live="polite" className="task-progress-summary">
          {displayProgressText(progress.statusText, zh)}
        </span>
      </summary>
      <div className="task-progress-body">
        {progress.currentStep ? (
          <p className="task-progress-current">
            <strong>{zh ? "当前" : "Now"}</strong>
            <span>{displayProgressText(progress.currentStep, zh)}</span>
          </p>
        ) : null}
        {progress.completedSteps.length > 0 ? (
          <div className="task-progress-completed">
            <strong>{zh ? "已完成" : "Completed steps"}</strong>
            <ol>
              {progress.completedSteps.map((step, index) => (
                <li key={`${index}:${step}`}>
                  {displayProgressText(step, zh)}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <p className="task-progress-time">
          {zh ? "更新" : "Updated"} {progressTime(progress.updatedAt, zh)} · r
          {progress.revision}
        </p>
        <div className="task-progress-actions">
          {progress.state === "waiting_for_owner" ? (
            <button onClick={onReply} type="button">
              {zh ? "在下方回复" : "Reply below"}
            </button>
          ) : null}
          {canRetry ? (
            <button onClick={onRetry} type="button">
              {zh ? "重试" : "Retry"}
            </button>
          ) : null}
          {progress.outcomeMessageId ? (
            <button
              onClick={() => onOutcome(progress.outcomeMessageId!)}
              type="button"
            >
              {zh ? "查看结果" : "Open result"}
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}
