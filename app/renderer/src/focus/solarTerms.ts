// 二十四节气（纯函数，node --test 可直接断言）。
// 节气时刻用低精度视太阳黄经计算：节气 i 对应黄经 285°+15i（小寒=285°），
// 在粗估日期 ±8 天窗口内逐小时扫描黄经过零点，再二分细化到分钟级。
// 算法误差约 ±0.01°（≈±15 分钟），节气落在哪一天（北京时间）几乎不会错。
import type { Season } from "./week";

const DAY = 86400000;
const HOUR = 3600000;
const BEIJING = 8 * HOUR;
const D2R = Math.PI / 180;

export const TERM_NAMES = [
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "处暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
  "冬至",
] as const;

// 农场节气 pill 的小图标：按节气物候选 emoji，一眼读出时节
export const TERM_EMOJI: Record<(typeof TERM_NAMES)[number], string> = {
  小寒: "❄️",
  大寒: "🧊",
  立春: "🌱",
  雨水: "💧",
  惊蛰: "⛈️",
  春分: "🌸",
  清明: "🍃",
  谷雨: "🌧️",
  立夏: "☀️",
  小满: "🌾",
  芒种: "🌿",
  夏至: "🌞",
  小暑: "🍉",
  大暑: "🔥",
  立秋: "🍁",
  处暑: "🌤️",
  白露: "💦",
  秋分: "🍂",
  寒露: "🌫️",
  霜降: "🌨️",
  立冬: "🧣",
  小雪: "🌨️",
  大雪: "☃️",
  冬至: "🥟",
};

// 视太阳黄经（度，0–360）：平黄经 + 中心差修正，精度 ~0.01°
const sunLongitude = (ms: number): number => {
  const jd = ms / DAY + 2440587.5;
  const n = jd - 2451545.0;
  const L = (((280.46 + 0.9856474 * n) % 360) + 360) % 360;
  const g = (((357.528 + 0.9856003 * n) % 360) + 360) % 360;
  const lon = L + 1.915 * Math.sin(g * D2R) + 0.02 * Math.sin(2 * g * D2R);
  return ((lon % 360) + 360) % 360;
};

// 节气 i 的目标黄经：小寒 285°，每节气 +15°
const termAngle = (index: number) => (285 + 15 * index) % 360;
// 节气所在月份（1–12）：小寒/大寒=1 月，立春/雨水=2 月，…，大雪/冬至=12 月
const termMonth = (index: number) => Math.floor((index + 2) / 2);

// 某年某节气的交节时刻（UTC 毫秒）。粗估日：上半月节气约 6 日、下半月约 21 日，
// ±8 天窗口必然覆盖真实交节；黄经周日运动约 1°，窗口内恰有一次过零
export function termStart(year: number, index: number): number {
  const target = termAngle(index);
  const mid = Date.UTC(year, termMonth(index) - 1, index % 2 === 0 ? 6 : 21);
  // 与目标黄经的带符号角距（-180..180）
  const delta = (t: number) => {
    const d = (sunLongitude(t) - target) % 360;
    return ((d + 540) % 360) - 180;
  };
  let lo = mid - 8 * DAY;
  let prev = delta(lo);
  let hi = -1;
  for (let t = lo + HOUR; t <= mid + 8 * DAY; t += HOUR) {
    const cur = delta(t);
    if (prev < 0 && cur >= 0) {
      hi = t;
      break;
    }
    prev = cur;
    lo = t;
  }
  if (hi < 0) return mid; // 理论到不了：窗口必然覆盖，兜底防意外
  for (let k = 0; k < 24; k++) {
    const t = (lo + hi) / 2;
    if (delta(t) < 0) lo = t;
    else hi = t;
  }
  return (lo + hi) / 2;
}

// 北京时间历法日 0 点（用于「第几天 / 还有几天」的整日口径）
const beijingDayStart = (ms: number) =>
  Math.floor((ms + BEIJING) / DAY) * DAY - BEIJING;

export type TermPoint = { year: number; index: number; start: number };
const yearCache = new Map<number, TermPoint[]>();
const yearTerms = (year: number): TermPoint[] => {
  let list = yearCache.get(year);
  if (!list) {
    list = TERM_NAMES.map((_, index) => ({
      year,
      index,
      start: termStart(year, index),
    }));
    yearCache.set(year, list);
  }
  return list;
};

export type TermInfo = {
  index: number; // 0=小寒 … 23=冬至
  name: (typeof TERM_NAMES)[number];
  emoji: string;
  start: number; // 交节时刻（UTC 毫秒）
  dayOfTerm: number; // 节气第几天（交节当天 = 1，北京时间历法日）
  nextIndex: number;
  nextName: (typeof TERM_NAMES)[number];
  nextEmoji: string;
  nextStart: number;
  daysToNext: number; // 距下一节气还有几个历法日（今天交节则为 0）
};
export function termInfo(now: number): TermInfo {
  const y = new Date(now + BEIJING).getUTCFullYear();
  const all = [y - 1, y, y + 1].flatMap(yearTerms);
  let k = 0;
  while (k + 1 < all.length && all[k + 1].start <= now) k++;
  const cur = all[k];
  const next = all[k + 1];
  return {
    index: cur.index,
    name: TERM_NAMES[cur.index],
    emoji: TERM_EMOJI[TERM_NAMES[cur.index]],
    start: cur.start,
    dayOfTerm:
      Math.round((beijingDayStart(now) - beijingDayStart(cur.start)) / DAY) +
      1,
    nextIndex: next.index,
    nextName: TERM_NAMES[next.index],
    nextEmoji: TERM_EMOJI[TERM_NAMES[next.index]],
    nextStart: next.start,
    daysToNext: Math.round(
      (beijingDayStart(next.start) - beijingDayStart(now)) / DAY
    ),
  };
}

// 节气季：立春–谷雨=春，立夏–大暑=夏，立秋–霜降=秋，立冬–大寒=冬。
// 比按月份切更贴合物候（如 9 月初白露已入秋、2 月初立春已入春）
export function seasonOfTerm(index: number): Season {
  if (index >= 2 && index <= 7) return "spring";
  if (index >= 8 && index <= 13) return "summer";
  if (index >= 14 && index <= 19) return "autumn";
  return "winter";
}

// 节气特色点景（叠在季节层之上）：雨水/清明/谷雨落细雨，白露/寒露凝露珠，
// 霜降地面覆薄霜；其余节气沿用四季层，克制不打扰专注
export type TermOverlay = "rain" | "dew" | "frost" | null;
export function termOverlay(index: number): TermOverlay {
  const name = TERM_NAMES[index];
  if (name === "雨水" || name === "清明" || name === "谷雨") return "rain";
  if (name === "白露" || name === "寒露") return "dew";
  if (name === "霜降") return "frost";
  return null;
}
