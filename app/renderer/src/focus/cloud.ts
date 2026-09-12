import type { FocusSession } from "./session";

// Merge by immutable session identity. Never replace the active timer or erase
// local-only/other-Base history because a remote response omitted it.
export function mergeCloudRecords(
  local: FocusSession[],
  incoming: FocusSession[],
  sourceKey: string
): FocusSession[] {
  const byId = new Map(local.map((r) => [r.id, r]));
  const seen = new Set<string>();
  for (const r of incoming) {
    if (
      !r.id ||
      seen.has(r.id) ||
      r.status !== "saved" ||
      r.sync !== "synced" ||
      !r.cloudSynced ||
      r.task.sourceKey !== sourceKey ||
      r.task.source !== "feishu" ||
      !Number.isFinite(r.acceptedSeconds) ||
      !Number.isInteger(r.completedCount)
    )
      throw Error("云端专注数据不完整或重复，未合并");
    seen.add(r.id);
    const old = byId.get(r.id);
    if (old) {
      if (
        old.task.source === "feishu" &&
        old.task.sourceKey !== sourceKey
      )
        throw Error("相同记录 ID 属于不同飞书表，未合并");
      for (const key of [
        "startedAt",
        "endedAt",
        "elapsedSeconds",
        "acceptedSeconds",
        "plannedSeconds",
        "completedCount",
      ] as const)
        if (old[key] !== r[key])
          throw Error("本机与云端的同一条专注内容不同，请核对；未覆盖");
      if (old.task.title !== r.task.title)
        throw Error("同一条专注的任务名称不同，未覆盖");
      if (
        JSON.stringify(old.segments || []) !==
        JSON.stringify(r.segments || [])
      )
        throw Error("同一条专注的时间段不同，未覆盖");
      if (old.task.source === "feishu")
        for (const key of [
          "id",
          "planId",
          "taskId",
          "quadrant",
          "kind",
        ] as const)
          if (old.task[key] !== r.task[key])
            throw Error("同一条专注的任务关联或象限不同，未覆盖");
    }
    byId.set(r.id, r);
  }
  return Array.from(byId.values()).sort(
    (a, b) => b.startedAt - a.startedAt || a.id.localeCompare(b.id)
  );
}
