import React from "react";
export type HarvestProgress = {
  percent: number;
  text: string;
  state: "busy" | "done" | "error";
  errors?: string[];
};
export default function HarvestSync({
  progress,
}: {
  progress: HarvestProgress | null;
}) {
  if (!progress || progress.state === "done") return null;
  const p = progress, percent = Math.min(100,Math.max(0,Math.round(p.percent)));
  if(p.state === "error") return (
    <details className="sync-details">
      <summary className="sync-progress error" aria-label="查看同步失败原因" title="点击查看具体原因；本机记录保留">同步未完成</summary>
      <div className="sync-error-details" role="region" aria-label="同步失败详情">
        <strong>本机记录已保留</strong>
        <ul>{(p.errors?.length?p.errors:[p.text]).map((error,i)=><li key={i}>{error}</li>)}</ul>
        <small>修正原因后，点“手动同步”重试原记录。</small>
      </div>
    </details>
  );
  const stage = p.text.includes("写回原番茄") ? "写回记录" :
    p.text.includes("共享专注明细") ? "共享明细" :
    p.text.includes("回读飞书成果") ? "回读成果" :
    p.text.includes("刷新看板") ? "刷新任务" :
    p.text.includes("分类") ? "核对分类" : "核对记录";
  return (
    <span
      className={`sync-progress ${p.state}`}
      aria-label="成果同步进度"
      title={p.text}
      role="progressbar"
      aria-valuemin={p.state === "busy" ? 0 : undefined}
      aria-valuemax={p.state === "busy" ? 100 : undefined}
      aria-valuenow={p.state === "busy" ? percent : undefined}
    >
      {`${stage} ${percent}%`}
      {p.state === "busy" && <i aria-hidden="true" style={{width:`${percent}%`}} />}
    </span>
  );
}
