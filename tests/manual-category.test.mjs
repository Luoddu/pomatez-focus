import test from "node:test";
import assert from "node:assert/strict";
import {
  manualRecord,
  manualWindow,
} from "../app/renderer/src/focus/manualRecord.ts";
import {
  recolorSession,
  recordCategory,
} from "../app/renderer/src/focus/classification.js";
import {
  categoryBuckets,
  rangeOf,
  focusDurationTrend,
} from "../app/renderer/src/focus/stats.ts";
import { mergeCloudRecords } from "../app/renderer/src/focus/cloud.ts";
import { EditQueue } from "../app/renderer/src/focus/editQueue.ts";
import {
  saveReviews,
  loadReviews,
} from "../app/renderer/src/focus/reviewCache.ts";
const start = Date.parse("2026-09-25T22:00:00+08:00"),
  now = start + 12 * 3600000;
const initial = {
  id: "one",
  task: { id: "t", title: "Synthetic", source: "local" },
  status: "saved",
  sync: "local",
  startedAt: start,
  endedAt: start + 10 * 3600000,
  plannedSeconds: 1500,
  elapsedSeconds: 9 * 3600,
  acceptedSeconds: 3600,
  completedCount: 2,
  segments: [
    { start, end: start + 1800000 },
    { start: start + 5400000, end: start + 10 * 3600000 },
  ],
};
const edit = (changes) =>
  manualRecord({
    initial,
    id: "new",
    task: initial.task,
    startedAt: start,
    endedAt: initial.endedAt,
    seconds: 3600,
    count: 2,
    now,
    ...changes,
  });
