const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const code = ts.transpileModule(
  fs.readFileSync("app/renderer/src/focus/completionQueue.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;
const mod = { exports: {} };
new Function("exports", "require", "module", code)(
  mod.exports,
  require,
  mod
);
const { CompletionQueue } = mod.exports;
const task = (id) => ({
  id,
  planId: id,
  taskId: "t1",
  title: id,
  source: "feishu",
  sourceKey: "A",
  doneToday: 0,
  plannedToday: 3,
});
const storage = () => {
  let value = null;
  return {
    getItem: () => value,
    setItem: (_, v) => {
      value = v;
    },
  };
};
test("slow write allows immediate durable enqueue; one request at a time and no duplicates", async () => {
  const store = storage(),
    q = new CompletionQueue(store),
    calls = [];
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  q.enqueue(task("p1"), "A");
  const work = q.drain("A", async (id) => {
    calls.push(id);
    if (id === "p1") await gate;
  });
  q.enqueue(task("p2"), "A");
  q.enqueue(task("p3"), "A");
  q.enqueue(task("p2"), "A");
  assert.equal(q.entries.length, 3);
  assert.deepEqual(calls, ["p1"]);
  assert.equal(new CompletionQueue(store).entries.length, 3);
  const rows = q.project(["p1", "p2", "p3"].map(task), "A");
  assert.ok(rows.every((t) => t.kind === "done" && t.doneToday === 3));
  release();
  await work;
  assert.deepEqual(calls, ["p1", "p2", "p3"]);
});
test("failure preserves only failed item; subsequent items continue; retry does not replay success", async () => {
  const q = new CompletionQueue(storage());
  ["p1", "p2"].forEach((id) => q.enqueue(task(id), "A"));
  await q.drain("A", async (id) => {
    if (id === "p1") throw Error("offline");
  });
  assert.deepEqual(
    q.entries.map((e) => e.state),
    ["failed", "done"]
  );
  q.retry("A");
  const calls = [];
  await q.drain("A", async (id) => calls.push(id));
  assert.deepEqual(calls, ["p1"]);
});
test("restart and connection isolation; refresh cannot resurrect pending or failed chips", async () => {
  const store = storage(),
    q = new CompletionQueue(store);
  q.enqueue(task("p1"), "A");
  const restored = new CompletionQueue(store);
  const calls = [];
  await restored.drain("B", async (id) => calls.push(id));
  assert.equal(calls.length, 0);
  assert.equal(restored.project([task("p1")], "B")[0].kind, undefined);
  restored.reconcile("A", []);
  assert.equal(restored.entries.length, 1);
  assert.equal(restored.project([task("p1")], "A")[0].kind, "done");
  await restored.drain("A", async (id) => calls.push(id));
  assert.deepEqual(calls, ["p1"]);
  restored.reconcile("A", [task("p1")]);
  assert.equal(restored.entries.length, 1);
  restored.reconcile("A", []);
  assert.equal(restored.entries.length, 0);
  assert.throws(() => q.enqueue(task("p2"), "B"), /来源/);
});
test("storage failure never accepts a click or starts a remote mutation", async () => {
  const q = new CompletionQueue({
    getItem: () => null,
    setItem: () => {
      throw Error("quota");
    },
  });
  assert.throws(() => q.enqueue(task("p1"), "A"), /未接受/);
  assert.equal(q.entries.length, 0);
  await q.drain("A", async () => assert.fail("must not send"));
  const corrupt = new CompletionQueue({
    getItem: () => "{broken",
    setItem: () => assert.fail("must not overwrite"),
  });
  assert.throws(() => corrupt.enqueue(task("p1"), "A"), /停止处理/);
});
test("pause drain for another plan operation; resume still completes remaining items", async () => {
  const q = new CompletionQueue(storage());
  ["p1", "p2"].forEach((id) => q.enqueue(task(id), "A"));
  let ready = true;
  await q.drain(
    "A",
    async () => {
      ready = false;
    },
    () => ready
  );
  assert.deepEqual(
    q.entries.map((e) => e.state),
    ["done", "pending"]
  );
  await q.drain("A", async () => {});
  assert.ok(q.entries.every((e) => e.state === "done"));
});
