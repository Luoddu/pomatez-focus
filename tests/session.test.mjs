import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceSession,
  confirmSession,
  timeParts,
  restoreSession,
  returnFromReview,
  upsertRecord,
} from "../app/renderer/src/focus/session.ts";

const sample = () => ({
  id: "synthetic-session",
  task: { id: "demo", title: "演示任务", source: "feishu" },
  startedAt: 1000,
  plannedSeconds: 1500,
  elapsedSeconds: 0,
  status: "active",
  sync: "local",
});
test("active spans exclude pauses and restart gaps; confirmed count is honored", () => {
  let s = {
    ...sample(),
    syncTarget: "plan",
    segments: [],
    segmentOpen: false,
  };
  s = advanceSession(s, 720, 721000);
  s = { ...s, status: "paused" };
  s = advanceSession(s, 300, 1021000);
  s = advanceSession(
    { ...s, status: "active", segmentOpen: false },
    780,
    1801000
  );
  assert.deepEqual(s.segments, [
    { start: 1000, end: 721000 },
    { start: 1021000, end: 1801000 },
  ]);
  // 番茄数以 review 屏用户确认值为准；原表行勾选由 mergePlan 分钟台账独立推导
  assert.equal(
    confirmSession({ ...s, status: "review" }, 1500, 2).completedCount,
    2
  );
  assert.equal(
    confirmSession(
      {
        ...s,
        status: "review",
        task: { ...s.task, creditedSeconds: 720 },
      },
      780,
      1
    ).completedCount,
    1
  );
  const restored = restoreSession(s);
  const continued = advanceSession(
    { ...restored, status: "active" },
    1,
    5001000
  );
  assert.deepEqual(continued.segments[2], {
    start: 5000000,
    end: 5001000,
  });
  assert.equal(
    confirmSession(
      {
        ...s,
        status: "review",
        task: { ...s.task, creditedSeconds: 1500 },
      },
      1500,
      0
    ).completedCount,
    0
  );
});
test("time-up retains overtime without completing a task", () => {
  const s = advanceSession(sample(), 1980);
  assert.deepEqual(timeParts(s), {
    remaining: 0,
    base: 1500,
    overtime: 480,
  });
  assert.equal(s.completedCount, undefined);
  assert.equal(s.acceptedSeconds, undefined);
  assert.equal(s.status, "active");
});
test("paused time is excluded and a resumed task continues", () => {
  const s = { ...advanceSession(sample(), 720), status: "paused" };
  assert.equal(advanceSession(s, 300).elapsedSeconds, 720);
  assert.equal(
    advanceSession({ ...s, status: "active" }, 60).elapsedSeconds,
    780
  );
});
test("accept all, discard overtime, and accept part are distinct", () => {
  const s = {
    ...advanceSession(sample(), 1980),
    status: "review",
    endedAt: 1981000,
  };
  for (const accepted of [1980, 1500, 1680]) {
    const saved = confirmSession(s, accepted, 1);
    assert.equal(saved.acceptedSeconds, accepted);
    assert.equal(saved.elapsedSeconds, 1980);
    assert.equal(saved.sync, "pending");
  }
});
test("early ending records 12 minutes with zero completed pomodoros", () => {
  const saved = confirmSession(
    { ...advanceSession(sample(), 720), status: "review" },
    720,
    0
  );
  assert.equal(saved.acceptedSeconds, 720);
  assert.equal(saved.completedCount, 0);
});
test("restart preserves elapsed time and excludes offline gap", () => {
  const restored = restoreSession(advanceSession(sample(), 721));
  assert.equal(restored.status, "paused");
  assert.equal(restored.elapsedSeconds, 721);
  assert.equal(advanceSession(restored, 86400).elapsedSeconds, 721);
  assert.equal(
    advanceSession({ ...restored, status: "active" }, 1).elapsedSeconds,
    722
  );
});
test("invalid duration and duplicate finalization fail while valid finalization succeeds", () => {
  const s = { ...advanceSession(sample(), 100), status: "review" };
  for (const duration of [-1, 101, NaN, Infinity])
    assert.throws(() => confirmSession(s, duration, 0));
  assert.throws(() => confirmSession(s, 100, 0.5));
  const saved = confirmSession(s, 100, 0);
  assert.throws(() => confirmSession(saved, 100, 0));
  assert.equal(upsertRecord([saved], saved).length, 1);
});

test("return from review restores paused timing without double counting", () => {
  let s = { ...sample(), syncTarget: "plan", segments: [], segmentOpen: false };
  s = advanceSession(s, 720, 721000); // 计时 12 分钟
  s = { ...s, status: "review", endedAt: 721000 }; // 误点结束
  const back = returnFromReview(s);
  assert.equal(back.status, "paused");
  assert.equal(back.elapsedSeconds, 720);
  assert.equal(back.endedAt, undefined);
  assert.equal(back.segmentOpen, false);
  // 暂停中不计时
  assert.equal(advanceSession(back, 300, 1021000).elapsedSeconds, 720);
  // 继续后只累计新增段，暂停历史保留
  const resumed = advanceSession(
    { ...back, status: "active" },
    780,
    1801000
  );
  assert.equal(resumed.elapsedSeconds, 1500);
  assert.deepEqual(resumed.segments, [
    { start: 1000, end: 721000 },
    { start: 1021000, end: 1801000 },
  ]);
  // 再结束仍走原确认流程；分钟数不重复累计
  const saved = confirmSession(
    { ...resumed, status: "review", endedAt: 1801000 },
    1500,
    1
  );
  assert.equal(saved.elapsedSeconds, 1500);
  assert.equal(saved.acceptedSeconds, 1500);
  // 非 review 状态原样返回，不产生状态跃迁
  assert.equal(returnFromReview(null), null);
  assert.equal(returnFromReview(resumed), resumed);
});
test("return from review keeps overtime; overtime confirm flow unchanged", () => {
  // 超时后误点结束：返回继续计时，额外时间保留并可继续累计
  let s = { ...advanceSession(sample(), 1980), status: "review", endedAt: 1981000 };
  const back = returnFromReview(s);
  assert.deepEqual(timeParts(back), { remaining: 0, base: 1500, overtime: 480 });
  const more = advanceSession({ ...back, status: "active" }, 120, 2101000);
  assert.equal(more.elapsedSeconds, 2100);
  const saved = confirmSession(
    { ...more, status: "review", endedAt: 2101000 },
    2100,
    1
  );
  assert.equal(saved.acceptedSeconds, 2100);
  assert.equal(saved.completedCount, 1);
});
