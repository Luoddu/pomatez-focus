import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TERM_NAMES,
  termStart,
  termInfo,
  seasonOfTerm,
  termOverlay,
} from "../app/renderer/src/focus/solarTerms.ts";

const BJ = 8 * 3600000;
const DAY = 86400000;
// 节气日的北京时间 (月, 日)
const bjDate = (ms) => {
  const d = new Date(ms + BJ);
  return [d.getUTCMonth() + 1, d.getUTCDate()];
};

// 万年历标准交节日（2024–2026 全部 72 个节气）
const ALMANAC = {
  2024: [
    [1, 6], [1, 20], [2, 4], [2, 19], [3, 5], [3, 20], [4, 4], [4, 19],
    [5, 5], [5, 20], [6, 5], [6, 21], [7, 6], [7, 22], [8, 7], [8, 22],
    [9, 7], [9, 22], [10, 8], [10, 23], [11, 7], [11, 22], [12, 6], [12, 21],
  ],
  2025: [
    [1, 5], [1, 20], [2, 3], [2, 18], [3, 5], [3, 20], [4, 4], [4, 20],
    [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 22], [8, 7], [8, 23],
    [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 21],
  ],
  2026: [
    [1, 5], [1, 20], [2, 4], [2, 18], [3, 5], [3, 20], [4, 5], [4, 20],
    [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 23], [8, 7], [8, 23],
    [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22],
  ],
};

test("节气交节日与万年历一致（2024–2026）", () => {
  for (const [year, dates] of Object.entries(ALMANAC)) {
    dates.forEach(([month, day], index) => {
      assert.deepEqual(
        bjDate(termStart(Number(year), index)),
        [month, day],
        `${year} ${TERM_NAMES[index]}`
      );
    });
  }
});

test("termInfo：交节当天为第 1 天，daysToNext 为历法日差", () => {
  // 2026 秋分交节时刻前后
  const qiufen = termStart(2026, 17);
  const onTerm = termInfo(qiufen + HOUR_MS());
  assert.equal(onTerm.name, "秋分");
  assert.equal(onTerm.dayOfTerm, 1);
  assert.equal(onTerm.nextName, "寒露");
  // 秋分当天 → 寒露还有 15 个历法日（9/23 → 10/8）
  assert.equal(onTerm.daysToNext, 15);
  // 交节时刻前 1 小时（同一历法日）：仍是白露，今天交节 daysToNext = 0
  const before = termInfo(qiufen - 3600000);
  assert.equal(before.name, "白露");
  assert.equal(before.daysToNext, 0);
});

test("termInfo：跨年边界（1 月初属上一年的小寒窗口）", () => {
  const info = termInfo(Date.UTC(2026, 0, 3, 12)); // 2026-01-03 20:00 北京
  assert.equal(info.name, "冬至");
  assert.equal(info.nextName, "小寒");
  assert.equal(info.daysToNext, 2); // 1/3 → 1/5
});

test("节气季与点景映射", () => {
  assert.equal(seasonOfTerm(2), "spring"); // 立春
  assert.equal(seasonOfTerm(11), "summer"); // 夏至
  assert.equal(seasonOfTerm(17), "autumn"); // 秋分
  assert.equal(seasonOfTerm(23), "winter"); // 冬至
  assert.equal(seasonOfTerm(0), "winter"); // 小寒
  assert.equal(termOverlay(3), "rain"); // 雨水
  assert.equal(termOverlay(6), "rain"); // 清明
  assert.equal(termOverlay(16), "dew"); // 白露
  assert.equal(termOverlay(19), "frost"); // 霜降
  assert.equal(termOverlay(17), null); // 秋分
});

function HOUR_MS() {
  return 3600000;
}
