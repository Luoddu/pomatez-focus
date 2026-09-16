import type { FocusTask, FocusSession } from "./session";
import type { OutboxItem, QuickTask } from "./editQueue";

export function quickRows(q: QuickTask): FocusTask[] {
  return Array.from({ length: q.count }, (_, i) => ({
    id: `quick-${q.id}-${i + 1}`,
    taskId: `quick-${q.id}`,
    title: `${q.title} · 第 ${i + 1} 个番茄`,
    source: "feishu",
    sourceKey: q.sourceKey,
    quadrant: q.quadrant,
    quickTask: { id: q.id, sequence: i + 1 },
    doneToday: 0,
    plannedToday: q.count,
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
        r.title !== `${q.title} · 第 ${i + 1} 个番茄` ||
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
  const projected = queued.flatMap(
    (e) => e.taskRows || quickRows(e.payload as QuickTask)
  );
  const ids = new Set(projected.map((r) => r.id));
  return [...tasks.filter((r) => !ids.has(r.id)), ...projected];
}
