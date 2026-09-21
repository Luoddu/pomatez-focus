// 专注统计（纯函数，node --test 可直接断言）。
// 取数口径与月历一致：仅 status==="saved" 的记录，按本地日期/时刻聚合；
// 半小时热力把一段专注的番茄数按时间占比摊到覆盖的半小时格子里。
import type { FocusSession } from "./session";

export type RangeKey = "week" | "month" | "quarter" | "year";
export const RANGE_LABELS: Record<RangeKey, string> = {
  week: "周",
  month: "月",
  quarter: "季",
  year: "年",
};

const DAY = 86400000;
const HALF_HOUR = 1800000;

const dayStart = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const md = (ms: number) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

export type RangeInfo = {
  key: RangeKey;
  start: number; // 本地 0 点起
  end: number; // 排他
  label: string; // 展示用区间标签
};
export function rangeOf(key: RangeKey, now: number): RangeInfo {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (key === "week") {
    const start = dayStart(now) - ((d.getDay() + 6) % 7) * DAY; // 周一起算
    const end = start + 7 * DAY;
    return { key, start, end, label: `${md(start)} – ${md(end - DAY)}` };
  }
  if (key === "month") {
    const start = new Date(y, m, 1).getTime();
    const end = new Date(y, m + 1, 1).getTime();
    return { key, start, end, label: `${y} 年 ${m + 1} 月` };
  }
  if (key === "quarter") {
    const q = Math.floor(m / 3);
    const start = new Date(y, q * 3, 1).getTime();
    const end = new Date(y, q * 3 + 3, 1).getTime();
    return { key, start, end, label: `${y} 年 Q${q + 1}` };
  }
  const start = new Date(y, 0, 1).getTime();
  const end = new Date(y + 1, 0, 1).getTime();
  return { key, start, end, label: `${y} 年` };
}

// 区间平移：在当前区间基础上向过去/未来翻一页（周 ±7 天、月/季/年 ±N 个月）。
// 用区间中点做锚再归一到区间起点，避免月末（31 日）平移跨档
export function shiftRange(range: RangeInfo, delta: -1 | 1): RangeInfo {
  const mid = range.start + (range.end - range.start) / 2;
  const d = new Date(mid);
  if (range.key === "week") return rangeOf("week", mid + delta * 7 * DAY);
  const months = range.key === "month" ? 1 : range.key === "quarter" ? 3 : 12;
  return rangeOf(
    range.key,
    new Date(d.getFullYear(), d.getMonth() + delta * months, 1).getTime()
  );
}

// 该区间是否为「当前」区间（含 now）：翻页后用于禁用「下一页」与显示回到本期
export const isCurrentRange = (range: RangeInfo, now: number) =>
  now >= range.start && now < range.end;

export const inRange = (
  records: FocusSession[],
  range: { start: number; end: number }
): FocusSession[] =>
  records.filter(
    (r) =>
      r.status === "saved" && r.startedAt >= range.start && r.startedAt < range.end
  );

// ── 汇总数字 ──
export type Summary = {
  count: number; // 番茄总数
  seconds: number; // 专注总秒数
  activeDays: number; // 有收获的天数
  avgCount: number; // 活跃日日均番茄（1 位小数）
  bestDay: { date: number; count: number; seconds: number } | null;
};
export function summarize(records: FocusSession[]): Summary {
  const byDay = new Map<number, { count: number; seconds: number }>();
  let count = 0;
  let seconds = 0;
  for (const r of records) {
    const c = r.completedCount || 0;
    const s = r.acceptedSeconds || 0;
    count += c;
    seconds += s;
    if (c <= 0 && s <= 0) continue;
    const key = dayStart(r.startedAt);
    const day = byDay.get(key) || { count: 0, seconds: 0 };
    day.count += c;
    day.seconds += s;
    byDay.set(key, day);
  }
  let bestDay: Summary["bestDay"] = null;
  byDay.forEach((day, date) => {
    if (day.count > 0 && (!bestDay || day.count > bestDay.count))
      bestDay = { date, count: day.count, seconds: day.seconds };
  });
  return {
    count,
    seconds,
    activeDays: byDay.size,
    avgCount: byDay.size ? Math.round((count / byDay.size) * 10) / 10 : 0,
    bestDay,
  };
}

// 连续收获天数：今天已有收获算到今天，否则算到昨天（今天还在进行中不清零）
export function currentStreak(records: FocusSession[], now: number): number {
  const days = new Set<number>();
  for (const r of records)
    if (r.status === "saved" && (r.completedCount || 0) > 0)
      days.add(dayStart(r.startedAt));
  let cursor = dayStart(now);
  if (!days.has(cursor)) cursor -= DAY;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= DAY;
  }
  return streak;
}

