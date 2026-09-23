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
    return {
      key,
      start,
      end,
      label: `${md(start)} – ${md(end - DAY)}`,
    };
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
  if (range.key === "week")
    return rangeOf("week", mid + delta * 7 * DAY);
  const months =
    range.key === "month" ? 1 : range.key === "quarter" ? 3 : 12;
  return rangeOf(
    range.key,
    new Date(
      d.getFullYear(),
      d.getMonth() + delta * months,
      1
    ).getTime()
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
      r.status === "saved" &&
      r.startedAt >= range.start &&
      r.startedAt < range.end
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
    avgCount: byDay.size
      ? Math.round((count / byDay.size) * 10) / 10
      : 0,
    bestDay,
  };
}

// 连续收获天数：今天已有收获算到今天，否则算到昨天（今天还在进行中不清零）
export function currentStreak(
  records: FocusSession[],
  now: number
): number {
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
  start: number;
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
    start,
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
      bucketAt(
        new Date(new Date(range.start).getFullYear(), i, 1).getTime(),
        `${i + 1}月`
      )
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

// 绘图只使用已经到达的分桶。平滑线为向后看的三期移动平均，
// 不预测未来，也不把尚未发生的日期当作零收获。
export function harvestTrend(
  buckets: BarBucket[],
  range: RangeInfo,
  now: number
): { label: string; count: number; average: number }[] {
  const visible = isCurrentRange(range, now)
    ? buckets.filter((bucket) => bucket.start <= now)
    : buckets;
  return visible.map((bucket, index) => {
    const recent = visible.slice(Math.max(0, index - 2), index + 1);
    return {
      label: bucket.label,
      count: bucket.count,
      average:
        recent.reduce((sum, item) => sum + item.count, 0) /
        recent.length,
    };
  });
}

// ── 半小时 × 星期热力矩阵：行=周一..周日，列=00:00–24:00 共 48 格。
// 一段 N 番茄的专注按覆盖时长占比摊到各格（如 25 分钟跨两格则各摊一半），
// 缺 endedAt 时用 startedAt + acceptedSeconds/plannedSeconds 兜底
export type HeatMatrix = { rows: number[][]; max: number };
export function halfHourMatrix(
  records: FocusSession[],
  range: { start: number; end: number }
): HeatMatrix {
  const rows = Array.from({ length: 7 }, () =>
    new Array<number>(48).fill(0)
  );
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
export function topTasks(
  records: FocusSession[],
  limit = 6
): TopTask[] {
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

// ── 时段偏好：把热力矩阵按 深夜(0–6)/上午(6–12)/下午(12–18)/晚间(18–24)
// 四个时段汇总，回答「我一般在什么时候专注」；不含任何任务名，隐私安全 ──
export type Daypart = {
  key: "night" | "morning" | "afternoon" | "evening";
  label: string;
  hours: string;
  count: number; // 番茄数（跨格分摊可能带小数，展示层自行取整）
};
const DAYPART_DEFS: Omit<Daypart, "count">[] = [
  { key: "night", label: "深夜", hours: "0–6 点" },
  { key: "morning", label: "上午", hours: "6–12 点" },
  { key: "afternoon", label: "下午", hours: "12–18 点" },
  { key: "evening", label: "晚间", hours: "18–24 点" },
];
export function daypartSplit(heat: HeatMatrix): Daypart[] {
  return DAYPART_DEFS.map((def, i) => {
    const from = i * 12;
    let count = 0;
    for (const row of heat.rows)
      for (let c = from; c < from + 12; c++) count += row[c];
    return { ...def, count };
  });
}

// ── 环比：与上一周期的差值百分比。上期无数据（≤0）时返回 null（宁缺毋滥） ──
export function periodDelta(
  current: number,
  previous: number
): { pct: number } | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  if (!Number.isFinite(current)) return null;
  return { pct: Math.round(((current - previous) / previous) * 100) };
}

// ── 滚动窗口趋势（Apple 训练负荷式口径）──
// 不拿「本周/本月到目前为止」跟「上一个完整周期」比（周二 vs 上周 7 天必然误导），
// 而是锚定视角最后一天做滚动窗口日均对比（与 Apple Watch 训练负荷
// 「近 7 天 vs 近 28 天基线」同族，基准窗含最近 N 天）：
//   周视图 近 7 天日均 vs 近 28 天日均；月 近 28 vs 近 90；
//   季 近 90 vs 近 180；年 近 365 vs 近 730。
// 数据不足完整基准窗时降级为实际可用天数（标签如实写「较近 14 天日均」）；
// 可用天数 ≤ 当前窗（比较失去意义）或根本没有记录时返回 null（不显示对比）。
// 指标口径：番茄/专注时长按窗口日历天日均；日均番茄按窗口活跃日日均；
// 活跃天数是计数指标，比「活跃率」（活跃天数/窗口天数）——与
// 「当前活跃天数 vs 基准同比例期望值」的百分比数学等价但更好解释；
// 连续收获是 streak 本身，不参与环比。
export type RollingTrend = {
  currentDays: number; // 当前窗口天数（固定：7/28/90/365）
  baseDays: number; // 实际基准窗口天数（降级后可能小于名义值 28/90/180/730）
  curStart: number; // 当前窗口起点（含，本地 0 点）
  baseStart: number; // 基准窗口起点（含）
  end: number; // 两窗共同终点（排他，锚点次日 0 点）
  count: { pct: number } | null;
  seconds: { pct: number } | null;
  avgPerActiveDay: { pct: number } | null;
  activeRate: { pct: number } | null;
};
const ROLLING_DAYS: Record<
  RangeKey,
  { current: number; base: number }
> = {
  week: { current: 7, base: 28 },
  month: { current: 28, base: 90 },
  quarter: { current: 90, base: 180 },
  year: { current: 365, base: 730 },
};
export function rollingTrend(
  records: FocusSession[],
  key: RangeKey,
  anchor: number // 视角最后一天内的任意时刻（当前区间传今天，历史翻页传该区间末尾）
): RollingTrend | null {
  const { current: N, base: M } = ROLLING_DAYS[key];
  const anchorDay = dayStart(anchor);
  let first = Infinity;
  for (const r of records)
    if (r.status === "saved" && r.startedAt < first)
      first = r.startedAt;
  if (!Number.isFinite(first)) return null;
  // 可用数据跨度：首条记录所在日到锚点日的天数（锚点之前没有记录则为 0）
  const dataDays = Math.floor((anchorDay - dayStart(first)) / DAY) + 1;
  const B = Math.min(M, dataDays);
  if (B <= N) return null;
  const end = anchorDay + DAY;
  const curStart = anchorDay - (N - 1) * DAY;
  const baseStart = anchorDay - (B - 1) * DAY;
  const scoped = (start: number) => inRange(records, { start, end });
  const cur = summarize(scoped(curStart));
  const base = summarize(scoped(baseStart));
  return {
    currentDays: N,
    baseDays: B,
    curStart,
    baseStart,
    end,
    count: periodDelta(cur.count / N, base.count / B),
    seconds: periodDelta(cur.seconds / N, base.seconds / B),
    avgPerActiveDay: periodDelta(cur.avgCount, base.avgCount),
    // 活跃率对比：(当前活跃天数/N) vs (基准活跃天数/B)，
    // 等价于「当前活跃天数 vs 基准活跃天数×N/B」的期望口径
    activeRate: periodDelta(cur.activeDays / N, base.activeDays / B),
  };
}

// ── 时段趋势：与上期相比的产出重心变化。
// 重心时段不同 → 「产出重心从 X 移到 Y」；重心相同但占比变化 ≥8 个百分点 →
// 「X 产出占比 ±N 个百分点」；否则 null（数据不足或无变化时不显示） ──
export function daypartTrend(
  cur: Daypart[],
  prev: Daypart[]
): string | null {
  const total = (ds: Daypart[]) => ds.reduce((a, d) => a + d.count, 0);
  const tc = total(cur);
  const tp = total(prev);
  if (tc <= 0 || tp <= 0) return null;
  const dominant = (ds: Daypart[], t: number) =>
    ds.reduce(
      (best, d) =>
        d.count / t > best.share
          ? { label: d.label, share: d.count / t }
          : best,
      { label: "", share: -1 }
    );
  const cTop = dominant(cur, tc);
  const pTop = dominant(prev, tp);
  if (cTop.label !== pTop.label)
    return `产出重心从${pTop.label}移到${cTop.label}`;
  const diff = Math.round((cTop.share - pTop.share) * 100);
  if (Math.abs(diff) >= 8)
    return `${cTop.label}产出占比 ${
      diff > 0 ? "+" : ""
    }${diff} 个百分点`;
  return null;
}
