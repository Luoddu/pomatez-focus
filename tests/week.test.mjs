import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WEEK_PLANT_CAP,
  PLANT_STAGES,
  beijingWeekStart,
  beijingHour,
  harvestTier,
  weekTomatoes,
  weekHarvest,
} from "../app/renderer/src/focus/week.ts";

// 2026-09-07 是周一；北京时间周一 00:00 = UTC 周日 16:00
const mondayUtc = Date.UTC(2026, 8, 6, 16, 0, 0);
test("beijingWeekStart pins Monday 00:00 in Beijing time regardless of machine timezone", () => {
  // 北京时间周四 2026-09-10 12:00（UTC 04:00）→ 本周一 09-07 00:00 北京
  assert.equal(
    beijingWeekStart(Date.UTC(2026, 8, 10, 4, 0, 0)),
    mondayUtc
  );
  // 周一 00:00 整（北京）→ 自身
  assert.equal(beijingWeekStart(mondayUtc), mondayUtc);
  // 周日深夜（北京 2026-09-13 23:59）仍属本周
  assert.equal(
    beijingWeekStart(Date.UTC(2026, 8, 13, 15, 59, 0)),
    mondayUtc
  );
  // 下周一 00:00（北京）翻篇
  assert.equal(
    beijingWeekStart(Date.UTC(2026, 8, 13, 16, 0, 0)),
    mondayUtc + 7 * 86400000
  );
});
test("weekTomatoes counts saved records inside the Beijing week window only", () => {
  const rec = (startedAt, completedCount, status = "saved") => ({
    startedAt,
    completedCount,
    status,
  });
  const records = [
    rec(mondayUtc, 2), // 周一边界内
    rec(mondayUtc + 3 * 86400000, 3),
    rec(mondayUtc + 7 * 86400000, 5), // 下周一，不算
    rec(mondayUtc - 1, 4), // 上周日最后一毫秒，不算
    rec(mondayUtc + 1000, 7, "pending"), // 未保存，不算
  ];
  assert.equal(weekTomatoes(records, mondayUtc + 1000), 5);
});
test("weekHarvest maps weekly count to plants and real tomato growth stages", () => {
  // 空地
  assert.deepEqual(weekHarvest(0), {
    plants: 0,
    steps: [],
    bonus: 0,
    stage: "空地",
  });
  // 每完成 1 个番茄 = 一格进度：1 株发芽
  assert.deepEqual(weekHarvest(1), {
    plants: 1,
    steps: [1],
    bonus: 0,
    stage: "发芽",
  });
  // 株数随完成数增加，到 8 株封顶
  assert.equal(weekHarvest(8).plants, WEEK_PLANT_CAP);
  assert.deepEqual(weekHarvest(8).steps, [1, 1, 1, 1, 1, 1, 1, 1]);
  // 均分、靠前株优先 +1：9 个 = 1 株幼苗 + 7 株发芽
  assert.deepEqual(weekHarvest(9).steps, [2, 1, 1, 1, 1, 1, 1, 1]);
  // 一天约 12 个：均分到 8 株，靠前 4 株进入「幼苗」
  const dozen = weekHarvest(12);
  assert.equal(dozen.plants, 8);
  assert.equal(dozen.stage, "幼苗");
  // 24 个：全部进入「成株」
  assert.deepEqual(weekHarvest(24).steps, Array(8).fill(3));
  assert.equal(weekHarvest(24).stage, "成株");
  // 满负荷一周约 60 个：全部红熟且有富余果实
  const full = weekHarvest(60);
  assert.deepEqual(full.steps, Array(8).fill(PLANT_STAGES.length));
  assert.equal(full.stage, "红熟");
  assert.equal(full.bonus, 60 - 8 * PLANT_STAGES.length);
  // 非法输入按空地处理
  assert.equal(weekHarvest(NaN).plants, 0);
  assert.equal(weekHarvest(-3).plants, 0);
});
test("beijingHour drives the sky regardless of machine timezone", () => {
  // UTC 04:00 = 北京 12:00；UTC 20:30 = 北京次日 04:30
  assert.equal(beijingHour(Date.UTC(2026, 8, 10, 4, 0, 0)), 12);
  assert.equal(beijingHour(Date.UTC(2026, 8, 10, 20, 30, 0)), 4.5);
});