test("edit window exposes pause-aware maximum, seconds precision and legacy bounds", () => {
  const endedAt = start + 3600000;
  assert.equal(
    manualWindow(initial, start, endedAt, 3600).availableSeconds,
    1800
  );
  assert.throws(() => edit({ endedAt }), /30 分 0 秒/);
  const r = edit({ endedAt, seconds: 1800 });
  assert.equal(r.completedCount, 2);
  assert.equal(r.acceptedSeconds, 1800);
  assert.equal(
    manualWindow(initial, start, start + 905000, 3600).availableSeconds,
    905
  );
  assert.equal(
    edit({ endedAt: start + 905000, seconds: 15.08 * 60 })
      .completedCount,
    2
  );
  assert.equal(
    manualWindow(initial, start, initial.endedAt + 3600000, 3600)
      .availableSeconds,
    initial.elapsedSeconds
  );
  assert.equal(
    manualWindow(
      { ...initial, segments: undefined },
      start,
      endedAt,
      3600
    ).availableSeconds,
    3600
  );
});
test("overnight end correction clips active spans, keeps pauses and identity; rejected time cannot fabricate focus", () => {
  const r = edit({ endedAt: start + 2 * 3600000 });
  assert.equal(r.endedAt, start + 7200000);
  assert.equal(r.elapsedSeconds, 3600);
  assert.deepEqual(r.segments, [
    { start, end: start + 1800000 },
    { start: start + 5400000, end: start + 7200000 },
  ]);
  assert.equal(r.id, "one");
  assert.equal(r.completedCount, 2);
  assert.equal(r.acceptedSeconds, 3600);
  assert.throws(() => edit({ endedAt: start + 3600000 }), /超过/);
  assert.throws(() => edit({ endedAt: start - 1 }), /有效/);
  assert.throws(() => edit({ endedAt: now + 120000 }), /有效/);
  assert.deepEqual(edit({ seconds: 1800 }).segments, initial.segments);
  const shifted = edit({
    startedAt: start - 86400000,
    endedAt: initial.endedAt - 86400000,
  });
  assert.equal(shifted.elapsedSeconds, initial.elapsedSeconds);
  assert.equal(
    shifted.segments[1].start,
    initial.segments[1].start - 86400000
  );
});
test("named supplement uses independent interval, no selected task required; impossible durations rejected", () => {
  const r = manualRecord({
    id: "named",
    task: {
      id: "local",
      source: "local",
      title: "模拟临时番茄",
      kind: "free",
    },
    startedAt: start,
    endedAt: start + 1500000,
    seconds: 1500,
    count: 1,
    now,
  });
  assert.equal(r.task.title, "模拟临时番茄");
  assert.equal(r.sync, "local");
  assert.equal(r.endedAt, start + 1500000);
  assert.throws(
    () =>
      manualRecord({
        id: "bad",
        task: r.task,
        startedAt: start,
        endedAt: start + 60000,
        seconds: 1500,
        count: 1,
        now,
      }),
    /超过/
  );
});
test("category override, cross-computer revisions and persistent retry leave frozen task and totals intact", async () => {
  const base = {
    ...initial,
    task: {
      ...initial.task,
      source: "feishu",
      sourceKey: "base",
      projectType: "delivery",
    },
    sync: "synced",
    cloudSynced: true,
  };
  const changed = recolorSession(base, "research");
  assert.equal(recordCategory(changed), "research");
  assert.equal(base.task.projectType, "delivery");
  const merged = mergeCloudRecords([base], [changed], "base")[0];
  assert.equal(merged.acceptedSeconds, base.acceptedSeconds);
  assert.equal(
    mergeCloudRecords([merged], [base], "base")[0].colorOverride,
    "research"
  );
  assert.throws(
    () =>
      mergeCloudRecords(
        [changed],
        [{ ...changed, colorOverride: "misc" }],
        "base"
      ),
    /冲突/
  );
  assert.equal(recordCategory(recolorSession(changed)), "delivery");
  let data;
  const storage = {
    getItem: () => data || null,
    setItem: (_, v) => {
      data = v;
    },
  };
  let q = new EditQueue(storage);
  q.add({
    id: "intent",
    sourceKey: "base",
    kind: "color",
    state: "pending",
    payload: {
      id: "intent",
      sourceKey: "base",
      before: base,
      after: changed,
    },
  });
  q = new EditQueue(storage);
  assert.equal(q.entries[0].kind, "color");
  await q.drain("base", async () => {
    throw Error("offline");
  });
  assert.equal(q.entries[0].state, "failed");
  q.retry("base");
  await q.drain("base", async (item) =>
    assert.equal(item.payload.after.colorRevision, 1)
  );
  assert.equal(q.entries.length, 0);
});
test("stacked harvest conserves counts and durations; category trends use full 7/28 calendar window with zero days", () => {
  const day = new Date(2026, 8, 26, 12).getTime();
  const r = (ago, type, count, seconds) => ({
    ...initial,
    id: String(ago) + type,
    startedAt: day - ago * 86400000,
    task: { ...initial.task, projectType: type },
    completedCount: count,
    acceptedSeconds: seconds,
  });
  const rs = [
    r(35, "misc", 1, 1500),
    r(0, "research", 2, 4200),
    r(0, "delivery", 1, 1500),
    r(0, undefined, 0, 600),
    { ...r(0, "misc", 99, 99), status: "running" },
  ];
  const buckets = categoryBuckets(rs, rangeOf("week", day), day);
  for (const b of buckets) {
    assert.equal(
      b.categories.reduce((s, c) => s + c.count, 0),
      b.count
    );
    assert.equal(
      b.categories.reduce((s, c) => s + c.seconds, 0),
      b.seconds
    );
  }
  const trend = focusDurationTrend(rs, day, "research");
  assert.equal(trend.at(-1).seven, 10);
  assert.equal(trend.at(-1).twentyEight, 3);
  assert.equal(focusDurationTrend(rs, day, "personal").at(-1).seven, 0);
  assert.equal(
    focusDurationTrend(rs, day, "unclassified").at(-1).seven,
    1
  );
  assert.equal(
    focusDurationTrend([rs[1]], day, "research").at(-1).seven,
    null
  );
});
test("review cache isolates sources and rejects malformed summaries without overwriting cache", () => {
  const values = new Map();
  const store = {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
  };
  saveReviews(store, "a", { "2026-09-26": "模拟摘要" });
  assert.deepEqual(loadReviews(store, "b"), {});
  assert.throws(
    () => saveReviews(store, "a", { invalid: "x" }),
    /格式/
  );
  assert.deepEqual(loadReviews(store, "a"), {
    "2026-09-26": "模拟摘要",
  });
});
