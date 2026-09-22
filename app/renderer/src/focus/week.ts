// 周制番茄园数据模型（纯函数，node --test 可直接断言）。
// 一周一轮：北京时间（UTC+8，无夏令时）周一 00:00 起算，周日 24:00 翻篇重种。
// 生长映射：本周每完成 1 个番茄 = 田里多 1 格生长进度；
// 株数 = min(本周完成数, 8)（视觉上限），进度在株间尽量均分、靠前株优先 +1；
// 每株 7 格对应真实番茄生长阶段：发芽(两片子叶) → 幼苗(真叶) → 成株(羽状
// 复叶、茎粗壮) → 开花(黄色星形小花) → 坐果(绿果) → 转色 → 红熟；
// 一周满负荷约 60 个刚好全部红熟（8×7=56）并有富余，超出的番茄不再长高，
// 变成单株额外果实（更繁茂）。
export const WEEK_PLANT_CAP = 8;
export const PLANT_STAGES = [
  "发芽",
  "幼苗",
  "成株",
  "开花",
  "坐果",
  "转色",
  "红熟",
] as const;
const DAY_MS = 86400000;
const BEIJING_OFFSET_MS = 8 * 3600000;

// 北京时间本周一 00:00 对应的时间戳：先把时钟平移到 UTC+8 取历法周一，
// 再平移回真实时间轴
export function beijingWeekStart(now: number): number {
  const shifted = new Date(now + BEIJING_OFFSET_MS);
  const mondayOffset = (shifted.getUTCDay() + 6) % 7; // 周一=0 … 周日=6
  return (
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate()
    ) -
    mondayOffset * DAY_MS -
    BEIJING_OFFSET_MS
  );
}

// 本周已完成番茄数：只统计已保存且开始时间落在本周窗口内的记录
export function weekTomatoes(
  records: { status: string; startedAt: number; completedCount?: number }[],
  now: number
): number {
  const start = beijingWeekStart(now);
  return records
    .filter(
      (r) =>
        r.status === "saved" &&
        r.startedAt >= start &&
        r.startedAt < start + 7 * DAY_MS
    )
    .reduce((n, r) => n + (r.completedCount || 0), 0);
}

export type WeekHarvest = {
  plants: number; // 田里株数（0 = 空地）
  steps: number[]; // 每株生长格数 1..7，对应 PLANT_STAGES 下标 0..6
  bonus: number; // 全部红熟后超出的番茄数（转成额外果实）
  stage: string; // 最靠前株的阶段名，空地时为「空地」
};
export function weekHarvest(week: number): WeekHarvest {
  const n = Math.max(0, Math.floor(Number.isFinite(week) ? week : 0));
  if (!n) return { plants: 0, steps: [], bonus: 0, stage: "空地" };
  const plants = Math.min(n, WEEK_PLANT_CAP);
  const per = PLANT_STAGES.length;
  const steps = Array.from({ length: plants }, (_, i) =>
    Math.min(per, Math.floor(n / plants) + (i < n % plants ? 1 : 0))
  );
  const bonus = Math.max(0, n - WEEK_PLANT_CAP * per);
  return { plants, steps, bonus, stage: PLANT_STAGES[steps[0] - 1] };
}

// 北京时间的小时（含分钟小数），驱动天空太阳/月亮连续弧线
export function beijingHour(now: number): number {
  const shifted = new Date(now + BEIJING_OFFSET_MS);
  return shifted.getUTCHours() + shifted.getUTCMinutes() / 60;
}

// ── 象限番茄色（行为诱导：让重要象限的番茄一眼可辨）──
// iu 重要且紧急=红（主色）、inu 重要不紧急=黄、uni 紧急不重要=青、
// unu 不紧急不重要=灰；自由番茄/无象限=青绿（无任务自然生长的中性色）。
// 柔化版色板：色相不变、降饱和略提亮，果实以径向渐变+高光呈现立体感
export type QuadrantKey = "iu" | "inu" | "uni" | "unu" | "free";
export const QUADRANT_KEYS: QuadrantKey[] = ["iu", "inu", "uni", "unu", "free"];
export const QUADRANT_TONES: Record<QuadrantKey, string> = {
  iu: "#e57368",
  inu: "#f2cd73",
  uni: "#63c3d2",
  unu: "#aab3bd",
  free: "#92c883",
};
// 颜色线性混合：t=0 返回 a，t=1 返回 b（渐变高光/暗部用）
export function mixColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) =>
      Math.round(v + (pb[i] - v) * t)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}
