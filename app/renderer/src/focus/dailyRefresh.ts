// Scheduling metadata only. The existing Feishu generator owns actual plan rows.
export const DAILY_REFRESH_KEY = "pomatez-daily-refresh-v1";
type Store = Pick<Storage, "getItem" | "setItem">;
export type RefreshStamp = { source: string; attemptedAt: number; completedAt: number };
const day = (at: number) => new Date(at).toDateString();
export function refreshBoundary(now: number, tomorrow = false) {
  const date = new Date(now);
  date.setHours(8, 30, 0, 0);
  if (tomorrow) date.setDate(date.getDate() + 1);
  return date.getTime();
}
function readAll(storage: Store): RefreshStamp[] {
  const raw = storage.getItem(DAILY_REFRESH_KEY);
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 16)
    throw Error("每日刷新状态损坏，请保留数据并重试");
  const sources = new Set<string>();
  return data.entries.map((entry: RefreshStamp) => {
    if (!entry || typeof entry.source !== "string" || !entry.source || entry.source.length > 1000 || sources.has(entry.source) ||
        ![entry.attemptedAt, entry.completedAt].every(at => Number.isSafeInteger(at) && at >= 0 && at <= 8640000000000000))
      throw Error("每日刷新状态损坏，请保留数据并重试");
    sources.add(entry.source);
    return { source: entry.source, attemptedAt: entry.attemptedAt, completedAt: entry.completedAt };
  });
}
export function readRefresh(storage: Store, source: string) {
  return readAll(storage).find(entry => entry.source === source) || null;
}
export function writeRefresh(storage: Store, stamp: RefreshStamp) {
  const entries = readAll(storage).filter(entry => entry.source !== stamp.source);
  entries.push(stamp);
  entries.sort((a, b) => b.attemptedAt - a.attemptedAt);
  const raw = JSON.stringify({ version: 1, entries: entries.slice(0, 16) });
  // Validate prospective metadata and verify the real storage receipt.
  readAll({ getItem: () => raw, setItem: () => {} });
  storage.setItem(DAILY_REFRESH_KEY, raw);
  if (storage.getItem(DAILY_REFRESH_KEY) !== raw) throw Error("每日刷新状态未保存，请手动重试");
}
export function refreshDue(now: number, stamp: RefreshStamp | null) {
  const boundary = refreshBoundary(now);
  return now >= boundary && !(stamp && [stamp.attemptedAt, stamp.completedAt].some(at => day(at) === day(now) && at >= boundary));
}
export function refreshAttempt(source: string, previous: RefreshStamp | null, now: number): RefreshStamp {
  // A manual run after wall-clock rollback may change its display time, but must
  // not erase the same-day evidence that the scheduled boundary was crossed.
  const sameDay = (at: number) => day(at) === day(now) ? at : 0;
  return { source, attemptedAt: Math.max(now, sameDay(previous?.attemptedAt || 0), sameDay(previous?.completedAt || 0)), completedAt: previous?.completedAt || 0 };
}
export function nextRefreshDelay(now: number) {
  return Math.max(1, refreshBoundary(now, now >= refreshBoundary(now)) - now);
}
export function refreshLabel(stamp: RefreshStamp | null, now = Date.now()) {
  if (!stamp?.completedAt || day(stamp.completedAt) !== day(now) || stamp.completedAt > now) return "";
  const date = new Date(stamp.completedAt), pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1}.${date.getDate()} 周${"日一二三四五六"[date.getDay()]} ${pad(date.getHours())}:${pad(date.getMinutes())}已刷新`;
}
