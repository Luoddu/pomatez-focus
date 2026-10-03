import React from "react";
export type HarvestProgress = {
  percent: number;
  text: string;
  state: "busy" | "done" | "error";
};
export default function HarvestSync({
  progress,
  pending,
  onRetry,
}: {
  progress: HarvestProgress | null;
  pending: number;
  onRetry: () => void;
}) {
  if (!progress && !pending) return null;
  const p = progress || {
    percent: 0,
    text: `已保存在本机 · ${pending} 项等待同步`,
    state: "busy",
  };
  return (
    <aside
      className={`harvest-sync ${p.state}`}
      aria-label="成果同步进度"
      aria-live="polite"
    >
      <span className="harvest-basket" aria-hidden="true">
        <i className="harvest-fruit">🍅</i>🧺
      </span>
      <div className="harvest-sync-body">
        <span>{p.text}</span>
        <div
          className="harvest-sync-track"
          role="progressbar"
          aria-label="飞书成果同步"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.percent)}
        >
          <i style={{ width: `${p.percent}%` }} />
        </div>
      </div>
      {p.state === "error" && (
        <button className="btn-text" onClick={onRetry}>
          重试
        </button>
      )}
    </aside>
  );
}
