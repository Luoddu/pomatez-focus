import test from "node:test";
import assert from "node:assert/strict";
import {
  manualRecord,
  manualWindow,
  manualPeriodDefaults,
  adjustedManualMinutes,
} from "../app/renderer/src/focus/manualRecord.ts";
test("endpoint duration recovers from intermediate typing, adds five minutes and deducts actual pauses without changing count",()=>{
 const start=Date.parse('2026-10-12T08:58:08+08:00'),end=Date.parse('2026-10-12T09:23:15+08:00'),initial={startedAt:start,endedAt:end,elapsedSeconds:1507,acceptedSeconds:1507,completedCount:1,segments:[{start,end}]},anchor={seconds:1507,available:1507};
 assert.ok(adjustedManualMinutes(initial,start,start+247000,anchor)<4.12);
 assert.ok(Math.abs(adjustedManualMinutes(initial,start,end+300000,anchor)*60-1807)<0.0001);
 const paused={...initial,elapsedSeconds:1207,acceptedSeconds:1207,segments:[{start,end:start+600000},{start:start+900000,end}]};
 assert.ok(Math.abs(adjustedManualMinutes(paused,start,end+300000,{seconds:1207,available:1207})*60-1507)<0.0001);
 assert.equal(initial.completedCount,1);
});
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
test("period defaults floor 140 minutes to five tomatoes and reject invalid spans", () => {
  const at = Date.parse("2026-10-10T08:20:28+08:00");
  assert.deepEqual(manualPeriodDefaults(at, at + 140 * 60000), { minutes: 140, count: 5 });
  assert.deepEqual(manualPeriodDefaults(at, at + 24 * 60000), { minutes: 24, count: 0 });
  assert.deepEqual(manualPeriodDefaults(at, at + 1500123), { minutes: 25, count: 1 });
  assert.equal(manualPeriodDefaults(NaN, at), null);
  assert.equal(manualPeriodDefaults(at, at - 1), null);
});
import {
  saveReviews,
  loadReviews,
  reviewTheme,
} from "../app/renderer/src/focus/reviewCache.ts";
test("history theme excludes review headings and progress while keeping source untouched", () => {
  const raw =
    "当日主题：设备维护与临时协调，晚间推进测试大纲。\n代表进展：模拟不应展示内容\n下一步：继续";
  assert.equal(
    reviewTheme(raw),
    "设备维护与临时协调，晚间推进测试大纲。"
  );
  assert.equal(
    reviewTheme(
      "**当日主题：**科研整理\n继续完成图示\n**代表进展：**正文"
    ),
    "科研整理 继续完成图示"
  );
  assert.equal(reviewTheme("当日主题: 科研 代表进展：正文"), "科研");
  assert.equal(reviewTheme("只有旧复盘正文，没有主题"), "");
  assert.equal(reviewTheme(), "");
  assert.ok(raw.includes("代表进展"));
});
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
    initial.elapsedSeconds + 3600
  );
  assert.equal(
    manualWindow(
      { ...initial, segments: undefined },
      start,
      endedAt,
      3600
    ).availableSeconds,
    0
  );
});
test("manual extension adds ten minutes, keeps explicit pause clock positions and independent count",()=>{
  const small={...initial,endedAt:start+1800000,elapsedSeconds:1500,acceptedSeconds:1500,completedCount:1,segments:[{start,end:start+600000},{start:start+900000,end:start+1800000}]};
  const r=manualRecord({initial:small,id:'unused',task:small.task,startedAt:start,endedAt:start+2400000,seconds:2100,count:1,now});
  assert.equal(r.acceptedSeconds,2100);assert.equal(r.elapsedSeconds,2100);assert.equal(r.completedCount,1);assert.equal(r.id,small.id);
  assert.deepEqual(r.segments,[{start,end:start+600000},{start:start+900000,end:start+2400000}]);
  assert.equal(manualWindow(small,start+300000,start+2400000,2400).availableSeconds,1800);
  assert.throws(()=>manualRecord({initial:small,id:'unused',task:small.task,startedAt:start,endedAt:start+2400000,seconds:2400,count:1,now}),/超过/);
  const legacy={...small,segments:undefined};
  assert.equal(manualWindow(legacy,start,start+2400000,2100).availableSeconds,2100);
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
