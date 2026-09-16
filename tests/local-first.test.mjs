import test from "node:test";
import assert from "node:assert/strict";
import { EditQueue } from "../app/renderer/src/focus/editQueue.ts";
import {
  quickRows,
  projectQuickTasks,
  bindQuickSessions,
  bindQuickTask,
  validateQuickReceipt,
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
