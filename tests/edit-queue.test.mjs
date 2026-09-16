import test from "node:test";
import assert from "node:assert/strict";
import { EditQueue } from "../app/renderer/src/focus/editQueue.ts";
const store = () => {
  let text = null;
  return {
    getItem: () => text,
    setItem: (_, v) => {
      text = v;
    },
  };
};
test("outbox persists intent identity, waits for sync, retries failure, and isolates Base", async () => {
  const s = store();
  let q = new EditQueue(s);
  q.add({
    id: "one",
    sourceKey: "base",
    kind: "task",
    payload: { id: "one" },
    state: "pending",
  });
  q = new EditQueue(s);
  let calls = 0;
  await q.drain("other", async () => calls++);
  await q.drain(
    "base",
    async () => calls++,
    () => false
  );
  assert.equal(calls, 0);
  await q.drain("base", async () => {
    calls++;
    throw Error("offline");
  });
  assert.equal(q.entries[0].state, "failed");
  await q.drain("base", async () => calls++);
  assert.equal(calls, 1);
  q.retry("base");
  await q.drain("base", async (e) => {
    assert.equal(e.id, "one");
    calls++;
  });
  assert.equal(q.entries.length, 0);
  assert.equal(new EditQueue(s).entries.length, 0);
});
test("corrupt storage and failed persistence never acknowledge new edits", () => {
  const q = new EditQueue({
    getItem: () => "broken",
    setItem: () => {
      throw Error("must not write");
    },
  });
  assert.ok(q.storageError);
  assert.throws(() => q.add({ id: "x" }));
  const full = new EditQueue({
    getItem: () => null,
    setItem: () => {
      throw Error("full");
    },
  });
  assert.throws(() => full.add({ id: "x" }), /空间/);
  assert.equal(full.entries.length, 0);
});
