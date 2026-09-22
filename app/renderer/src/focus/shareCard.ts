// 分享卡片（成就图）：统计页一键导出 PNG，分享收获而不暴露任何任务名。
// 数据装配 shareCardModel 为纯函数（node --test 可直接断言）；
// drawShareCard 依赖 Canvas 2D，仅渲染层调用，测试用 __shareCardPngLength 钩子断言。
import {
  barBuckets,
  currentStreak,
  daypartSplit,
  halfHourMatrix,
  hourlyRows,
  inRange,
  summarize,
} from "./stats";
import type { RangeInfo, RangeKey } from "./stats";
import {
  QUADRANT_KEYS,
  QUADRANT_TONES,
  barTone,
  mixColor,
  quadrantCounts,
  totalMilestone,
} from "./week";
import { termInfo } from "./solarTerms";
import type { FocusSession } from "./session";

// 与 focus.css 的 hm-t0..5 同一番茄红热力色板
export const HEAT_COLORS = [
  "#f0f1f4",
  "#fde3e1",
  "#f9bcb8",
  "#f38b82",
  "#e5533f",
  "#c22f1f",
];
export const heatTier = (v: number) =>
  v <= 0 ? 0 : v < 0.5 ? 1 : v < 1 ? 2 : v < 2 ? 3 : v < 4 ? 4 : 5;

const WEEK_CHARS = "一二三四五六日";
const RANGE_NAME: Record<RangeKey, string> = {
  week: "本周",
  month: "本月",
  quarter: "本季",
  year: "今年",
};
const BAR_TITLE: Record<RangeKey, string> = {
  week: "每日收获",
  month: "每日收获",
  quarter: "每周收获",
  year: "每月收获",
};

export type ShareCardModel = {
  rangeName: string;
  rangeLabel: string;
  barTitle: string;
  termEmoji: string;
  termName: string;
  termDay: number;
  count: number;
  seconds: number;
  activeDays: number;
  streak: number;
  bestDayLabel: string | null; // 「9.20 · 12 个」
  goldenLabel: string | null; // 「周三 14:30」
  buckets: { label: string; count: number }[];
  hours: number[][]; // 7 × 24
  dayparts: { label: string; icon: string; count: number }[];
  quads: { key: string; tone: string; count: number }[];
  totalAll: number;
  milestoneReached: number;
  milestoneNext: number;
};

export function shareCardModel(
  records: FocusSession[],
  range: RangeInfo,
  now: number
): ShareCardModel {
  const scoped = inRange(records, range);
  const summary = summarize(scoped);
  const streak = currentStreak(records, now);
  const buckets = barBuckets(scoped, range, now).map((b) => ({
    label: b.label,
    count: b.count,
  }));
  const heat = halfHourMatrix(scoped, range);
  const hours = hourlyRows(heat);
  const dayparts = daypartSplit(heat).map((d) => ({
    label: d.label,
    icon: d.icon,
    count: d.count,
  }));
  const quadCounts = quadrantCounts(scoped);
  const quads = QUADRANT_KEYS.map((key) => ({
    key,
    tone: QUADRANT_TONES[key],
    count: quadCounts[key],
  }));
  // 黄金时段：热力矩阵最高格
  let goldenLabel: string | null = null;
  let best = 0;
  heat.rows.forEach((cols, row) =>
    cols.forEach((value, col) => {
      if (value > best) {
        best = value;
        goldenLabel = `周${WEEK_CHARS[row]} ${String(
          Math.floor(col / 2)
        ).padStart(2, "0")}:${col % 2 ? "30" : "00"}`;
      }
    })
  );
  const term = termInfo(now);
  const total = summarize(records.filter((r) => r.status === "saved"));
  const milestone = totalMilestone(total.count);
  return {
    rangeName: RANGE_NAME[range.key],
    rangeLabel: range.label,
    barTitle: BAR_TITLE[range.key],
    termEmoji: term.emoji,
    termName: term.name,
    termDay: term.dayOfTerm,
    count: summary.count,
    seconds: summary.seconds,
    activeDays: summary.activeDays,
    streak,
    bestDayLabel: summary.bestDay
      ? `${new Date(summary.bestDay.date).getMonth() + 1}.${new Date(
          summary.bestDay.date
        ).getDate()} · ${summary.bestDay.count} 个`
      : null,
    goldenLabel,
    buckets,
    hours,
    dayparts,
    quads,
    totalAll: total.count,
    milestoneReached: milestone.reached,
    milestoneNext: milestone.next,
  };
}

