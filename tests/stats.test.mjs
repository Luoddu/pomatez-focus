import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rangeOf,
  shiftRange,
  isCurrentRange,
  inRange,
  summarize,
  currentStreak,
  barBuckets,
  halfHourMatrix,
  topTasks,
} from "../app/renderer/src/focus/stats.ts";

const DAY = 86400000;
// 本地某天某时刻的时间戳
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

test("rangeOf：周一起算 / 月 / 季 / 年", () => {
  // 2026-09-21 是周一
  const now = at(2026, 9, 21, 15);
  const week = rangeOf("week", now);
  assert.equal(new Date(week.start).getDate(), 21);
  assert.equal(week.end - week.start, 7 * DAY);
  const month = rangeOf("month", now);
  assert.equal(new Date(month.start).getMonth(), 8);
  assert.equal(month.label, "2026 年 9 月");
  const quarter = rangeOf("quarter", now);
  assert.equal(quarter.label, "2026 年 Q3");
  assert.equal(new Date(quarter.start).getMonth(), 6);
  const year = rangeOf("year", now);
  assert.equal(year.label, "2026 年");
  assert.equal(year.end - year.start, 365 * DAY);
});

test("inRange 只统计 saved 且落在窗口内的记录", () => {
  const range = rangeOf("week", at(2026, 9, 21, 15));
  const records = [
    rec(at(2026, 9, 21, 10), 1),
    rec(at(2026, 9, 22, 23), 2), // 周二，本周内
    rec(at(2026, 9, 20, 23), 3), // 上周日，上一周
    { ...rec(at(2026, 9, 21, 11), 9), status: "active" },
  ];
  assert.equal(inRange(records, range).length, 2);
});

test("summarize：总数/活跃天数/日均/最佳一天", () => {
  const records = [
    rec(at(2026, 9, 21, 9), 2, 50),
    rec(at(2026, 9, 21, 14), 1),
    rec(at(2026, 9, 19, 10), 4, 100),
  ];
  const s = summarize(records);
  assert.equal(s.count, 7);
  assert.equal(s.seconds, 175 * 60);
  assert.equal(s.activeDays, 2);
  assert.equal(s.avgCount, 3.5);
  assert.equal(s.bestDay.count, 4);
});

test("currentStreak：今天有收获算到今天；今天暂无算到昨天", () => {
  const now = at(2026, 9, 21, 15);
  const records = [
    rec(at(2026, 9, 20, 10), 1),
    rec(at(2026, 9, 19, 10), 1),
    rec(at(2026, 9, 17, 10), 1), // 9/18 断档
  ];
  assert.equal(currentStreak(records, now), 2);
  assert.equal(currentStreak([...records, rec(now - 3600000, 1)], now), 3);
  assert.equal(currentStreak([], now), 0);
});

test("barBuckets：周 7 桶 / 月按天 / 季按周 / 年 12 桶", () => {
  const now = at(2026, 9, 21, 15);
  const week = barBuckets([rec(at(2026, 9, 21, 10), 3)], rangeOf("week", now), now);
  assert.equal(week.length, 7);
  assert.equal(week[0].count, 3);
  assert.equal(week[0].isToday, true);
  const month = barBuckets([], rangeOf("month", now), now);
  assert.equal(month.length, 30); // 九月
  const quarter = barBuckets([], rangeOf("quarter", now), now);
  assert.equal(quarter.length, 14);
  const year = barBuckets([rec(at(2026, 3, 5, 10), 2)], rangeOf("year", now), now);
  assert.equal(year.length, 12);
  assert.equal(year[2].count, 2);
});

test("halfHourMatrix：跨格按时间占比分摊，行=周一..周日", () => {
  const now = at(2026, 9, 21, 15);
  const range = rangeOf("week", now);
  // 周一 10:15–10:40，2 个番茄：10:00 格 15 分钟、10:30 格 10 分钟
  const r = rec(at(2026, 9, 21, 10, 15), 2, 25);
  const { rows } = halfHourMatrix([r], range);
  assert.ok(Math.abs(rows[0][20] - 1.2) < 1e-9);
  assert.ok(Math.abs(rows[0][21] - 0.8) < 1e-9);
  // 窗口外的记录不计入
  const out = halfHourMatrix([rec(at(2026, 8, 1, 10), 3)], range);
  assert.equal(out.max, 0);
});

test("topTasks：按任务名聚合去序号，按番茄数排序截断", () => {
  const records = [
    rec(at(2026, 9, 21, 9), 2),
    { ...rec(at(2026, 9, 21, 10), 1), id: "x1", task: { id: "t", title: "写报告 · 第 2 个番茄", source: "local" } },
    { ...rec(at(2026, 9, 20, 10), 5), id: "x2", task: { id: "u", title: "读论文", source: "local", quadrant: "inu" } },
    { ...rec(at(2026, 9, 19, 10), 0), id: "x3", task: { id: "v", title: "零收获", source: "local" } },
  ];
  const top = topTasks(records);
  assert.equal(top.length, 2);
  assert.equal(top[0].name, "读论文");
  assert.equal(top[0].quadrant, "inu");
  assert.equal(top[1].name, "写报告");
  assert.equal(top[1].count, 3);
});

test("shiftRange：周/月/季/年双向翻页，月界不错档", () => {
  const now = at(2026, 9, 21, 15); // 周一
  const week = rangeOf("week", now);
  const prevWeek = shiftRange(week, -1);
  assert.equal(prevWeek.label, "9.14 – 9.20");
  assert.equal(shiftRange(prevWeek, 1).start, week.start);
  // 从 1 月向前翻 → 上一年 12 月；3 月 31 日所在月向前翻 → 2 月（不跨到 3 月）
  const jan = rangeOf("month", at(2026, 1, 10));
  assert.equal(shiftRange(jan, -1).label, "2025 年 12 月");
  const mar = rangeOf("month", at(2026, 3, 31));
  assert.equal(shiftRange(mar, -1).label, "2026 年 2 月");
  const q3 = rangeOf("quarter", now);
  assert.equal(shiftRange(q3, -1).label, "2026 年 Q2");
  const y = rangeOf("year", now);
  assert.equal(shiftRange(y, 1).label, "2027 年");
  // isCurrentRange：当前区间含 now，翻走后再翻回来仍识别
  assert.equal(isCurrentRange(week, now), true);
  assert.equal(isCurrentRange(prevWeek, now), false);
});
