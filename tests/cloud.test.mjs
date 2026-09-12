import test from "node:test";
import assert from "node:assert/strict";
import { mergeCloudRecords } from "../app/renderer/src/focus/cloud.ts";
const r = (id, count = 3) => ({
  id,
  task: {
    id: "p1",
    title: "Synthetic",
    source: "feishu",
    sourceKey: "base",
  },
  startedAt: 1,
  endedAt: 100,
  elapsedSeconds: 90,
  acceptedSeconds: 90,
  plannedSeconds: 1500,
  completedCount: count,
  status: "saved",
  sync: "synced",
  cloudSynced: true,
});
test("merge deduplicates exact records, retains local/other-Base data, and has stable totals", () => {
  const local = [
    r("a"),
    {
      ...r("private"),
      task: { ...r("x").task, sourceKey: "elsewhere" },
    },
  ];
  const first = mergeCloudRecords(local, [r("a"), r("b", 2)], "base");
  assert.equal(first.length, 3);
  assert.deepEqual(
    mergeCloudRecords(first, [r("a"), r("b", 2)], "base"),
    first
  );
  assert.equal(
    first.reduce((n, r) => n + r.completedCount, 0),
    8
  );
});
test("conflicting counts and foreign/duplicate responses reject atomically", () => {
  const local = [r("a")],
    copy = structuredClone(local);
  assert.throws(
    () => mergeCloudRecords(local, [r("b"), r("a", 2)], "base"),
    /内容不同/
  );
  assert.deepEqual(local, copy);
  assert.throws(
    () => mergeCloudRecords(local, [r("b"), r("b")], "base"),
    /不完整或重复/
  );
  assert.throws(
    () => mergeCloudRecords(local, [r("b")], "other"),
    /不完整或重复/
  );
});