// ── 柱状图分桶 ──
export type BarBucket = {
  label: string;
  count: number;
  seconds: number;
  isToday: boolean;
};
export function barBuckets(
  records: FocusSession[],
  range: RangeInfo,
  now: number
): BarBucket[] {
  const today = dayStart(now);
  const WEEK_CHARS = "一二三四五六日";
  const bucketAt = (start: number, label: string): BarBucket => ({
    label,
    count: 0,
    seconds: 0,
    isToday: dayStart(start) <= today && today < start + DAY,
  });
  let buckets: BarBucket[] = [];
  let bucketOf: (ms: number) => number;
  if (range.key === "week") {
    buckets = Array.from({ length: 7 }, (_, i) =>
      bucketAt(range.start + i * DAY, WEEK_CHARS[i])
    );
    bucketOf = (ms) => Math.floor((ms - range.start) / DAY);
  } else if (range.key === "month") {
    const days = Math.round((range.end - range.start) / DAY);
    buckets = Array.from({ length: days }, (_, i) =>
      bucketAt(range.start + i * DAY, `${i + 1}`)
    );
    bucketOf = (ms) => Math.floor((ms - range.start) / DAY);
  } else if (range.key === "quarter") {
    const weeks = Math.ceil((range.end - range.start) / (7 * DAY));
    buckets = Array.from({ length: weeks }, (_, i) =>
      bucketAt(range.start + i * 7 * DAY, md(range.start + i * 7 * DAY))
    );
    bucketOf = (ms) => Math.floor((ms - range.start) / (7 * DAY));
  } else {
    buckets = Array.from({ length: 12 }, (_, i) =>
      bucketAt(new Date(new Date(range.start).getFullYear(), i, 1).getTime(), `${i + 1}月`)
    );
    bucketOf = (ms) => new Date(ms).getMonth();
  }
  for (const r of records) {
    const i = bucketOf(r.startedAt);
    if (i < 0 || i >= buckets.length) continue;
    buckets[i].count += r.completedCount || 0;
    buckets[i].seconds += r.acceptedSeconds || 0;
  }
  return buckets;
}

// ── 半小时 × 星期热力矩阵：行=周一..周日，列=00:00–24:00 共 48 格。
// 一段 N 番茄的专注按覆盖时长占比摊到各格（如 25 分钟跨两格则各摊一半），
// 缺 endedAt 时用 startedAt + acceptedSeconds/plannedSeconds 兜底
export type HeatMatrix = { rows: number[][]; max: number };
export function halfHourMatrix(
  records: FocusSession[],
  range: { start: number; end: number }
): HeatMatrix {
  const rows = Array.from({ length: 7 }, () => new Array<number>(48).fill(0));
  let max = 0;
  for (const r of records) {
    const count = r.completedCount || 0;
    if (count <= 0) continue;
    const from = r.startedAt;
    const to = Math.max(
      r.endedAt || 0,
      from + (r.acceptedSeconds || r.plannedSeconds || 1500) * 1000
    );
    const dur = Math.max(to - from, 1);
    let t = from;
    while (t < to) {
      const day = dayStart(t);
      const col = Math.min(47, Math.floor((t - day) / HALF_HOUR));
      const next = Math.min(day + (col + 1) * HALF_HOUR, to);
      if (t >= range.start && t < range.end) {
        const row = (new Date(t).getDay() + 6) % 7;
        rows[row][col] += (count * (next - t)) / dur;
        if (rows[row][col] > max) max = rows[row][col];
      }
      t = next;
    }
  }
  return { rows, max };
}

// ── 任务排行：按任务名（去掉「· 第 N 个番茄」序号，与 parseTitle 同规则）聚合 ──
const baseName = (title: string) =>
  title.replace(/(?:\s*·\s*|\s+)第\s*\d+\s*个番茄\s*$/, "") || title;
export type TopTask = {
  name: string;
  count: number;
  seconds: number;
  quadrant?: string;
};
export function topTasks(records: FocusSession[], limit = 6): TopTask[] {
  const map = new Map<string, TopTask>();
  for (const r of records) {
    const name = baseName(r.task?.title || "自由番茄");
    const item = map.get(name) || {
      name,
      count: 0,
      seconds: 0,
      quadrant: r.task?.quadrant,
    };
    item.count += r.completedCount || 0;
    item.seconds += r.acceptedSeconds || 0;
    map.set(name, item);
  }
  const all: TopTask[] = [];
  map.forEach((t) => {
    if (t.count > 0) all.push(t);
  });
  return all
    .sort((a, b) => b.count - a.count || b.seconds - a.seconds)
    .slice(0, limit);
}