import {
  QUADRANT_KEYS,
  QUADRANT_TONES,
  quadrantCounts,
  weekQuadrants,
  quadrantToneList,
} from "../app/renderer/src/focus/week.ts";
test("quadrantCounts groups saved records by task quadrant snapshot; unknown falls to free", () => {
  const rec = (quadrant, completedCount, status = "saved") => ({
    startedAt: 1000,
    completedCount,
    status,
    task: quadrant ? { quadrant } : {},
  });
  const counts = quadrantCounts([
    rec("iu", 2),
    rec("iu", 1),
    rec("inu", 3),
    rec("uni", 1),
    rec("unu", 4),
    rec(undefined, 2), // 自由/无象限 → free
    rec("bogus", 5), // 非法象限值 → free
    rec("iu", 9, "pending"), // 未保存不计
  ]);
  assert.deepEqual(counts, { iu: 3, inu: 3, uni: 1, unu: 4, free: 7 });
});
test("weekQuadrants applies the Beijing week window before grouping", () => {
  const rec = (startedAt, quadrant, completedCount) => ({
    startedAt,
    completedCount,
    status: "saved",
    task: { quadrant },
  });
  const counts = weekQuadrants(
    [
      rec(mondayUtc, "iu", 2), // 本周
      rec(mondayUtc + 2 * 86400000, "unu", 1), // 本周
      rec(mondayUtc - 1, "iu", 9), // 上周，不算
      rec(mondayUtc + 7 * 86400000, "inu", 9), // 下周，不算
    ],
    mondayUtc + 1000
  );
  assert.deepEqual(counts, { iu: 2, inu: 0, uni: 0, unu: 1, free: 0 });
});
test("quadrantToneList interleaves quadrant tones round-robin for a mixed look", () => {
  // 轮转交错：即使 iu 占多数，前几个果实也是混色
  assert.deepEqual(quadrantToneList({ iu: 2, inu: 1, uni: 0, unu: 1, free: 0 }), [
    "iu",
    "inu",
    "unu",
    "iu",
  ]);
  assert.deepEqual(quadrantToneList({ iu: 0, inu: 0, uni: 0, unu: 0, free: 0 }), []);
  // 五个象限键都有稳定色值，红=重要且紧急
  for (const k of QUADRANT_KEYS) assert.match(QUADRANT_TONES[k], /^#[0-9a-f]{6}$/);
  assert.equal(QUADRANT_TONES.iu, "#e57368");
});

test("harvestTier tiers the day-total achievement display", () => {
  assert.equal(harvestTier(0), "");
  assert.equal(harvestTier(4), "");
  assert.equal(harvestTier(5), "mid");
  assert.equal(harvestTier(9), "mid");
  assert.equal(harvestTier(10), "high");
  assert.equal(harvestTier(23), "high");
});

test("barTone：红色随数量渐深、金色随数量渐亮且光晕渐强", async () => {
  const { barTone } = await import("../app/renderer/src/focus/week.ts");
  // 0 个：中性灰、无光晕
  assert.equal(barTone(0).glow, null);
  assert.match(barTone(0).top, /^#e[ce]/);
  // 1–9：红色谱系，底部色随数量变深（G 通道递减）
  const g = (hex) => parseInt(hex.slice(3, 5), 16);
  assert.ok(g(barTone(1).bottom) > g(barTone(5).bottom));
  assert.ok(g(barTone(5).bottom) > g(barTone(9).bottom));
  assert.equal(barTone(7).glow, null);
  // ≥10：金色 + 光晕；越多光晕越强（半径与透明度递增）
  const radius = (glow) => parseFloat(glow.match(/0 0 ([\d.]+)px/)[1]);
  assert.ok(radius(barTone(20).glow) > radius(barTone(10).glow));
  assert.ok(barTone(30).glow); // 上限截断后仍有光晕
});

test("seasonOfMonth maps Beijing calendar months to farm seasons", async () => {
  const { seasonOfMonth, beijingMonth, totalMilestone, TOTAL_MILESTONES } =
    await import("../app/renderer/src/focus/week.ts");
  // 春 3–5 月（month 2..4）、夏 6–8（5..7）、秋 9–11（8..10）、冬 12–2（11,0,1）
  assert.equal(seasonOfMonth(2), "spring");
  assert.equal(seasonOfMonth(4), "spring");
  assert.equal(seasonOfMonth(5), "summer");
  assert.equal(seasonOfMonth(7), "summer");
  assert.equal(seasonOfMonth(8), "autumn");
  assert.equal(seasonOfMonth(10), "autumn");
  assert.equal(seasonOfMonth(11), "winter");
  assert.equal(seasonOfMonth(0), "winter");
  assert.equal(seasonOfMonth(1), "winter");
  // 越界输入收敛到合法季节，不抛错（12 回绕到 1 月=冬）
  assert.equal(seasonOfMonth(12), "winter");
  assert.equal(seasonOfMonth(-1), "winter");
});

test("beijingMonth reads the UTC+8 calendar month regardless of machine timezone", async () => {
  const { beijingMonth } = await import("../app/renderer/src/focus/week.ts");
  // 北京时间 2026-03-01 00:30 = UTC 2026-02-28 16:30：UTC 月还是 2 月，北京已 3 月
  assert.equal(beijingMonth(Date.UTC(2026, 1, 28, 16, 30, 0)), 2);
  // 北京时间 2026-01-31 20:00 = UTC 2026-01-31 12:00
  assert.equal(beijingMonth(Date.UTC(2026, 0, 31, 12, 0, 0)), 0);
});

test("totalMilestone steps through achievement tiers and clamps", async () => {
  const { totalMilestone, TOTAL_MILESTONES } = await import(
    "../app/renderer/src/focus/week.ts"
  );
  assert.deepEqual(totalMilestone(0), { reached: 0, next: 10 });
  assert.deepEqual(totalMilestone(9), { reached: 0, next: 10 });
  assert.deepEqual(totalMilestone(10), { reached: 10, next: 25 });
  assert.deepEqual(totalMilestone(49), { reached: 25, next: 50 });
  assert.deepEqual(totalMilestone(50), { reached: 50, next: 100 });
  assert.deepEqual(totalMilestone(109), { reached: 100, next: 200 });
  // 超过最高档后不再上涨，进度条按满格处理
  const last = TOTAL_MILESTONES[TOTAL_MILESTONES.length - 1];
  assert.deepEqual(totalMilestone(last + 500), { reached: last, next: last });
  // 非法输入按 0 处理
  assert.deepEqual(totalMilestone(NaN), { reached: 0, next: 10 });
});

test("flagMarks：终点档之前每 25 个一面小旗", async () => {
  const { flagMarks } = await import("../app/renderer/src/focus/week.ts");
  assert.deepEqual(flagMarks(10), []); // 第一档 10 以内无小旗
  assert.deepEqual(flagMarks(25), []);
  assert.deepEqual(flagMarks(100), [25, 50, 75]);
  assert.deepEqual(flagMarks(200), [25, 50, 75, 100, 125, 150, 175]);
  assert.equal(flagMarks(200).length, 7); // 7 小旗 + 终点大旗 = 8 面
});

test("crossedFlags：越过的小旗与里程碑档，升序、去重、倒退为空", async () => {
  const { crossedFlags } = await import("../app/renderer/src/focus/week.ts");
  assert.deepEqual(crossedFlags(120, 128), [125]);
  assert.deepEqual(crossedFlags(98, 102), [100]); // 里程碑档也是旗
  assert.deepEqual(crossedFlags(90, 130), [100, 125]);
  assert.deepEqual(crossedFlags(128, 120), []); // 减少不触发
  assert.deepEqual(crossedFlags(128, 128), []);
  assert.deepEqual(crossedFlags(9, 10), [10]); // 第一档 10
});
