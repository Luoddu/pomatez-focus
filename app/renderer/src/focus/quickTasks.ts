import type { FocusTask, FocusSession } from "./session";
import type { OutboxItem, QuickTask, RemovePlan } from "./editQueue";

export function quickRows(q: QuickTask): FocusTask[] {
  return Array.from({ length: q.count }, (_, i) => ({
    id: `quick-${q.id}-${i + 1}`,
    taskId: q.append?.taskId || `quick-${q.id}`,
    title: `${q.title} · 第 ${q.append?.sequence || i + 1} 个番茄`,
    ...(q.append?.description
      ? { description: q.append.description }
      : {}),
    source: "feishu",
    sourceKey: q.sourceKey,
    quadrant: q.quadrant,
    ...(q.projectType ? { projectType: q.projectType } : {}),
    quickTask: { id: q.id, sequence: i + 1 },
    doneToday: q.append?.doneToday || 0,
    plannedToday: q.append?.plannedToday || q.count,
  }));
}
export function validateQuickReceipt(q: QuickTask, rows: FocusTask[]) {
  if (
    !Array.isArray(rows) ||
    rows.length !== q.count ||
    new Set(rows.map((r) => r.planId)).size !== rows.length ||
    new Set(rows.map((r) => r.taskId)).size !== 1 ||
    rows.some(
      (r, i) =>
        !r.planId ||
        r.id !== r.planId ||
        !r.taskId ||
        r.quickTask ||
        r.source !== "feishu" ||
        r.sourceKey !== q.sourceKey ||
        (q.append && r.taskId !== q.append.taskId) ||
        r.title !==
          `${q.title} · 第 ${q.append?.sequence || i + 1} 个番茄` ||
        r.quadrant !== q.quadrant
    )
  )
    throw Error("新增任务回执不完整，保留本机任务等待重试");
}
export function bindQuickTask(
  task: FocusTask,
  q: QuickTask,
  rows: FocusTask[]
): FocusTask {
  if (task.quickTask?.id !== q.id) return task;
  validateQuickReceipt(q, rows);
  if (task.sourceKey !== q.sourceKey)
    throw Error("临时任务所属飞书表不符");
  const row = rows[task.quickTask.sequence - 1];
  if (!row) throw Error("临时番茄序号无效");
  // The session's accumulated credit belongs to its start, not the later readback.
  return {
    ...row,
    creditedSeconds: task.creditedSeconds,
    goalSeconds: task.goalSeconds,
  };
}
export function bindQuickSessions<
  T extends { active: FocusSession | null; records: FocusSession[] }
>(data: T, q: QuickTask, rows: FocusTask[]): T {
  validateQuickReceipt(q, rows);
  const bind = (r: FocusSession): FocusSession => ({
    ...r,
    task: bindQuickTask(r.task, q, rows),
  });
  return {
    ...data,
    active: data.active ? bind(data.active) : null,
    records: data.records.map(bind),
  };
}
export function projectQuickTasks(
  tasks: FocusTask[],
  entries: OutboxItem[],
  key: string | null,
  now = Date.now()
) {
  const day = new Date(now).setHours(0, 0, 0, 0);
  const queued = entries.filter(
    (e) =>
      e.kind === "task" &&
      e.sourceKey === key &&
      (e.payload as QuickTask).day === day
  );
  let projected = queued.flatMap(
    (e) => e.taskRows || quickRows(e.payload as QuickTask)
  );
  // Each local append adds one slot to the unprojected snapshot. Its captured
  // total may already include earlier reductions, so do not subtract twice.
  const appended = new Set(
    queued
      .filter((e) => (e.payload as QuickTask).append)
      .map((e) => (e.payload as QuickTask).append!.taskId)
  );
  projected = projected.map((row) => {
    if (!appended.has(row.taskId || "")) return row;
    const base = tasks.filter(
      (t) => t.taskId === row.taskId && t.sourceKey === row.sourceKey
    );
    const extra = projected.filter(
      (t) =>
        t.taskId === row.taskId &&
        t.sourceKey === row.sourceKey &&
        !base.some((b) => b.id === t.id)
    ).length;
    const planned = Math.max(
      0,
      ...base.map((t) => t.plannedToday || 0)
    );
    return { ...row, plannedToday: planned + extra };
  });
  const ids = new Set(projected.map((r) => r.id));
  const merged = mergeQuickRows(
    tasks.filter((r) => !ids.has(r.id)),
    projected
  );
  return removePlanRows(
    merged,
    entries
      .filter(
        (e) =>
          e.kind === "remove" &&
          e.sourceKey === key &&
          (e.payload as RemovePlan).day === day
      )
      .map((e) => (e.payload as RemovePlan).task)
  );
}

// Count only rows still present in the snapshot; acknowledged removals must
// not decrement the group a second time while later intents are pending.
export function removePlanRows(
  rows: FocusTask[],
  removed: FocusTask[]
): FocusTask[] {
  const ids = new Set(
    removed.map((t) => `${t.sourceKey}|${t.planId || t.id}`)
  );
  const hidden = rows.filter(
    (t) =>
      t.kind !== "done" &&
      !t.creditedSeconds &&
      !t.appliedSessionIds?.length &&
      ids.has(`${t.sourceKey}|${t.planId || t.id}`)
  );
  const counts = new Map<string, number>();
  hidden.forEach((t) =>
    counts.set(
      `${t.sourceKey}|${t.taskId}`,
      (counts.get(`${t.sourceKey}|${t.taskId}`) || 0) + 1
    )
  );
  const hiddenIds = new Set(
    hidden.map((t) => `${t.sourceKey}|${t.id}`)
  );
  return rows
    .filter((t) => !hiddenIds.has(`${t.sourceKey}|${t.id}`))
    .map((t) => {
      const count = counts.get(`${t.sourceKey}|${t.taskId}`) || 0;
      return count && t.plannedToday != null
        ? {
            ...t,
            plannedToday: Math.max(
              t.doneToday || 0,
              t.plannedToday - count
            ),
          }
        : t;
    });
}

// Keep sibling plans and normalize group totals before the server refresh arrives.
export function mergeQuickRows(
  tasks: FocusTask[],
  rows: FocusTask[]
): FocusTask[] {
  const ids = new Set(rows.map((r) => r.id));
  const groups = new Set(rows.map((r) => `${r.sourceKey}|${r.taskId}`));
  const merged = [...tasks.filter((r) => !ids.has(r.id)), ...rows];
  const totals = new Map<string, { planned: number; done: number }>();
  for (const row of merged) {
    if (!row.taskId || !groups.has(`${row.sourceKey}|${row.taskId}`))
      continue;
    const key = `${row.sourceKey}|${row.taskId}`;
    const old = totals.get(key) || { planned: 0, done: 0 };
    totals.set(key, {
      planned: Math.max(old.planned, row.plannedToday || 0),
      done: Math.max(old.done, row.doneToday || 0),
    });
  }
  return merged.map((row) => {
    const total = totals.get(`${row.sourceKey}|${row.taskId}`);
    return total
      ? { ...row, plannedToday: total.planned, doneToday: total.done }
      : row;
  });
}
