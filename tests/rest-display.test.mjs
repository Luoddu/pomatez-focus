import { test } from "node:test";
import assert from "node:assert/strict";
import {
  durationText,
  displayUsage,
  monitorDetail,
} from "../app/renderer/src/focus/restDisplay.js";
const now = new Date(2026, 9, 8, 12).getTime();
function fixture() {
  return {
    status: "recording",
    message: "具体检测原因",
    updatedAt: now,
    usage: {
      day: "2026-10-08",
      start: now - 43200000,
      end: now,
      totalSeconds: 100,
      bilibili: 80,
      xiaohongshu: 20,
    },
    live: {
      checkedAt: now,
      startedAt: now - 10000,
      expiresAt: now + 7000,
      site: "bilibili",
      estimateFrom: now - 1000,
      detail: "Edge扩展：正常 · 窗口：Edge前台",
    },
  };
}
test("second display rolls units, floors fractional source seconds and handles zero", () => {
  assert.equal(durationText(0), "0小时 0分钟 0秒");
  assert.equal(durationText(3661.9), "1小时 1分钟 1秒");
  assert.equal(durationText(59.99), "0小时 0分钟 59秒");
  assert.equal(durationText(-1), "0小时 0分钟 0秒");
});
test("short live projection advances only detected site, with no mutation of authoritative usage", () => {
  const s = fixture(),
    before = structuredClone(s),
    a = displayUsage(s, now),
    b = displayUsage(s, now + 1000);
  assert.equal(a.bilibili, 81);
  assert.equal(b.bilibili, 82);
  assert.equal(b.xiaohongshu, 20);
  assert.equal(b.totalSeconds, 102);
  assert.deepEqual(s, before);
  s.live.site = "xiaohongshu";
  assert.equal(displayUsage(s, now).xiaohongshu, 21);
  assert.equal(displayUsage(s, now).bilibili, 80);
});
test("interrupted, paused, non-target, stale, backward clock and new local day never invent seconds", () => {
  for (const mutate of [
    (s) => (s.status = "interrupted"),
    (s) => (s.live = null),
    (s) => (s.live.site = null),
    (s) => (s.live.expiresAt = now - 1),
    (s) => (s.live.checkedAt = now + 1),
    (s) => (s.usage.day = "2026-10-07"),
    (s) => (s.live.expiresAt = now + 9000),
  ]) {
    const s = fixture();
    mutate(s);
    assert.equal(displayUsage(s, now), s.usage);
  }
  assert.equal(displayUsage(fixture(), now + 7001).totalSeconds, 100);
});
test("hover explains exact failure, last sample, advancing monitor duration and bounded estimate", () => {
  const s = fixture();
  const text = monitorDetail(s, now + 1000);
  assert.ok(text.includes("具体检测原因"));
  assert.ok(text.includes("监测运行 0小时 0分钟 11秒"));
  assert.ok(text.includes("当前：B站"));
  assert.ok(text.includes("心跳间隔内估算"));
  assert.ok(monitorDetail(s, now + 8000).includes("暂停实时估算"));
  s.status = "interrupted";
  assert.ok(!monitorDetail(s, now + 1000).includes("监测运行"));
});
