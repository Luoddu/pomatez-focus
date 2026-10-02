import test from "node:test";
import assert from "node:assert/strict";
import { EditQueue } from "../app/renderer/src/focus/editQueue.ts";
import {
  quickRows,
  projectQuickTasks,
  bindQuickSessions,
  bindQuickTask,
  validateQuickReceipt,
  mergeQuickRows,
  removePlanRows,
} from "../app/renderer/src/focus/quickTasks.ts";
import { mergeCloudRecords } from "../app/renderer/src/focus/cloud.ts";
const q = {
  id: "intent",
  sourceKey: "base",
  title: "Synthetic",
  quadrant: "inu",
  count: 2,
  day: new Date().setHours(0, 0, 0, 0),
};
const received = () =>
  quickRows(q).map((r, i) => {
    const { quickTask, ...rest } = r;
    return {
      ...rest,
      id: `p${i + 1}`,
      planId: `p${i + 1}`,
      taskId: "task",
    };
  });
test("successive reductions survive offline/restart and interleaved appends keep totals and exact targets", async () => {
  let raw = null;
  const store = { getItem: () => raw, setItem: (_, v) => (raw = v) };
  const rows = Array.from({ length: 3 }, (_, i) => ({
    id: `p${i + 1}`,
    planId: `p${i + 1}`,
    taskId: "task",
    source: "feishu",
    sourceKey: "base",
    title: `Synthetic · 第 ${i + 1} 个番茄`,
    plannedToday: 3,
    doneToday: 0,
    quadrant: "iu",
  }));
  let queue = new EditQueue(store);
  for (const task of rows.slice(1).reverse())
    queue.add({
      id: `rm-${task.id}`,
      kind: "remove",
      sourceKey: "base",
      state: "pending",
      payload: {
        id: `rm-${task.id}`,
        sourceKey: "base",
        day: q.day,
        task,
      },
    });
  assert.deepEqual(
    projectQuickTasks(rows, queue.entries, "base").map((r) => r.id),
    ["p1"]
  );
  assert.equal(
    projectQuickTasks(rows, queue.entries, "base")[0].plannedToday,
    1
  );
  assert.equal(
    projectQuickTasks(rows, queue.entries, "other").length,
    3
  );
  await queue.drain("base", async () => {
    throw Error("offline");
  });
  queue = new EditQueue(store);
  assert.equal(
    projectQuickTasks(rows, queue.entries, "base").length,
    1
  );
  const append = {
    ...q,
    id: "append",
    quadrant: "iu",
    projectType: "research",
    count: 1,
    append: {
      taskId: "task",
      sequence: 4,
      plannedToday: 2,
      doneToday: 0,
    },
  };
  queue.add({
    id: append.id,
    sourceKey: "base",
    kind: "task",
    payload: append,
    state: "pending",
  });
  const projected = projectQuickTasks(rows, queue.entries, "base");
  assert.equal(projected.length, 2);
  assert.ok(projected.every((r) => r.plannedToday === 2));
  const draft = quickRows(append)[0];
  assert.equal(draft.projectType, "research");
  queue.add({
    id: "rm-draft",
    sourceKey: "base",
    kind: "remove",
    state: "pending",
    payload: {
      id: "rm-draft",
      sourceKey: "base",
      day: q.day,
      task: draft,
    },
  });
  const receipt = {
    ...draft,
    id: "real4",
    planId: "real4",
    quickTask: undefined,
  };
  queue.resolveTask(append.id, [receipt], (task) =>
    bindQuickTask(task, append, [receipt])
  );
  assert.equal(
    queue.entries.find((e) => e.id === "rm-draft").payload.task.planId,
    "real4"
  );
  assert.equal(
    projectQuickTasks(rows, queue.entries, "base").length,
    1
  );
  const acknowledged = removePlanRows(rows, [rows[2]]);
  assert.equal(
    projectQuickTasks(acknowledged, queue.entries, "base")[0]
      .plannedToday,
    1
  );
  const done = { ...rows[2], kind: "done", doneToday: 1 };
  assert.ok(
    removePlanRows([done], [rows[2]]).some((t) => t.id === "p3")
  );
  assert.equal(
    removePlanRows([{ ...rows[2], creditedSeconds: 1 }], [rows[2]])
      .length,
    1
  );
  assert.equal(
    removePlanRows(
      [{ ...rows[2], appliedSessionIds: ["session"] }],
      [rows[2]]
    ).length,
    1
  );
});
test("additional tomatoes retain existing task/quadrant/details, preserve siblings and bind to the correct sequence", () => {
  for (const quadrant of ["iu", "inu", "uni", "unu", undefined]) {
    const intent = {
      ...q,
      quadrant,
      count: 1,
      append: {
        taskId: "existing",
        sequence: 4,
        doneToday: 3,
        plannedToday: 4,
        description: "Details",
      },
    };
    const old = {
      id: "done",
      taskId: "existing",
      source: "feishu",
      sourceKey: "base",
      title: "Synthetic",
      kind: "done",
      plannedToday: 3,
      doneToday: 3,
      quadrant,
    };
    const row = quickRows(intent)[0];
    assert.equal(row.kind, undefined);
    assert.equal(row.quadrant, quadrant);
    assert.equal(row.description, "Details");
    assert.equal(row.taskId, "existing");
    assert.match(row.title, /第 4 个/);
    const projected = projectQuickTasks(
      [old],
      [
        {
          id: intent.id,
          kind: "task",
          sourceKey: "base",
          payload: intent,
          state: "failed",
        },
      ],
      "base"
    );
    assert.equal(projected.length, 2);
    assert.equal(projected[0].plannedToday, 4);
    assert.equal(projected[0].doneToday, 3);
    const { quickTask, ...data } = row;
    const receipt = { ...data, id: "real4", planId: "real4" };
    validateQuickReceipt(intent, [receipt]);
    assert.throws(() =>
      validateQuickReceipt(intent, [{ ...receipt, taskId: "wrong" }])
    );
    assert.equal(bindQuickTask(row, intent, [receipt]).planId, "real4");
    assert.equal(
      mergeQuickRows(
        [old, { ...old, id: "unrelated", taskId: "other" }],
        [receipt]
      ).length,
      3
    );
  }
});
test("quick task is visible before upload, after failure/restart, and binds active/saved sessions without changing time", async () => {
  let raw = null;
  const store = {
    getItem: () => raw,
    setItem: (_, v) => {
      raw = v;
    },
  };
  let queue = new EditQueue(store);
  queue.add({
    id: q.id,
    sourceKey: q.sourceKey,
    kind: "task",
    payload: q,
    state: "pending",
  });
  const draft = projectQuickTasks([], queue.entries, "base");
  assert.equal(draft.length, 2);
  assert.equal(draft[0].kind, undefined);
  await queue.drain("base", async () => {
    throw Error("offline");
  });
  queue = new EditQueue(store);
  assert.deepEqual(projectQuickTasks([], queue.entries, "base"), draft);
  assert.deepEqual(projectQuickTasks([], queue.entries, "other"), []);
  assert.deepEqual(
    projectQuickTasks([], queue.entries, "base", q.day + 86400000),
    []
  );
  const active = {
    id: "session",
    task: draft[0],
    elapsedSeconds: 55,
    status: "active",
  };
  const saved = {
    ...active,
    id: "saved",
    task: draft[1],
    acceptedSeconds: 55,
    status: "saved",
  };
  const result = bindQuickSessions(
    { active, records: [saved] },
    q,
    received()
  );
  assert.equal(result.active.task.planId, "p1");
  assert.equal(result.active.elapsedSeconds, 55);
  assert.equal(result.active.status, "active");
  assert.equal(result.records[0].task.planId, "p2");
  assert.equal(result.records[0].acceptedSeconds, 55);
  assert.deepEqual(bindQuickSessions(result, q, received()), result);
  assert.throws(() => validateQuickReceipt(q, received().reverse()));
  assert.throws(() =>
    bindQuickTask({ ...draft[0], sourceKey: "foreign" }, q, received())
  );
  queue.resolveTask(q.id, received(), (t) =>
    bindQuickTask(t, q, received())
  );
  assert.deepEqual(
    new EditQueue(store).entries[0].taskRows,
    received()
  );
});
test("explicit task lineage permits cross-device reassignment including skipped revisions, ordinary changed task still rejects", () => {
  const task = received()[0];
  const old = {
    id: "r",
    task,
    revision: 0,
    status: "saved",
    sync: "synced",
    cloudSynced: true,
    acceptedSeconds: 1500,
    completedCount: 1,
  };
  const moved = {
    ...old,
    revision: 2,
    task: received()[1],
    previousTasks: [task],
  };
  assert.equal(
    mergeCloudRecords([old], [moved], "base")[0].task.id,
    "p2"
  );
  assert.throws(
    () =>
      mergeCloudRecords(
        [old],
        [{ ...moved, previousTasks: undefined }],
        "base"
      ),
    /关联/
  );
  assert.throws(() =>
    mergeCloudRecords(
      [old],
      [
        {
          ...moved,
          previousTasks: [{ ...task, sourceKey: "foreign" }],
        },
      ],
      "base"
    )
  );
});
