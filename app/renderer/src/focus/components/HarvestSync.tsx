import React from "react";
export type HarvestProgress = {
  percent: number;
  text: string;
  state: "busy" | "done" | "error";
};
export default function HarvestSync({
  progress,
}: {
  progress: HarvestProgress | null;
}) {
  if (!progress || progress.state === "done") return null;
  const p = progress, percent = Math.min(100,Math.max(0,Math.round(p.percent)));
  return (
    <span
      className={`sync-progress ${p.state}`}
      aria-label="成果同步进度"
      title={p.text}
      role={p.state === "busy" ? "progressbar" : "status"}
      aria-valuemin={p.state === "busy" ? 0 : undefined}
      aria-valuemax={p.state === "busy" ? 100 : undefined}
      aria-valuenow={p.state === "busy" ? percent : undefined}
    >
      {p.state === "busy" ? `同步 ${percent}%` : "同步未完成"}
      {p.state === "busy" && <i aria-hidden="true" style={{width:`${percent}%`}} />}
    </span>
  );
}
