import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultJourneyTemplate,
  validateTemplate,
  readTemplateLibrary,
  writeTemplateLibrary,
  templateLibraryKey,
  readJourney,
  newJourney,
  journeyDay,
  writeJourney,
  templateFromJourney,
  applyJourneyTemplate,
  reconcileJourney,
  completion,
  gymRestTarget,
  validateJourney,
  taskRef,
} from "../app/renderer/src/focus/journey.js";
const day = journeyDay(),
  store = () => {
    const m = new Map();
    return {
      m,
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => m.set(k, v),
    };
  };
const clone = (v) => structuredClone(v);
const record = {
  id: "saved",
  status: "saved",
  completedCount: 3,
  startedAt: Date.now(),
  task: { id: "task", source: "local", title: "实验" },
};
test("default has 16 outlines, reference hours and exact ordered rest sequence", () => {
  const t = defaultJourneyTemplate();
  assert.deepEqual(
    t.stages.map((s) => s.count),
    [4, 3, 3, 3, 3]
  );
  assert.deepEqual(
    t.stages.map((s) => s.time),
    [8, 12, null, 20, null]
  );
  assert.equal(t.endHour, 24);
  assert.deepEqual(
    t.stages.map((s) => s.restActions),
    [
      ["meal", "nap"],
      ["nap"],
      ["nap", "gym", "meal", "nap"],
      ["nap"],
      ["nap", "night"],
    ]
  );
  const blank = clone(t);
  blank.endHour = null;
  blank.stages.forEach((s) => (s.time = null));
  assert.doesNotThrow(() => validateTemplate(blank));
  for (const mutate of [
    (t) => (t.stages[1].time = 7),
    (t) => (t.stages[0].time = 25),
    (t) => (t.stages[0].count = 1.5),
    (t) => (t.stages[0].restActions = ["unknown"]),
    (t) => (t.endHour = 10),
  ]) {
    const b = clone(t);
    mutate(b);
    assert.throws(() => validateTemplate(b));
  }
});
test("default persists in scoped library, future new day uses it, old day and other source unchanged", () => {
  const s = store(),
    old = readJourney(s, "local", day);
  writeJourney(s, old);
  const lib = readTemplateLibrary(s, "local");
  const t = {
    ...defaultJourneyTemplate(),
    id: "short",
    name: "短程",
    stages: [{ count: 2, time: 8, restActions: ["gym", "nap"] }],
  };
  writeTemplateLibrary(s, {
    ...lib,
    defaultId: t.id,
    templates: [...lib.templates, t],
  });
  assert.equal(readTemplateLibrary(s, "local").defaultId, "short");
  assert.equal(
    readJourney(s, "local", journeyDay(Date.now(), 1)).stages[0].slots
      .length,
    2
  );
  assert.deepEqual(readJourney(s, "local", day), old);
  assert.equal(readJourney(s, "other", day).stages.length, 5);
});
test("bad JSON, wrong source, duplicate IDs, missing default and oversized library rejected without reset; write failure preserves saved library", () => {
  const s = store(),
    key = templateLibraryKey("local");
  s.setItem(key, "{bad");
  assert.throws(() => readTemplateLibrary(s, "local"));
  assert.equal(s.getItem(key), "{bad");
  const lib = readTemplateLibrary(store(), "local");
  s.setItem(key, JSON.stringify({ ...lib, scope: "other" }));
  assert.throws(() => readTemplateLibrary(s, "local"));
  for (const b of [
    { ...lib, defaultId: "none" },
    { ...lib, templates: [...lib.templates, ...lib.templates] },
    {
      ...lib,
      templates: Array.from({ length: 13 }, (_, i) => ({
        ...lib.templates[0],
        id: String(i),
      })),
    },
  ])
    assert.throws(() => writeTemplateLibrary(s, b));
  writeTemplateLibrary(s, lib);
  const before = s.getItem(key);
  assert.throws(
    () =>
      writeTemplateLibrary(
        {
          ...s,
          setItem: () => {
            throw Error("quota");
          },
        },
        lib
      ),
    /quota/
  );
  assert.equal(s.getItem(key), before);
  assert.equal(
    readTemplateLibrary(s, "local").defaultId,
    lib.defaultId
  );
});
test("template copies arrangement only; application retains saved bindings and task references", () => {
  const p = reconcileJourney(newJourney("local", day), [record], null);
  p.stages[1].slots[0].task = taskRef(record.task);
  const t = templateFromJourney(p, "复制");
  assert.ok(!JSON.stringify(t).includes("binding"));
  assert.ok(!JSON.stringify(t).includes("task"));
  const next = applyJourneyTemplate(p, t, [record]);
  assert.equal(Object.keys(completion(next, [record])).length, 3);
  assert.deepEqual(
    next.stages[1].slots[0].task,
    p.stages[1].slots[0].task
  );
  const small = clone(t);
  small.stages[0].count = 2;
  assert.throws(() => applyJourneyTemplate(p, small, [record]));
  assert.throws(() =>
    applyJourneyTemplate(p, t, [record], {
      ...record,
      status: "active",
    })
  );
  const shrink = clone(t);
  shrink.stages[1].count = 0;
  assert.throws(
    () => applyJourneyTemplate(p, shrink, [record]),
    /关联/
  );
  assert.doesNotThrow(() =>
    applyJourneyTemplate(
      { ...p, day: journeyDay(Date.now(), 1) },
      t,
      [],
      { ...record, status: "active" }
    )
  );
});
test("legacy daily plan gains optional icon/time fields while retaining record bindings", () => {
  const p = newJourney("local", day);
  delete p.endHour;
  delete p.restingAction;
  delete p.passedActions;
  for (const s of p.stages) {
    delete s.time;
    delete s.restActions;
  }
  p.resting = p.stages[2].id;
  const v = validateJourney(p, "local", day);
  assert.deepEqual(v.stages[2].restActions, [
    "nap",
    "gym",
    "meal",
    "nap",
  ]);
  assert.equal(v.restingAction, `${p.stages[2].id}:0`);
});
test("gym option follows current/resting stage and disappears after passing gym; normal other stages remain unavailable", () => {
  let p = newJourney("local", day);
  assert.equal(gymRestTarget(p, []), null);
  const r = { ...record, completedCount: 7 };
  p = reconcileJourney(p, [r], null);
  const target = gymRestTarget(p, [r]);
  assert.equal(target.stageId, p.stages[2].id);
  p.resting = target.stageId;
  p.restingAction = target.actionKey;
  assert.deepEqual(gymRestTarget(p, [r]), target);
  p.passedActions.push(target.actionKey);
  assert.equal(gymRestTarget(p, [r]), null);
});
