import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// weekgoal.ts 按打包器惯例写 "./week"，node 需要补扩展名才能解析。
register(new URL("./ts-extension-hook.mjs", import.meta.url));

// Mock localStorage before importing the module under test.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const KEY = "pomatez-focus-weekgoal-v1";
const {
  WEEK_GOAL_DEFAULT,
  weekKeyOf,
  loadWeekGoals,
  weekGoal,
  isValidGoal,
  saveWeekGoal,
  goalMet,
} = await import("../app/renderer/src/focus/weekgoal.ts");

// 2026-09-15 12:00 UTC = 北京 20:00 周二；所在周北京周一 = 2026-09-14
const TUESDAY = Date.UTC(2026, 8, 15, 12, 0, 0);
const WEEK_KEY = "2026-09-14";

test("weekKeyOf normalizes any day in the beijing week to the monday key", () => {
  assert.equal(weekKeyOf(TUESDAY), WEEK_KEY);
  // 周一凌晨北京 00:30（周日 16:30 UTC）仍属于新的一周
  assert.equal(weekKeyOf(Date.UTC(2026, 8, 13, 16, 30, 0)), WEEK_KEY);
  // 北京周日深夜（周日 15:59 UTC 之前一分钟属于上一周的尾巴）
  assert.equal(weekKeyOf(Date.UTC(2026, 8, 13, 15, 59, 0)), "2026-09-07");
});

test("goal defaults to 60 and untouched keys stay untouched", () => {
  store.clear();
  assert.equal(weekGoal(TUESDAY), WEEK_GOAL_DEFAULT);
  assert.equal(WEEK_GOAL_DEFAULT, 60);
  assert.equal(store.has(KEY), false);
  assert.equal(store.has("pomatez-focus-v1"), false);
});

test("saveWeekGoal writes only the current week key and keeps other weeks", () => {
  store.clear();
  store.set(KEY, JSON.stringify({ "2026-09-07": 30 }));
  const goals = saveWeekGoal(TUESDAY, 100);
  assert.equal(goals[WEEK_KEY], 100);
  assert.equal(goals["2026-09-07"], 30);
  const persisted = JSON.parse(store.get(KEY));
  assert.deepEqual(persisted, { "2026-09-07": 30, [WEEK_KEY]: 100 });
  assert.equal(weekGoal(TUESDAY), 100);
  assert.equal(weekGoal(Date.UTC(2026, 8, 8, 12, 0, 0)), 30); // 上周用其覆盖
});

test("corrupt or out-of-range stored content falls back to defaults", () => {
  store.clear();
  store.set(KEY, "not-json{");
  assert.equal(weekGoal(TUESDAY), WEEK_GOAL_DEFAULT);
  store.set(KEY, JSON.stringify([1, 2]));
  assert.deepEqual(loadWeekGoals(), {});
  store.set(
    KEY,
    JSON.stringify({ [WEEK_KEY]: 0, "2026-09-07": 999, "bad-key": 10 })
  );
  assert.deepEqual(loadWeekGoals(), {});
  assert.equal(weekGoal(TUESDAY), WEEK_GOAL_DEFAULT);
});

test("isValidGoal bounds and saveWeekGoal rejection", () => {
  assert.equal(isValidGoal(1), true);
  assert.equal(isValidGoal(350), true);
  assert.equal(isValidGoal(0), false);
  assert.equal(isValidGoal(351), false);
  assert.equal(isValidGoal(2.5), false);
  assert.equal(isValidGoal("60"), false);
  assert.throws(() => saveWeekGoal(TUESDAY, 0));
  assert.throws(() => saveWeekGoal(TUESDAY, 351));
});

test("goalMet requires both harvest and reaching the goal", () => {
  assert.equal(goalMet(0, 60), false);
  assert.equal(goalMet(59, 60), false);
  assert.equal(goalMet(60, 60), true);
  assert.equal(goalMet(61, 60), true);
  assert.equal(goalMet(5, 2), true);
});
