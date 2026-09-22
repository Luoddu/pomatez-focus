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
      const oldRevision = old.revision || 0,
        incomingRevision = r.revision || 0;
      if (!Number.isInteger(incomingRevision) || incomingRevision < 0)
        throw Error("云端记录版本无效");
      if (incomingRevision < oldRevision) continue;
      if (incomingRevision > oldRevision) {
        const matchesTask = (task: FocusSession["task"]) =>
          [
            "id",
            "planId",
            "taskId",
            "title",
            "source",
            "sourceKey",
            "quadrant",
            "kind",
          ].every((k) => (old.task as any)[k] === (task as any)[k]);
        const moved =
          Array.isArray(r.previousTasks) &&
          r.previousTasks.length <= incomingRevision &&
          r.previousTasks.every(
            (t) => t.source === "feishu" && t.sourceKey === sourceKey
          ) &&
          r.previousTasks.some(matchesTask);
        if (
          old.task.source !== "feishu" ||
          (!matchesTask(r.task) && !moved)
        )
          throw Error("修改记录的任务关联不符，未覆盖");
        // 主观感受只存本机、不上云：远端覆盖时保留本地已填的 mood
        byId.set(
          r.id,
          r.mood === undefined && old.mood !== undefined
            ? { ...r, mood: old.mood }
            : r
        );
        continue;
      }
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
