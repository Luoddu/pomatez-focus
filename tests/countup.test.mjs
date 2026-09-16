import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// weekgoal.ts 按打包器惯例写 "./week"，node 需要补扩展名才能解析。
register(new URL("./ts-extension-hook.mjs", import.meta.url));

const {
  COUNT_UP_MS,
  easeOutCubic,
  countUpValue,
  countUpDuration,
} = await import("../app/renderer/src/focus/countup.ts");
const { goalProgressRatio, goalFill } = await import(
  "../app/renderer/src/focus/weekgoal.ts"
);

test("easeOutCubic is clamped, endpoint-exact and monotonic", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(-0.5), 0);
  assert.equal(easeOutCubic(1.5), 1);
  let prev = 0;
  for (let t = 0.05; t <= 1; t += 0.05) {
    const v = easeOutCubic(t);
    assert.ok(v > prev, `not monotonic at ${t}`);
    prev = v;
  }
});

test("countUpValue tweens 0→N and N→M with integer steps", () => {
  assert.equal(countUpValue(0, 10, 0), 0);
  assert.equal(countUpValue(0, 10, 1), 10);
  assert.equal(countUpValue(0, 10, 0.5), 9); // ease-out 前半程已过 87.5%
  assert.equal(countUpValue(10, 3, 1), 3);
  assert.equal(countUpValue(10, 3, 0), 10);
  assert.equal(countUpValue(2, 3, 99), 3); // 越界收敛
});

test("reduced motion collapses the duration to an instant jump", () => {
  assert.equal(countUpDuration(true), 0);
  assert.equal(countUpDuration(false), COUNT_UP_MS);
  assert.equal(countUpDuration(false, 300), 300);
  assert.ok(COUNT_UP_MS >= 400 && COUNT_UP_MS <= 600);
});

test("goal progress ratio is clamped and zero-safe", () => {
  assert.equal(goalProgressRatio(0, 60), 0);
  assert.equal(goalProgressRatio(30, 60), 0.5);
  assert.equal(goalProgressRatio(90, 60), 1);
  assert.equal(goalProgressRatio(5, 0), 0);
  assert.equal(goalProgressRatio(5, Number.NaN), 0);
  assert.equal(goalProgressRatio(-3, 60), 0);
});

test("goal fill deepens from pale tomato to full red with the ratio", () => {
  const alphaOf = (s) => Number(s.match(/([\d.]+)\)$/)[1]);
  assert.equal(goalFill(0), "rgba(194, 47, 31, 0.1)");
  assert.equal(goalFill(1), "rgba(194, 47, 31, 0.4)");
  assert.ok(alphaOf(goalFill(0.8)) > alphaOf(goalFill(0.2)));
  assert.equal(goalFill(-1), goalFill(0));
  assert.equal(goalFill(7), goalFill(1));
});
