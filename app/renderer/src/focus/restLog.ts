import type { FocusSession } from "./session";
import type { Journey } from "./journey.js";
import { journeyDay, restActions } from "./journey.js";

export type ActualRestKind = "meal" | "nap" | "gym";
export const ACTUAL_REST = {
  meal: { label:"吃饭", record:"吃饭记录", begin:"去吃饭", finish:"吃完了" },
  nap: { label:"小憩", record:"小憩记录", begin:"去睡觉", finish:"睡醒了" },
  gym: { label:"健身", record:"健身记录", begin:"去健身", finish:"练完了" },
};
export type RestEvent = {
  id: string;
  kind: ActualRestKind;
  startedAt: number;
  endedAt: number | null;
  afterCount: number;
  presetKey: string | null;
};
export type RestLog = { version: 2; scope: string; events: RestEvent[] };
const MAX_EVENTS = 2048;
const timestamp = (n: unknown): n is number =>
  Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 8640000000000000;
const text = (s: unknown, max: number): s is string =>
  typeof s === "string" && s.length > 0 && s.length <= max;
export const restLogKey = (scope: string) => `pomatez-rest-log-v2:${encodeURIComponent(scope)}`;
export const legacyRestLogKey = (scope: string) => `pomatez-rest-log-v1:${encodeURIComponent(scope)}`;
export function validateRestLog(raw: any, scope: string): RestLog {
  if (!text(scope, 1000) || ![1,2].includes(raw?.version) || raw.scope !== scope ||
      !Array.isArray(raw.events) || raw.events.length > MAX_EVENTS)
    throw Error("休息记录损坏，原记录已保留");
  const ids = new Set<string>();
  let previousEnd = 0;
  const events = raw.events.map((e: any, index: number): RestEvent => {
    if (!text(e?.id, 100) || ids.has(e.id) || !(raw.version === 1 ? ["meal", "nap"] : ["meal", "nap", "gym"]).includes(e.kind) ||
        !timestamp(e.startedAt) || e.startedAt < previousEnd ||
        !(e.endedAt === null || (timestamp(e.endedAt) && e.endedAt >= e.startedAt)) ||
        (e.endedAt === null && index !== raw.events.length - 1) ||
        !Number.isSafeInteger(e.afterCount) || e.afterCount < 0 || e.afterCount > 1000000 ||
        !(e.presetKey === null || text(e.presetKey, 150)))
      throw Error("休息记录损坏，原记录已保留");
    ids.add(e.id);
    previousEnd = e.endedAt ?? e.startedAt;
    return { id:e.id, kind:e.kind, startedAt:e.startedAt, endedAt:e.endedAt,
      afterCount:e.afterCount, presetKey:e.presetKey };
  });
  return { version:2, scope, events };
}
export function readRestLog(storage: Storage, scope: string): RestLog {
  const current = storage.getItem(restLogKey(scope));
  const raw = current === null ? storage.getItem(legacyRestLogKey(scope)) : current;
  if (raw === null) return validateRestLog({version:2, scope, events:[]}, scope);
  if (raw.length > 600000) throw Error("休息记录过大，原记录已保留");
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== (current === null ? 1 : 2)) throw Error("Invalid storage version");
    return validateRestLog(parsed, scope);
  }
  catch (_) { throw Error("休息记录损坏，原记录已保留"); }
}
export function writeRestLog(storage: Storage, log: RestLog): RestLog {
  const next = validateRestLog(log, log.scope), key = restLogKey(log.scope);
  // Refuse to overwrite corrupt bytes, including an empty string.
  readRestLog(storage, log.scope);
  const encoded = JSON.stringify(next);
  storage.setItem(key, encoded);
  if (storage.getItem(key) !== encoded) throw Error("休息记录未保存，请检查本地存储并重试");
  return next;
}
export const openRest = (log: RestLog | null): RestEvent | undefined =>
  log?.events.find(e => e.endedAt === null);
