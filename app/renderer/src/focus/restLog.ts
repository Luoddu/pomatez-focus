import type { FocusSession } from "./session";
import type { Journey } from "./journey.js";
import { journeyDay, restActions } from "./journey.js";

export type ActualRestKind = "meal" | "nap";
export type RestEvent = {
  id: string;
  kind: ActualRestKind;
  startedAt: number;
  endedAt: number | null;
  afterCount: number;
  presetKey: string | null;
};
export type RestLog = { version: 1; scope: string; events: RestEvent[] };
const MAX_EVENTS = 2048;
const timestamp = (n: unknown): n is number =>
  Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 8640000000000000;
const text = (s: unknown, max: number): s is string =>
  typeof s === "string" && s.length > 0 && s.length <= max;
export const restLogKey = (scope: string) => `pomatez-rest-log-v1:${encodeURIComponent(scope)}`;
export function validateRestLog(raw: any, scope: string): RestLog {
  if (!text(scope, 1000) || raw?.version !== 1 || raw.scope !== scope ||
      !Array.isArray(raw.events) || raw.events.length > MAX_EVENTS)
    throw Error("休息记录损坏，原记录已保留");
  const ids = new Set<string>();
  let previousEnd = 0;
  const events = raw.events.map((e: any, index: number): RestEvent => {
    if (!text(e?.id, 100) || ids.has(e.id) || !["meal", "nap"].includes(e.kind) ||
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
  return { version:1, scope, events };
}
export function readRestLog(storage: Storage, scope: string): RestLog {
  const raw = storage.getItem(restLogKey(scope));
  if (raw === null) return validateRestLog({version:1, scope, events:[]}, scope);
  if (raw.length > 600000) throw Error("休息记录过大，原记录已保留");
  try { return validateRestLog(JSON.parse(raw), scope); }
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