type QuadrantRecord = {
  status: string;
  startedAt: number;
  completedCount?: number;
  task?: { quadrant?: string };
};
// 象限取数口径：直接用 saved 记录里的任务快照 task.quadrant（计时开始时
// 从任务列表带入），缺失或非四象限值一律归入 free 中性色
export function quadrantCounts(
  records: QuadrantRecord[]
): Record<QuadrantKey, number> {
  const counts: Record<QuadrantKey, number> = {
    iu: 0,
    inu: 0,
    uni: 0,
    unu: 0,
    free: 0,
  };
  for (const r of records) {
    if (r.status !== "saved") continue;
    const q = r.task?.quadrant;
    const key: QuadrantKey =
      q === "iu" || q === "inu" || q === "uni" || q === "unu" ? q : "free";
    counts[key] += r.completedCount || 0;
  }
  return counts;
}
// 本周窗口内的象限分布，与 weekTomatoes 同一周口径
export function weekQuadrants(
  records: QuadrantRecord[],
  now: number
): Record<QuadrantKey, number> {
  const start = beijingWeekStart(now);
  return quadrantCounts(
    records.filter(
      (r) => r.startedAt >= start && r.startedAt < start + 7 * DAY_MS
    )
  );
}
// 展开成逐个番茄的色序列：五象限轮转交错（而不是按象限聚类），
// 让果堆/植株从前几个果实起就是混色；渲染时按下标取模循环，分布近似比例
export function quadrantToneList(
  counts: Record<QuadrantKey, number>
): QuadrantKey[] {
  const remaining = QUADRANT_KEYS.map((k) =>
    Math.max(0, Math.floor(counts[k]))
  );
  const list: QuadrantKey[] = [];
  let left = remaining.reduce((a, b) => a + b, 0);
  while (left > 0)
    for (let i = 0; i < QUADRANT_KEYS.length && left > 0; i++)
      if (remaining[i] > 0) {
        list.push(QUADRANT_KEYS[i]);
        remaining[i]--;
        left--;
      }
  return list;
}

// 当日番茄数的成就感分级：<5 常规灰、5–9 番茄红加粗、≥10 金色加大
export function harvestTier(count: number): "" | "mid" | "high" {
  if (count >= 10) return "high";
  if (count >= 5) return "mid";
  return "";
}

// 柱状图连续成就色（不用文字图例，颜色本身说话）：
// 1–9 个在番茄红谱系内越收越深（浅鲑红→深绯红）；≥10 个进入金色谱系，
// 收得越多金色越亮、光晕越大（闪耀感随数量连续增强，而不是只有一档金）
export type BarTone = { top: string; bottom: string; glow: string | null };
export function barTone(count: number): BarTone {
  if (count >= 10) {
    const t = Math.min(1, (count - 10) / 10); // 10 → 20+ 渐强
    return {
      top: mixColor("#f2cd73", "#ffedb3", t),
      bottom: mixColor("#e8a917", "#ffc93d", t),
      glow: `0 0 ${(6 + t * 12).toFixed(1)}px rgba(232, 169, 23, ${(
        0.32 +
        t * 0.45
      ).toFixed(2)})`,
    };
  }
  if (count >= 1) {
    const t = Math.min(1, (count - 1) / 8); // 1 → 9 渐深
    return {
      top: mixColor("#f38b82", "#e04a35", t),
      bottom: mixColor("#e57368", "#c02816", t),
      glow: null,
    };
  }
  return { top: "#eceef2", bottom: "#e2e5ea", glow: null };
}

// ── 季节时令（按北京时间月份）：给农场场景叠加轻量装饰 ──
// 春 3–5 月落樱、夏 6–8 月蜻蜓、秋 9–11 月落叶、冬 12–2 月飘雪；
// 只做克制的点景，不打断专注
export type Season = "spring" | "summer" | "autumn" | "winter";
export function seasonOfMonth(month: number): Season {
  const m = ((Math.floor(month) % 12) + 12) % 12; // 0=一月 … 11=十二月
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}
export function beijingMonth(now: number): number {
  return new Date(now + BEIJING_OFFSET_MS).getUTCMonth();
}

// 累计收获的里程碑（总番茄的成就刻度）：返回已达成的最大里程碑与下一档
export const TOTAL_MILESTONES = [10, 25, 50, 100, 200, 300, 500, 1000] as const;
export function totalMilestone(total: number): {
  reached: number; // 已达成档（0 = 还没到 10）
  next: number; // 下一档（全部达成后仍返回最后一档）
} {
  const n = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  let reached = 0;
  for (const m of TOTAL_MILESTONES) if (n >= m) reached = m;
  const idx = TOTAL_MILESTONES.findIndex((m) => m > n);
  return { reached, next: idx === -1 ? TOTAL_MILESTONES[TOTAL_MILESTONES.length - 1] : TOTAL_MILESTONES[idx] };
}

// 里程碑小旗：进度条轨道上每 25 个番茄一面小旗，终点档（next）为终点大旗
export const FLAG_STEP = 25;
export function flagMarks(next: number): number[] {
  const marks: number[] = [];
  for (let m = FLAG_STEP; m < next; m += FLAG_STEP) marks.push(m);
  return marks;
}
// 本次新增越过的旗子（25 倍数小旗 + 里程碑档），升序；无新增或倒退为空
export function crossedFlags(prev: number, now: number): number[] {
  const lo = Math.max(0, Math.floor(prev));
  const hi = Math.max(0, Math.floor(now));
  if (hi <= lo) return [];
  const crossed = new Set<number>();
  for (let m = FLAG_STEP; m <= hi; m += FLAG_STEP) if (m > lo) crossed.add(m);
  for (const t of TOTAL_MILESTONES) if (t > lo && t <= hi) crossed.add(t);
  return Array.from(crossed).sort((a, b) => a - b);
}
