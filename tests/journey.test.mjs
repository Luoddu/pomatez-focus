import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newJourney,
  journeyDay,
  journeyKey,
  readJourney,
  writeJourney,
  validateJourney,
  taskRef,
  resolveTask,
  reconcileJourney,
  completion,
  moveSlot,
  resizeStages,
  journeyRoad,
} from "../app/renderer/src/focus/journey.js";
const now = new Date(2026, 9, 8, 12).getTime(),
  day = journeyDay(now);
let seq = 0;
const id = () => `id-${++seq}`;
const plan = () => newJourney("local", day, id);
const record = (count = 1, over = {}) => ({
  id: "session-1",
  status: "saved",
  startedAt: now,
  completedCount: count,
  task: { source: "local", id: "t", title: "研究" },
  ...over,
});
const storage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    m,
  };
};
test("default flexible itinerary 4/3/3/3/3 and local calendar tomorrow", () => {
  const p = plan();
  assert.deepEqual(
    p.stages.map((s) => s.slots.length),
    [4, 3, 3, 3, 3]
  );
  assert.deepEqual(p.stages.at(-1).restActions, ["nap", "night"]);
  assert.equal(
    journeyDay(new Date(2026, 11, 31, 23).getTime(), 1),
    "2027-01-01"
  );
});
test("drag preserves outline identity, task and total; supports intra-stage insertion", () => {
  let p = plan();
  const s = p.stages[0].slots[3];
  s.task = taskRef(record().task);
  p = moveSlot(p, s.id, p.stages[1].id, null);
  assert.deepEqual(
    p.stages.map((s) => s.slots.length),
    [3, 4, 3, 3, 3]
  );
  assert.deepEqual(p.stages[1].slots.at(-1), s);
  p = moveSlot(p, s.id, p.stages[1].id, p.stages[1].slots[0].id);
  assert.equal(p.stages[1].slots[0].id, s.id);
});
test("only actual saved count fills; multiple count units allocated once, duplicate history idempotent", () => {
  const p = plan(),
    r = record(3),
    q = reconcileJourney(p, [r, r], null);
  assert.equal(Object.keys(completion(q, [r])).length, 3);
  assert.deepEqual(reconcileJourney(q, [r], null), q);
  assert.deepEqual(
    q.stages[0].slots.slice(0, 3).map((s) => s.binding.unit),
    [0, 1, 2]
  );
  assert.equal(
    Object.keys(
      completion(
        reconcileJourney(
          p,
          [record(0), record(1, { status: "active" })],
          null
        ),
        [r]
      )
    ).length,
    0
  );
});
test("active reserved but unfilled, completed/active drag rejected; discard and zero count release slot", () => {
  let p = plan(),
    slot = p.stages[0].slots[0];
  slot.binding = { sessionId: "session-1", unit: 0 };
  const active = record(1, { status: "active" });
  let q = reconcileJourney(p, [], active);
  assert.equal(Object.keys(completion(q, [])).length, 0);
  assert.throws(() =>
    moveSlot(q, slot.id, q.stages[1].id, null, [], active)
  );
  q = reconcileJourney(p, [record()], null);
  assert.throws(() =>
    moveSlot(q, slot.id, q.stages[1].id, null, [record()])
  );
  assert.equal(
    reconcileJourney(p, [], null).stages[0].slots[0].binding,
    null
  );
  assert.equal(
    reconcileJourney(p, [record(0)], null).stages[0].slots[0].binding,
    null
  );
});
test("wrong source/day and unconfirmed never fill; legitimate same-source still works", () => {
  const p = plan(),
    wrong = [
      record(1, { startedAt: now - 86400000 }),
      record(1, { task: { source: "feishu", sourceKey: "table1" } }),
      record(1, { status: "review" }),
    ];
  assert.equal(
    Object.keys(completion(reconcileJourney(p, wrong, null), wrong))
      .length,
    0
  );
  const f = { ...p, scope: "table1" },
    r = record(2, { task: { source: "feishu", sourceKey: "table1" } });
  assert.equal(
    Object.keys(completion(reconcileJourney(f, [r], null), [r])).length,
    2
  );
  assert.equal(
    Object.keys(
      completion(
        reconcileJourney({ ...f, scope: "table2" }, [r], null),
        [r]
      )
    ).length,
    0
  );
});
test("count correction releases invalid unit; records removed do not remain filled", () => {
  let p = reconcileJourney(plan(), [record(3)], null);
  p = reconcileJourney(p, [record(1)], null);
  assert.equal(Object.keys(completion(p, [record(1)])).length, 1);
  assert.equal(p.stages[0].slots[1].binding, null);
  assert.equal(
    Object.keys(completion(reconcileJourney(p, [], null), [])).length,
    0
  );
});
test("source-scoped tomorrow restart roundtrip; transient day planId is not stored", () => {
  const s = storage(),
    p = plan();
  p.day = journeyDay(now, 1);
  p.stages[0].slots[0].task = taskRef({
    id: "row-today",
    planId: "plan-today",
    taskId: "stable",
    sourceKey: "table",
    title: "实验 · 第1个番茄",
    source: "feishu",
  });
  writeJourney(s, p);
  assert.deepEqual(readJourney(s, "local", p.day), p);
  assert.ok(
    !s.getItem(journeyKey("local", p.day)).includes("plan-today")
  );
  assert.equal(readJourney(s, "local", day).day, day);
});
test("next-day stable task resolves current available row, wrong source/missing/completed rejects", () => {
  const r = taskRef({
      id: "old",
      planId: "old-plan",
      taskId: "stable",
      sourceKey: "table",
      title: "研究",
      source: "feishu",
    }),
    t = {
      id: "new",
      planId: "new-plan",
      taskId: "stable",
      sourceKey: "table",
      source: "feishu",
      title: "研究",
    };
  assert.equal(
    resolveTask(r, [{ ...t, kind: "done" }, t], "table").planId,
    "new-plan"
  );
  assert.equal(resolveTask(r, [t], "other"), null);
  assert.equal(resolveTask(r, [], "table"), null);
  assert.equal(resolveTask(null, [t], "table"), null);
  assert.throws(() => taskRef({ ...t, taskId: undefined }));
});
test("resize/reorder removes uncompleted only; protected slots and total budget enforced", () => {
  let p = reconcileJourney(plan(), [record(2)], null);
  const first = p.stages[0];
  const rows = p.stages.map((s) => ({
    id: s.id,
    count: s.slots.length,
    rest: s.rest,
  }));
  rows[0].count = 2;
  let q = resizeStages(p, rows, [record(2)], null, id);
  assert.equal(Object.keys(completion(q, [record(2)])).length, 2);
  rows[0].count = 1;
  assert.throws(() => resizeStages(p, rows, [record(2)], null, id));
  assert.throws(() =>
    resizeStages(p, rows.slice(1), [record(2)], null, id)
  );
  assert.throws(() =>
    resizeStages(p, [{ count: 101, rest: "睡觉" }], [], null, id)
  );
  assert.throws(() =>
    resizeStages(p, [{ count: 2.5, rest: "睡觉" }], [], null, id)
  );
  const swapped = [rows[1], { ...rows[0], count: 4 }, ...rows.slice(2)];
  q = resizeStages(p, swapped, [record(2)], null, id);
  assert.equal(q.stages[1].id, first.id);
});
test("rest nodes editable and manually persisted, no clock schedule", () => {
  const p = plan();
  p.resting = p.stages[1].id;
  p.passed = [p.stages[0].id];
  const s = storage();
  writeJourney(s, p);
  assert.equal(readJourney(s, "local", day).resting, p.resting);
  const q = resizeStages(
    p,
    [{ id: p.stages[0].id, count: 0, rest: "吃饭" }],
    [],
    null,
    id
  );
  assert.equal(q.resting, null);
  assert.equal(q.stages[0].slots.length, 0);
});
test("bad storage preserved; bounds/duplicates reject; valid storage stays writable after failure", () => {
  const s = storage(),
    k = journeyKey("local", day);
  s.setItem(k, "{bad");
  assert.throws(() => readJourney(s, "local", day));
  assert.equal(s.getItem(k), "{bad");
  const p = plan();
  p.stages[1].slots[0].id = p.stages[0].slots[0].id;
  assert.throws(() => validateJourney(p, "local", day));
  assert.throws(
    () =>
      writeJourney(
        {
          setItem: () => {
            throw Error("quota");
          },
        },
        plan()
      ),
    /quota/
  );
  writeJourney(s, plan());
  assert.equal(readJourney(s, "local", day).stages.length, 5);
});
test("road is 100 tomatoes with independent 25-unit flags", () => {
  assert.deepEqual(journeyRoad(282), { reached: 200, next: 300 });
  assert.deepEqual(journeyRoad(300), { reached: 300, next: 400 });
  assert.deepEqual(journeyRoad(1000), { reached: 1000, next: 1100 });
});
