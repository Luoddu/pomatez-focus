import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// shareCard.ts 按打包器惯例写 "./stats"，node 需要补扩展名才能解析。
register(new URL("./ts-extension-hook.mjs", import.meta.url));

const { HEAT_COLORS, heatTier, shareCardModel } = await import(
  "../app/renderer/src/focus/shareCard.ts"
);
const { rangeOf } = await import("../app/renderer/src/focus/stats.ts");

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const rec = (startedAt, count, minutes = 25, extra = {}) => ({
  id: `r-${startedAt}-${count}`,
  task: { id: "t", title: "写报告 · 第 1 个番茄", source: "local" },
  startedAt,
  endedAt: startedAt + minutes * 60000,
  plannedSeconds: 1500,
  elapsedSeconds: minutes * 60,
  acceptedSeconds: minutes * 60,
  completedCount: count,
  status: "saved",
  sync: "local",
  ...extra,
});

// 2026-09-21 是周一；now 取当周周三下午
const NOW = at(2026, 9, 23, 15);
const RECORDS = [
  rec(at(2026, 9, 21, 9), 2), // 周一上午 2 个
  rec(at(2026, 9, 22, 14), 3), // 周二下午 3 个
  rec(at(2026, 9, 23, 10), 1), // 周三上午 1 个
  rec(at(2026, 8, 10, 20), 4), // 区间外（上月）4 个，计入累计
];

test("shareCardModel：区间汇总与标签", () => {
  const model = shareCardModel(RECORDS, rangeOf("week", NOW), NOW);
  assert.equal(model.rangeName, "本周");
  assert.equal(model.barTitle, "每日收获");
  assert.equal(model.count, 6); // 2+3+1，不含区间外
  assert.equal(model.seconds, 3 * 25 * 60); // 时长按会话计（3 段 × 25 分钟）
  assert.equal(model.activeDays, 3);
  assert.equal(model.streak, 3); // 周一二三连续
  assert.equal(model.bestDayLabel, "9.22 · 3 个");
  assert.ok(model.rangeLabel.includes("9.21"));
});

test("shareCardModel：黄金时段落在最高热力格", () => {
  const model = shareCardModel(RECORDS, rangeOf("week", NOW), NOW);
  // 周二 14:00 起 3 个番茄 75 分钟，14:00 格热力最高
  assert.equal(model.goldenLabel, "周二 14:00");
});

test("shareCardModel：热力矩阵 7×24 且不含任务名字段", () => {
  const model = shareCardModel(RECORDS, rangeOf("week", NOW), NOW);
  assert.equal(model.hours.length, 7);
  assert.equal(model.hours[0].length, 24);
  assert.ok(model.hours.flat().some((v) => v > 0));
  // 隐私：模型任何字段都不应携带任务名
  assert.ok(!JSON.stringify(model).includes("写报告"));
});

test("shareCardModel：节气 pill 与累计里程碑", () => {
  const model = shareCardModel(RECORDS, rangeOf("week", NOW), NOW);
  // 2026-09-23 是秋分当天或前后：白露→秋分之间
  assert.ok(["白露", "秋分"].includes(model.termName));
  assert.ok(model.termDay >= 1);
  assert.equal(model.totalAll, 10); // 含区间外的 4 个
  assert.equal(model.milestoneReached, 10);
  assert.equal(model.milestoneNext, 25);
});

test("shareCardModel：空区间不崩、字段兜底", () => {
  const model = shareCardModel([], rangeOf("week", NOW), NOW);
  assert.equal(model.count, 0);
  assert.equal(model.streak, 0);
  assert.equal(model.bestDayLabel, null);
  assert.equal(model.goldenLabel, null);
  assert.equal(model.totalAll, 0);
});

test("heatTier / HEAT_COLORS 分档一致", () => {
  assert.equal(HEAT_COLORS.length, 6);
  assert.equal(heatTier(0), 0);
  assert.equal(heatTier(0.4), 1);
  assert.equal(heatTier(0.9), 2);
  assert.equal(heatTier(1.5), 3);
  assert.equal(heatTier(3), 4);
  assert.equal(heatTier(4), 5);
});
