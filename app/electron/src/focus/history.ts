import { textValue } from "./plan";

export const HISTORY_FIELD = "跨端专注记录";
// Explicit whitelist: never serialize credentials, active timers or arbitrary IPC properties.
export function historyRecord(r: any, sourceKey: string): any {
  if (
    !r ||
    r.status !== "saved" ||
    r.task?.source !== "feishu" ||
    r.task.sourceKey !== sourceKey ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      r.id
    ) ||
    typeof r.task.id !== "string" ||
    !r.task.id ||
    r.task.id.length > 160 ||
    typeof r.task.title !== "string" ||
    r.task.title.length > 2000
  )
    throw Error("跨端记录身份或所属飞书表不符");
  for (const k of [
    "startedAt",
    "endedAt",
    "plannedSeconds",
    "elapsedSeconds",
    "acceptedSeconds",
    "completedCount",
  ])
    if (!Number.isFinite(r[k]) || r[k] < 0)
      throw Error("跨端记录时间或数量无效");
  if (
    r.startedAt < 946684800000 ||
    r.endedAt < r.startedAt ||
    r.endedAt > Date.now() + 60000 ||
    r.plannedSeconds < 60 ||
    r.plannedSeconds > 10800 ||
    r.elapsedSeconds > (r.endedAt - r.startedAt) / 1000 + 2 ||
    r.acceptedSeconds > Math.ceil(r.elapsedSeconds) ||
    !Number.isInteger(r.completedCount) ||
    r.completedCount > 100
  )
    throw Error("跨端记录超出有效范围");
  const task: any = {
    id: r.task.id,
    title: r.task.title,
    source: "feishu",
    sourceKey,
  };
  for (const k of ["planId", "taskId"])
    if (r.task[k] != null) {
      // Older task snapshots use "" for a missing optional association.
      // Preserve it verbatim so immutable local/cloud comparisons still match.
      if (
        typeof r.task[k] !== "string" ||
        (r.task[k] !== "" && !/^[A-Za-z0-9_-]{1,160}$/.test(r.task[k]))
      )
        throw Error("跨端任务标识无效");
      task[k] = r.task[k];
    }
  if (r.task.quadrant != null) {
    if (!["iu", "inu", "uni", "unu"].includes(r.task.quadrant))
      throw Error("跨端象限无效");
    task.quadrant = r.task.quadrant;
  }
  if (r.task.kind === "free") task.kind = "free";
  const result: any = {
    id: r.id,
    task,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    plannedSeconds: r.plannedSeconds,
    elapsedSeconds: r.elapsedSeconds,
    acceptedSeconds: r.acceptedSeconds,
    completedCount: r.completedCount,
    status: "saved",
    sync: "synced",
  };
  if (r.revision != null) {
    if (!Number.isInteger(r.revision) || r.revision < 0)
      throw Error("专注修改版本无效");
    result.revision = r.revision;
  }
  if (r.completionOwnedPlanIds != null) {
    if (
      !Array.isArray(r.completionOwnedPlanIds) ||
      r.completionOwnedPlanIds.length > 100 ||
      r.completionOwnedPlanIds.some(
        (x: any) =>
          typeof x !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(x)
      )
    )
      throw Error("完成行来源无效");
    result.completionOwnedPlanIds = r.completionOwnedPlanIds;
  }
  if (r.syncTarget === "plan") result.syncTarget = "plan";
  if (r.segments != null) {
    if (!Array.isArray(r.segments) || r.segments.length > 2000)
      throw Error("跨端时间段无效");
    let last = r.startedAt;
    result.segments = r.segments.map((s: any) => {
      if (
        !Number.isFinite(s.start) ||
        !Number.isFinite(s.end) ||
        s.start < last ||
        s.end < s.start ||
        s.end > r.endedAt + 1000
      )
        throw Error("跨端时间段无效");
      last = s.end;
      return { start: s.start, end: s.end };
    });
  }
  return result;
}

export function readHistory(raw: any, key: string): any[] {
  const text = textValue(raw);
  if (!text) return [];
  if (text.length > 70000) throw Error("跨端记录超过单行容量");
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error("跨端记录无法解析，未覆盖");
  }
  if (
    data?.version !== 1 ||
    !Array.isArray(data.records) ||
    data.records.length > 100
  )
    throw Error("跨端记录格式不符，未覆盖");
  const records = data.records.map((r: any) => historyRecord(r, key));
  if (new Set(records.map((r: any) => r.id)).size !== records.length)
    throw Error("跨端记录标识重复，未覆盖");
  return records;
}

export function mergeHistory(
  raw: any,
  record: any,
  key: string
): string {
  const records = readHistory(raw, key),
    incoming = historyRecord(record, key);
  const old = records.find((r) => r.id === incoming.id);
  if (old && JSON.stringify(old) !== JSON.stringify(incoming))
    throw Error("同一专注记录的跨端内容不同，请核对原电脑；未覆盖");
  if (!old) records.push(incoming);
  const result = JSON.stringify({
    version: 1,
    records: records.sort((a, b) => a.id.localeCompare(b.id)),
  });
  if (records.length > 100 || result.length > 70000)
    throw Error("此番茄的跨端明细已满，记录仍保留本机");
  return result;
}
