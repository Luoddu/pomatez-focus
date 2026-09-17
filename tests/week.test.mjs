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
