import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceSession,
  confirmSession,
  timeParts,
  restoreSession,
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