export function closeRest(log: RestLog, now: number): RestLog {
  const valid = validateRestLog(log, log.scope), current = openRest(valid);
  if (!current) return valid;
  if (!timestamp(now) || now < current.startedAt) throw Error("系统时间早于休息开始，请校准时间后重试");
  return { ...valid, events:valid.events.map(e => e.id === current.id ? {...e, endedAt:now} : e) };
}
export function completedBeforeRest(records: FocusSession[], scope: string, now: number): number {
  return records.filter(r => r.status === "saved" && journeyDay(r.startedAt) === journeyDay(now) &&
    r.startedAt <= now && (!r.endedAt || r.endedAt <= now) &&
    (scope === "local" ? r.task.source === "local" : r.task.source === "feishu" && r.task.sourceKey === scope))
    .reduce((sum, r) => sum + (Number.isInteger(r.completedCount) && r.completedCount! >= 0 && r.completedCount! <= 100 ? r.completedCount! : 0), 0);
}
export function startRest(log: RestLog, plan: Journey, kind: ActualRestKind, now: number,
  afterCount: number, id: string): RestLog {
  const current = openRest(log);
  if (current?.kind === kind) return validateRestLog(log, log.scope);
  if (plan.scope !== log.scope || plan.day !== journeyDay(now)) throw Error("旅程日期或来源已变化，请重试");
  const next = closeRest(log, now);
  if (next.events.length >= MAX_EVENTS) throw Error("休息记录已达到上限，原记录已保留");
  const consumed = new Set(next.events.filter(e => journeyDay(e.startedAt) === plan.day && e.kind === kind).map(e => e.presetKey));
  const presetKey = plan.stages.flatMap(stage => restActions(stage).map((value, i) => ({value,key:`${stage.id}:${i}`})))
    .find(p => p.value === kind && !consumed.has(p.key) && !plan.passedActions.includes(p.key))?.key ?? null;
  return validateRestLog({...next, events:[...next.events, {id, kind, startedAt:now, endedAt:null, afterCount, presetKey}]}, log.scope);
}
export function restClock(event: RestEvent, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor(((event.endedAt ?? now) - event.startedAt) / 1000));
  const mins = Math.floor(seconds / 60), tail = String(seconds % 60).padStart(2, "0");
  return mins < 60 ? `${String(mins).padStart(2,"0")}:${tail}` : `${Math.floor(mins/60)}:${String(mins%60).padStart(2,"0")}:${tail}`;
}

const inScope = (r: FocusSession, scope: string) =>
  scope === "local" ? r.task.source === "local" : r.task.source === "feishu" && r.task.sourceKey === scope;
const intervals = (r: FocusSession) => r.segments ??
  (r.endedAt === undefined ? [] : [{start:r.startedAt, end:r.endedAt}]);

export function restBackfillWindow(log: RestLog, records: FocusSession[], active: FocusSession | null,
  now: number): { startedAt: number | null; endedAt: number } {
  const ended = validateRestLog(log, log.scope).events.map(e => e.endedAt).filter(timestamp);
  for (const r of [...records, ...(active ? [active] : [])]) {
    if (!inScope(r, log.scope)) continue;
    if (timestamp(r.endedAt)) ended.push(r.endedAt);
    for (const s of intervals(r)) if (timestamp(s.end)) ended.push(s.end);
  }
  const past = ended.filter(at => at <= now);
  return { startedAt:past.length ? Math.max(...past) : null, endedAt:now };
}

export function backfillRest(log: RestLog, plan: Journey, kind: ActualRestKind,
  startedAt: number, endedAt: number, now: number, records: FocusSession[],
  active: FocusSession | null, id: string): RestLog {
  if (!timestamp(startedAt) || !timestamp(endedAt) || !timestamp(now) || endedAt <= startedAt || endedAt > now)
    throw Error("请选择有效的起止时间，结束须晚于开始且不能在未来");
  if (openRest(log)) throw Error("请先结束当前休息，再补记其他事件");
  if (startedAt < (log.events[log.events.length - 1]?.endedAt ?? 0))
    throw Error("这段时间已有休息记录，请调整休息起止时间");
  if (active?.status === "active" || active?.status === "review")
    throw Error("请先暂停或确认当前番茄，再补记休息");
  for (const r of [...records, ...(active ? [active] : [])]) {
    if (!inScope(r, log.scope)) continue;
    if (intervals(r).some(s => startedAt < s.end && endedAt > s.start))
      throw Error("这段时间已有专注记录，请调整休息起止时间");
  }
  const next = startRest(log, plan, kind, startedAt, completedBeforeRest(records, log.scope, startedAt), id);
  return closeRest(next, endedAt);
}
