import { test } from "node:test";
import assert from "node:assert/strict";
import { CHIP_WINDOW, chipWindow } from "../app/renderer/src/focus/chipWindow.ts";

test("CHIP_WINDOW is 6", () => {
  assert.equal(CHIP_WINDOW, 6);
});

test("small lists render fully with no hidden chips", () => {
  assert.deepEqual(chipWindow(0, -1), { start: 0, end: 0 });
  assert.deepEqual(chipWindow(3, -1), { start: 0, end: 3 });
  assert.deepEqual(chipWindow(6, -1), { start: 0, end: 6 });
});

test("window semantics: always the next six pending pomodoros", () => {
  assert.deepEqual(chipWindow(8, -1), { start: 0, end: 6 });
  // 收掉前面的番茄后 rows 变短，后续序号自然顶入窗口
  assert.deepEqual(chipWindow(5, -1), { start: 0, end: 5 });
});

test("selected chip beyond the window slides the window to include it", () => {
  assert.deepEqual(chipWindow(10, 6), { start: 1, end: 7 });
  assert.deepEqual(chipWindow(10, 9), { start: 4, end: 10 });
  // 选中最后一个时窗口到尾，不越界
  assert.deepEqual(chipWindow(8, 7), { start: 2, end: 8 });
});

test("selection inside the first six never slides", () => {
  assert.deepEqual(chipWindow(10, 0), { start: 0, end: 6 });
  assert.deepEqual(chipWindow(10, 5), { start: 0, end: 6 });
});

test("window never exceeds total and never negative", () => {
  const w = chipWindow(7, 6);
  assert.equal(w.end - w.start, 6);
  assert.ok(w.start >= 0 && w.end <= 7);
});
