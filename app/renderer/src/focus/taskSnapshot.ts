import type { FocusTask } from "./session";

export const TASK_SNAPSHOT_KEY = "pomatez-task-snapshot-v1";
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export const taskDay = (at = Date.now()) => {
  // Same local calendar day as generate.ts dayStart / Feishu.today.
  const d = new Date(at);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

// Disposable read cache, never a source for cloud writes or completion ownership.
// Copy only task fields; connection secrets and arbitrary IPC fields stay out.
function cleanRows(value: unknown, sourceKey: string): FocusTask[] {
  if (!Array.isArray(value) || value.length > 10000)
    throw Error("Invalid tasks");
  const ids = new Set<string>();
  return value.map((v: any) => {
    if (
      !v ||
      typeof v.id !== "string" ||
      !v.id ||
      v.id.length > 500 ||
      ids.has(v.id) ||
      typeof v.title !== "string" ||
      v.title.length > 2000 ||
      v.source !== "feishu" ||
      v.sourceKey !== sourceKey ||
      (v.kind !== undefined && !["done", "free"].includes(v.kind)) ||
      (v.quadrant !== undefined &&
        !["iu", "inu", "uni", "unu"].includes(v.quadrant)) ||
      (v.projectType !== undefined &&
        ![
          "research",
          "delivery",
          "longterm",
          "software",
          "personal",
          "misc",
        ].includes(v.projectType))
    )
      throw Error("Invalid task");
    ids.add(v.id);
    const row: FocusTask = {
      id: v.id,
      title: v.title,
      source: "feishu",
      sourceKey,
    };
    if (
      typeof v.description === "string" &&
      v.description.length <= 100000
    )
      row.description = v.description;
    for (const key of ["planId", "taskId"] as const) {
      if (v[key] !== undefined) {
        if (typeof v[key] !== "string" || v[key].length > 500)
          throw Error("Invalid identity");
        row[key] = v[key];
      }
    }
    for (const key of [
      "creditedSeconds",
      "goalSeconds",
      "doneToday",
      "plannedToday",
    ] as const) {
      if (v[key] !== undefined) {
        if (!Number.isFinite(v[key]) || v[key] < 0)
          throw Error("Invalid count");
        row[key] = v[key];
      }
    }
    if (v.appliedSessionIds !== undefined) {
      if (
        !Array.isArray(v.appliedSessionIds) ||
        v.appliedSessionIds.length > 1000 ||
        v.appliedSessionIds.some(
          (id: unknown) => typeof id !== "string" || id.length > 500
        )
      )
        throw Error("Invalid sessions");
      row.appliedSessionIds = [...v.appliedSessionIds];
    }
    if (v.kind) row.kind = v.kind;
    if (v.quadrant) row.quadrant = v.quadrant;
    if (v.projectType) row.projectType = v.projectType;
    return row;
  });
}

export function readTaskSnapshot(
  storage: Storage,
  sourceKey: string,
  at = Date.now()
): FocusTask[] | null {
  try {
    const raw = storage.getItem(TASK_SNAPSHOT_KEY);
    if (!raw || raw.length > 2 * 1024 * 1024) return null;
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      data.sourceKey !== sourceKey ||
      data.day !== taskDay(at)
    )
      return null;
    return cleanRows(data.rows, sourceKey);
  } catch {
    return null;
  }
}

export function writeTaskSnapshot(
  storage: Storage,
  sourceKey: string,
  rows: FocusTask[],
  at = Date.now()
): boolean {
  try {
    const raw = JSON.stringify({
      version: 1,
      sourceKey,
      day: taskDay(at),
      rows: cleanRows(rows, sourceKey),
    });
    if (raw.length > 2 * 1024 * 1024) return false;
    storage.setItem(TASK_SNAPSHOT_KEY, raw);
    return true;
  } catch {
    return false;
  }
}
