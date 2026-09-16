import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TASK_SNAPSHOT_KEY,
  taskDay,
  readTaskSnapshot,
  writeTaskSnapshot,
} from "../app/renderer/src/focus/taskSnapshot.ts";
const storage = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
};
const now = new Date(2026, 8, 16, 10).getTime();
const rows = [
  {
    id: "p1",
    planId: "p1",
    title: "Synthetic task",
    source: "feishu",
    sourceKey: "A",
    quadrant: "iu",
    doneToday: 1,
    plannedToday: 2,
    creditedSeconds: 60,
    appliedSessionIds: ["one"],
  },
];
test("same day/source restores all useful task fields, omits unknown properties", () => {
  const s = storage();
  assert.equal(
    writeTaskSnapshot(
      s,
      "A",
      [{ ...rows[0], extra: "not persisted" }],
      now
    ),
    true
  );
  assert.deepEqual(readTaskSnapshot(s, "A", now), rows);
  assert.equal(
    s.getItem(TASK_SNAPSHOT_KEY).includes("not persisted"),
    false
  );
});
test("different day/source cannot use snapshot, including midnight", () => {
  const s = storage();
  writeTaskSnapshot(s, "A", rows, now);
  assert.equal(readTaskSnapshot(s, "B", now), null);
  assert.equal(
    readTaskSnapshot(s, "A", new Date(2026, 8, 17).getTime()),
    null
  );
  assert.notEqual(taskDay(now), taskDay(now + 86400000));
});
test("empty authoritative result replaces prior tasks", () => {
  const s = storage();
  writeTaskSnapshot(s, "A", rows, now);
  writeTaskSnapshot(s, "A", [], now);
  assert.deepEqual(readTaskSnapshot(s, "A", now), []);
});
test("malformed, optimistic, wrong-source and duplicate tasks never restore", () => {
  const s = storage();
  for (const invalid of [
    "{",
    "{}",
    JSON.stringify({
      version: 1,
      sourceKey: "A",
      day: taskDay(now),
      rows: [{ ...rows[0], sourceKey: "B" }],
    }),
  ]) {
    s.setItem(TASK_SNAPSHOT_KEY, invalid);
    assert.equal(readTaskSnapshot(s, "A", now), null);
  }
  for (const bad of [
    [{ ...rows[0], kind: "pending" }],
    [rows[0], rows[0]],
    [{ ...rows[0], creditedSeconds: -1 }],
  ])
    assert.equal(writeTaskSnapshot(s, "A", bad, now), false);
});
test("unavailable cache storage is disposable, not a timer failure", () => {
  const s = {
    getItem() {
      throw Error("unavailable");
    },
    setItem() {
      throw Error("quota");
    },
  };
  assert.equal(readTaskSnapshot(s, "A", now), null);
  assert.equal(writeTaskSnapshot(s, "A", rows, now), false);
});
