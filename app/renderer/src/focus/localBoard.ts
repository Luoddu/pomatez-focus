import type { FocusTask, FocusSession } from "./session";

export const sameTask = (a: FocusTask, b: FocusTask) => a.source === b.source &&
  (a.sourceKey || "") === (b.sourceKey || "") &&
  (a.taskId || (a.quickTask ? `quick-${a.quickTask.id}` : a.id)) ===
  (b.taskId || (b.quickTask ? `quick-${b.quickTask.id}` : b.id));

// Project saved local results over the last task snapshot. Never mark the
// underlying plan/cloud receipt as synced merely to update the screen.
export function projectLocalCompletion(tasks: FocusTask[], records: FocusSession[], day: number): FocusTask[] {
  const end = new Date(day); end.setDate(end.getDate() + 1);
  const saved = records.filter(r => r.status === "saved" && r.startedAt >= day && r.startedAt < end.getTime());
  const completed = new Set<string>();
  const sequence = (task: FocusTask) => task.quickTask?.sequence || Number(task.title.match(/第\s*(\d+)\s*个番茄/)?.[1] || 0);
  for (const record of saved) {
    const start = sequence(record.task), count = record.completedCount || 0;
    if (start && count > 1) for (const task of tasks) {
      const n=sequence(task);
      if (sameTask(task,record.task) && n >= start && n < start+count) completed.add(task.id);
    }
  }
  for (const task of tasks) {
    if (task.kind === "done") continue;
    const matching = saved.filter(r => sameTask(r.task, task) &&
      (r.task.id === task.id || (task.planId && (r.task.planId || r.syncedPlanId) === task.planId)));
    const seconds = (task.creditedSeconds || 0) + matching.filter(r => !task.appliedSessionIds?.includes(r.id))
      .reduce((sum,r) => sum + (r.acceptedSeconds || 0),0);
    if (matching.some(r => (r.completedCount || 0) > 0) ||
      (matching.length > 0 && seconds >= (task.goalSeconds || matching[0].plannedSeconds))) completed.add(task.id);
    if (saved.some(r => sameTask(r.task,task) && task.planId && r.completionOwnedPlanIds?.includes(task.planId))) completed.add(task.id);
  }
  return tasks.map(task => {
    const group = tasks.filter(t => sameTask(t,task));
    const newDone = group.filter(t => t.kind !== "done" && completed.has(t.id)).length;
    const done = Math.max(0,...group.map(t => t.doneToday || 0));
    const planned = Math.max(done, ...group.map(t => t.plannedToday || 0), group.length);
    return {...task, ...(completed.has(task.id) ? {kind:"done" as const} : {}),
      doneToday: Math.min(planned,done + newDone), plannedToday: planned};
  });
}
