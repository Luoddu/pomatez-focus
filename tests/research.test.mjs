import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register(new URL("./ts-extension-hook.mjs", import.meta.url));
const {
  researchWeeks,
  researchGoal,
  saveResearchGoal,
  loadResearchGoals,
  researchFirst,
} = await import("../app/renderer/src/focus/research.ts");
const { weekGoal, saveWeekGoal } = await import(
  "../app/renderer/src/focus/weekgoal.ts"
);
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k),
  setItem: (k, v) => store.set(k, v),
};
const monday = Date.parse("2026-09-21T00:00:00+08:00"),
  day = 86400000;
const rec = (startedAt, overrides = {}) => ({
  status: "saved",
  startedAt,
  completedCount: 2,
  acceptedSeconds: 3600,
  task: { projectType: "research" },
  ...overrides,
});

test("research respects saved status, corrected classification and Beijing week boundaries", () => {
  const records = [
    rec(monday - 1),
    rec(monday),
    rec(monday + day),
    rec(monday + 2 * day, { colorOverride: "personal" }),
    rec(monday + 2 * day, {
      task: { projectType: "personal" },
      colorOverride: "research",
    }),
    rec(monday + day, { status: "paused" }),
    rec(monday + 6 * day),
  ];
  const weeks = researchWeeks(records, monday + 3 * day, 2);
  assert.equal(weeks[0].count, 2);
  assert.equal(weeks[1].count, 6);
  assert.equal(weeks[1].days, 3);
  assert.equal(weeks[1].seconds, 10800);
});
test("research active days are unique; partial zero-tomato focus still counts as time", () => {
  const w = researchWeeks(
    [
      rec(monday),
      rec(monday + 1000),
      rec(monday + day, { completedCount: 0, acceptedSeconds: 600 }),
    ],
    monday + 2 * day,
    1
  )[0];
  assert.equal(w.count, 4);
  assert.equal(w.days, 2);
  assert.equal(w.seconds, 7800);
});
test("missing weeks stay distinct from recorded weeks without research", () => {
  const w = researchWeeks(
    [rec(monday, { task: { projectType: "personal" } })],
    monday + day,
    2
  );
  assert.equal(w[0].hasRecords, false);
  assert.equal(w[1].hasRecords, true);
  assert.equal(w[1].count, 0);
  assert.equal(w[1].days, 0);
});
test("research goal defaults to 40, only overrides one week, preserves overall goal", () => {
  store.clear();
  saveWeekGoal(monday, 70);
  assert.equal(researchGoal(monday), 40);
  saveResearchGoal(monday - day, 25);
  saveResearchGoal(monday, 45);
  assert.equal(researchGoal(monday), 45);
  assert.equal(researchGoal(monday - day), 25);
  assert.equal(researchGoal(monday + 7 * day), 40);
  assert.equal(weekGoal(monday), 70);
  assert.throws(() => saveResearchGoal(monday, 0));
  assert.throws(() => saveResearchGoal(monday, 4.5));
  store.set("pomatez-focus-research-weekgoal-v1", "broken");
  assert.deepEqual(loadResearchGoals(), {});
  assert.equal(researchGoal(monday), 40);
});
test("research stable priority preserves identities and relative order, never mutates input", () => {
  const group = (key, research = false) => ({
    key,
    tasks: [{ projectType: research ? "research" : "personal" }],
  });
  const groups = [
    group("a"),
    group("b", true),
    group("c"),
    group("d", true),
  ];
  assert.deepEqual(
    researchFirst(groups).map((g) => g.key),
    ["b", "d", "a", "c"]
  );
  assert.deepEqual(
    groups.map((g) => g.key),
    ["a", "b", "c", "d"]
  );
});
