import { test } from "node:test";
import assert from "node:assert/strict";

const {
  shouldGenerateSilently,
  silentGenerateNotice,
} = await import("../app/renderer/src/focus/silentgen.ts");

test("first generation of the day stays in the foreground with progress", () => {
  assert.equal(shouldGenerateSilently(null), false); // 尚未加载完成
  assert.equal(shouldGenerateSilently(0), false); // 今日计划为空 = 首次
});

test("re-generating with an existing today plan switches to silent", () => {
  assert.equal(shouldGenerateSilently(1), true);
  assert.equal(shouldGenerateSilently(12), true);
});

test("silent merge notifies only when new pomodoros were merged", () => {
  assert.equal(silentGenerateNotice({ created: 3 }), "今日番茄已更新。");
  assert.equal(silentGenerateNotice({ created: 1 }), "今日番茄已更新。");
});

test("silent run without changes never disturbs", () => {
  assert.equal(silentGenerateNotice({ created: 0 }), null);
  assert.equal(silentGenerateNotice({}), null);
  assert.equal(silentGenerateNotice({ created: 0, excess: 2 }), null);
});