// ── 绘制 ──
const W = 1080;
const H = 1520;
const FONT = `"Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif`;

const durText = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, Math.round(seconds)) / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
};

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function drawShareCard(
  canvas: HTMLCanvasElement,
  model: ShareCardModel
): void {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  // 背景：温暖纸面渐变 + 四角淡淡番茄红晕
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fff9f3");
  bg.addColorStop(1, "#fdeee4");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const halo = g.createRadialGradient(W - 60, 40, 10, W - 60, 40, 420);
  halo.addColorStop(0, "rgba(229, 83, 63, 0.10)");
  halo.addColorStop(1, "rgba(229, 83, 63, 0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, W, 460);

  const M = 72; // 页边距
  const CW = W - M * 2; // 内容宽
  let y = 84;

  // ── 页眉：品牌 + 节气 pill ──
  g.fillStyle = "#c22f1f";
  g.font = `700 46px ${FONT}`;
  g.textBaseline = "alphabetic";
  g.fillText("🍅 番茄农场", M, y + 12);
  const pill = `${model.termEmoji} ${model.termName} · 第 ${model.termDay} 天`;
  g.font = `500 26px ${FONT}`;
  const pillW = g.measureText(pill).width + 56;
  g.fillStyle = "rgba(194, 47, 31, 0.08)";
  roundRect(g, W - M - pillW, y - 26, pillW, 52, 26);
  g.fill();
  g.fillStyle = "#a8452f";
  g.fillText(pill, W - M - pillW + 28, y + 9);

  y += 66;
  g.fillStyle = "#8a7f76";
  g.font = `400 28px ${FONT}`;
  g.fillText(`专注收获报告 · ${model.rangeName}（${model.rangeLabel}）`, M, y);

  // ── 主数字区 ──
  y += 78;
  g.fillStyle = "#2b2620";
  g.font = `800 132px ${FONT}`;
  g.fillText(String(model.count), M, y + 40);
  const numW = g.measureText(String(model.count)).width;
  g.font = `600 34px ${FONT}`;
  g.fillStyle = "#a09385";
  g.fillText("个番茄", M + numW + 18, y + 40);

  g.textAlign = "right";
  g.fillStyle = "#2b2620";
  g.font = `700 44px ${FONT}`;
  g.fillText(durText(model.seconds), W - M, y - 8);
  g.fillStyle = model.streak >= 3 ? "#e8a917" : "#a09385";
  g.font = `600 30px ${FONT}`;
  g.fillText(
    model.streak > 0 ? `🔥 连续收获 ${model.streak} 天` : "种下第一颗番茄吧",
    W - M,
    y + 42
  );
  g.textAlign = "left";

  // ── 通用卡片 ──
  const card = (h: number, title: string) => {
    y += 56;
    g.fillStyle = "#ffffff";
    g.shadowColor = "rgba(120, 60, 40, 0.10)";
    g.shadowBlur = 24;
    g.shadowOffsetY = 6;
    roundRect(g, M, y, CW, h, 28);
    g.fill();
    g.shadowColor = "transparent";
    g.shadowBlur = 0;
    g.shadowOffsetY = 0;
    g.fillStyle = "#6b5f54";
    g.font = `600 30px ${FONT}`;
    g.fillText(title, M + 40, y + 62);
    y += 92;
  };

  // ── 收获柱状图（成就色：红系渐深、金系渐耀，复用 barTone 色板）──
  const barCardH = 340;
  card(barCardH, `🍅 ${model.barTitle}`);
  {
    const n = model.buckets.length;
    const plotW = CW - 80;
    const plotH = 168;
    const step = plotW / n;
    const bw = Math.min(44, step * 0.62);
    const max = Math.max(1, ...model.buckets.map((b) => b.count));
    const base = y + plotH;
    model.buckets.forEach((b, i) => {
      const cx = M + 40 + step * i + step / 2;
      const tone = barTone(b.count);
      const h = b.count > 0 ? Math.max(10, (b.count / max) * plotH) : 5;
      const grad = g.createLinearGradient(0, base - h, 0, base);
      grad.addColorStop(0, tone.top);
      grad.addColorStop(1, tone.bottom);
      if (tone.glow && b.count >= 10) {
        g.shadowColor = "rgba(232, 169, 23, 0.55)";
        g.shadowBlur = 8 + Math.min(1, (b.count - 10) / 10) * 14;
      }
      g.fillStyle = grad;
      roundRect(g, cx - bw / 2, base - h, bw, h, Math.min(8, bw / 2));
      g.fill();
      g.shadowBlur = 0;
      // 轴标签：桶多则隔档显示，保证不挤
      const every = n > 16 ? Math.ceil(n / 8) : n > 8 ? 2 : 1;
      if (i % every === 0) {
        g.fillStyle = "#b3a898";
        g.font = `400 21px ${FONT}`;
        g.textAlign = "center";
        g.fillText(b.label, cx, base + 34);
        g.textAlign = "left";
      }
    });
    y += plotH + 52;
  }

  // ── 时段热力（7 行 × 24 列，纵轴星期、横轴 0–24 点）──
  const hmCardH = 380;
  card(hmCardH, "⏰ 时段热力");
  {
    const labelW = 46;
    const plotW = CW - 80 - labelW;
    const cell = Math.floor((plotW - 23 * 5) / 24);
    const stepX = cell + 5;
    const stepY = cell + 6;
    const baseY = y; // 循环闭包固化当前 y（no-loop-func）
    model.hours.forEach((cols, row) => {
      const cy = baseY + row * stepY;
      g.fillStyle = "#b3a898";
      g.font = `400 22px ${FONT}`;
      g.textAlign = "center";
      g.fillText(WEEK_CHARS[row], M + 40 + labelW / 2, cy + cell - 6);
      g.textAlign = "left";
      cols.forEach((v, col) => {
        g.fillStyle = HEAT_COLORS[heatTier(v)];
        roundRect(
          g,
          M + 40 + labelW + col * stepX,
          cy,
          cell,
          cell,
          5
        );
        g.fill();
      });
    });
    const hy = y + 7 * stepY + 26;
    g.fillStyle = "#b3a898";
    g.font = `400 21px ${FONT}`;
    for (const hMark of [0, 6, 12, 18]) {
      g.textAlign = "center";
      g.fillText(
        `${hMark}:00`,
        M + 40 + labelW + hMark * stepX + cell / 2,
        hy
      );
    }
    g.fillText("24:00", M + 40 + labelW + 24 * stepX - 4, hy);
    g.textAlign = "left";
    y = hy + 14;
  }

  // ── 双联小卡：时段偏好 + 象限分布 ──
  const duoH = 250;
  const gap = 28;
  const halfW = (CW - gap) / 2;
  y += 40;
  for (const side of [0, 1]) {
    const x = M + side * (halfW + gap);
    g.fillStyle = "#ffffff";
    g.shadowColor = "rgba(120, 60, 40, 0.10)";
    g.shadowBlur = 24;
    g.shadowOffsetY = 6;
    roundRect(g, x, y, halfW, duoH, 28);
    g.fill();
    g.shadowColor = "transparent";
    g.shadowBlur = 0;
    g.shadowOffsetY = 0;
    g.fillStyle = "#6b5f54";
    g.font = `600 28px ${FONT}`;
    g.fillText(side === 0 ? "🕰️ 时段偏好" : "🧭 象限分布", x + 34, y + 56);
    const items =
      side === 0
        ? model.dayparts.map((d) => ({
            tag: d.icon,
            label: d.label,
            count: d.count,
            tone: "#e57368",
          }))
        : model.quads.map((q) => ({
            tag: "",
            label: "",
            count: q.count,
            tone: q.tone,
          }));
    const maxCount = Math.max(1, ...items.map((it) => it.count));
    const rows = items.length;
    const duoY = y; // 循环闭包固化当前 y（no-loop-func）
    items.forEach((it, i) => {
      const ry = duoY + 88 + i * ((duoH - 108) / rows);
      const rh = 20;
      if (side === 0) {
        g.font = `400 24px ${FONT}`;
        g.fillStyle = "#7d7166";
        g.fillText(`${it.tag} ${it.label}`, x + 34, ry + rh - 2);
      } else {
        g.fillStyle = it.tone;
        g.beginPath();
        g.arc(x + 44, ry + rh / 2 - 2, 9, 0, Math.PI * 2);
        g.fill();
      }
      const barX = x + (side === 0 ? 150 : 70);
      const barW = halfW - (side === 0 ? 150 : 70) - 92;
      g.fillStyle = "#f0ede8";
      roundRect(g, barX, ry, barW, rh, rh / 2);
      g.fill();
      if (it.count > 0) {
        g.fillStyle = it.tone;
        roundRect(
          g,
          barX,
          ry,
          Math.max(rh, (it.count / maxCount) * barW),
          rh,
          rh / 2
        );
        g.fill();
      }
      g.fillStyle = "#7d7166";
      g.font = `500 22px ${FONT}`;
      g.textAlign = "right";
      g.fillText(`${Math.round(it.count)}`, x + halfW - 30, ry + rh - 2);
      g.textAlign = "left";
    });
  }
  y += duoH;

  // ── 页脚：累计里程碑 + 水印 ──
  y += 74;
  g.fillStyle = "#a09385";
  g.font = `500 26px ${FONT}`;
  const remain = model.milestoneNext - model.totalAll;
  g.fillText(
    `累计收获 ${model.totalAll} 个番茄` +
      (remain > 0 ? ` · 距 ${model.milestoneNext} 里程碑还差 ${remain} 个` : ""),
    M,
    y
  );
  // 里程碑进度条
  const from = model.milestoneReached;
  const to = model.milestoneNext;
  const prog =
    to > from ? Math.min(1, (model.totalAll - from) / (to - from)) : 1;
  g.fillStyle = "#f0e6db";
  roundRect(g, M, y + 22, CW, 14, 7);
  g.fill();
  const pg = g.createLinearGradient(M, 0, M + CW * prog, 0);
  pg.addColorStop(0, "#f38b82");
  pg.addColorStop(1, "#e8a917");
  g.fillStyle = pg;
  if (prog > 0) {
    roundRect(g, M, y + 22, Math.max(14, CW * prog), 14, 7);
    g.fill();
  }
  g.fillStyle = "#c9bcae";
  g.font = `400 22px ${FONT}`;
  g.textAlign = "right";
  g.fillText("Pomatez Focus · 番茄农场", W - M, H - 44);
  g.textAlign = "left";
}

// 生成 PNG dataURL（渲染层调用；测试钩子：__SHARE_CARD_HOOK__ 时只记录不下载）
export function renderShareCardPng(model: ShareCardModel): string {
  const canvas = document.createElement("canvas");
  drawShareCard(canvas, model);
  return canvas.toDataURL("image/png");
}
