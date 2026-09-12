const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const {
  Feishu,
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const {
  PLAN_FIELDS,
  ledgerField,
  readLedger,
} = require("../app/electron/build/focus/plan.js");
const {
  dateKeyOf,
  dayStart,
  scanExisting,
  pomodoroPlan,
  clientToken,
} = require("../app/electron/build/focus/generate.js");
const { harness, record, config } = require("./plan-fixture.cjs");
test("partial saves accumulate on one selected row; threshold checks only that row; duplicate does not increment", async () => {
  const { state, client } = harness(),
    other = structuredClone(state.plans[1]);
  const first = record(720),
    second = record(780);
  assert.equal((await client.sync(first)).completedCount, 0);
  assert.equal(state.plans[0].fields["实际分钟"], 12);
  assert.notEqual(state.plans[0].fields["已完成"], true);
  assert.equal((await client.sync(second)).completedCount, 1);
  assert.equal(state.plans[0].fields["实际分钟"], 25);
  assert.equal(state.plans[0].fields["已完成"], true);
  assert.equal(readLedger(state.plans[0].fields).entries.length, 2);
  assert.equal(
    state.plans[0].fields["专注时间段"].split("\n").length,
    2
  );
  assert.equal(state.plans[0].fields["进展"], "keep");
  assert.deepEqual(state.plans[1], other);
  const writes = state.writes.length;
  await client.sync(first);
  await client.sync(second);
  assert.equal(state.writes.length, writes);
  assert.equal(
    (await client.today()).some((r) => r.planId === "p1"),
    false
  );
});
test("lost response, concurrent partial sessions and retries retain each increment exactly once", async () => {
  const { state, client } = harness(),
    a = record(720),
    b = record(780);
  state.lose = true;
  await assert.rejects(client.sync(a), /lost/);
  await client.sync(a);
  await Promise.all([client.sync(b), client.sync(b)]);
  assert.equal(state.plans[0].fields["实际分钟"], 25);
  assert.equal(state.writes.length, 2);
});
test("free focus creates one linked original-table row and a shared free task, retry cannot duplicate", async () => {
  const { state, client } = harness();
  const free = record(1500, {
    task: {
      id: "free1",
      kind: "free",
      title: "自由番茄",
      source: "feishu",
      sourceKey: connectionKey(config),
    },
  });
  state.lose = true;
  await assert.rejects(client.sync(free), /lost/);
  const ack = await client.sync(free);
  await client.sync(free);
  assert.equal(state.plans.length, 3);
  assert.equal(state.tasks.length, 2);
  const row = state.plans.find((r) => r.record_id === ack.planId);
  assert.equal(row.fields["番茄"], "自由番茄");
  assert.equal(row.fields["实际分钟"], 25);
  assert.equal(row.fields["已完成"], true);
  assert.ok(row.fields["任务"][0]);
  assert.equal(row.fields["计划日"], free.startedAt);
  await client.sync(
    record(300, { task: { ...free.task, id: "free2" } })
  );
  assert.equal(state.plans.length, 4);
  assert.equal(state.tasks.length, 2);
  const freePending = (await client.today()).find(
    (r) => r.kind === "free"
  );
  assert.ok(freePending);
  assert.equal(freePending.title, "自由番茄");
  assert.equal(freePending.creditedSeconds, 300);
});
test("manual focus-column edits, changed task links and foreign destinations are not overwritten", async () => {
  const { state, client } = harness();
  await client.sync(record());
  const count = state.writes.length;
  state.plans[0].fields["实际分钟"] = 99;
  await assert.rejects(client.sync(record()), /修改/);
  assert.equal(state.writes.length, count);
  state.plans[0].fields["实际分钟"] = 12;
  state.plans[0].fields["任务"] = ["other"];
  await assert.rejects(client.sync(record()), /关联任务/);
  await assert.rejects(
    client.sync(
      record(720, {
        task: { ...record().task, sourceKey: "elsewhere" },
      })
    ),
    /另一份/
  );
  assert.equal(state.writes.length, count);
});
test("same ID with changed accepted time is rejected; retry respects a manual completion change", async () => {
  const { state, client } = harness(),
    r = record(1500);
  await client.sync(r);
  const count = state.writes.length;
  await assert.rejects(
    client.sync({ ...r, acceptedSeconds: 1400 }),
    /内容不同/
  );
  state.plans[0].fields["已完成"] = false;
  await assert.rejects(client.sync(r), /完成状态/);
  assert.equal(state.writes.length, count);
});
test("schema setup adds only missing focus columns and refuses a conflicting existing type before any write", async () => {
  const { state, client } = harness();
  state.fields = state.fields.filter(
    (f) => !PLAN_FIELDS.some((x) => x.field_name === f.field_name)
  );
  await client.setupPlans();
  assert.equal(state.writes.length, 4);
  await client.setupPlans();
  assert.equal(state.writes.length, 4);
  state.fields.find((f) => f.field_name === "实际分钟").type = 1;
  await assert.rejects(client.setupPlans(), /类型/);
  assert.equal(state.writes.length, 4);
});
test("offline preserves payload, no elapsed-time rounding completes a short focus, long focus completes only one", async () => {
  const { state, client } = harness(),
    r = record(1499),
    before = structuredClone(r);
  state.fail = true;
  await assert.rejects(client.sync(r), /offline/);
  assert.deepEqual(r, before);
  assert.equal(state.writes.length, 0);
  state.fail = false;
  assert.equal((await client.sync(r)).completedCount, 0);
  assert.notEqual(state.plans[0].fields["已完成"], true);
  const long = record(3300, {
    task: { ...r.task, id: "p2", planId: "p2" },
  });
  assert.equal((await client.sync(long)).completedCount, 1);
  assert.equal(state.plans[1].fields["实际分钟"], 55);
});
test("paused intervals and rejected overtime retain actual periods and the user accepted total", async () => {
  const { state, client } = harness();
  const end = Date.now() - 1000,
    start = end - 1800000;
  const r = record(1500, {
    startedAt: start,
    endedAt: end,
    elapsedSeconds: 1500,
    acceptedSeconds: 1200,
    segments: [
      { start, end: start + 600000 },
      { start: start + 900000, end },
    ],
  });
  await client.sync(r);
  assert.equal(state.plans[0].fields["实际分钟"], 20);
  assert.equal(
    readLedger(state.plans[0].fields).entries[0].spans.length,
    2
  );
  assert.notEqual(state.plans[0].fields["已完成"], true);
});

// ── 右键「标记完成」：只写已完成勾选，不建记录、不计分钟 ──
test("completePlan writes only the checkbox; no minutes, no new rows", async () => {
  const { state, client } = harness();
  const result = await client.completePlan("p1");
  assert.deepEqual(result, { completed: true, recordId: "p1" });
  assert.equal(state.plans[0].fields["已完成"], true);
  assert.equal(state.plans[0].fields["实际分钟"], undefined);
  assert.equal(state.plans[0].fields[ledgerField], undefined);
  const puts = state.writes.filter((w) => w.method === "PUT");
  assert.equal(puts.length, 1);
  assert.deepEqual(puts[0].body.fields, { 已完成: true });
  assert.equal(
    state.writes.filter((w) => w.method === "POST").length,
    0
  );
  // 左侧刷新口径：该行从待办消失，已收 x/y 变 1/2
  const rows = await client.today();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "p2");
  assert.equal(rows[0].doneToday, 1);
  assert.equal(rows[0].plannedToday, 2);
});
test("completePlan is idempotent; a lost first response retries without a second PUT", async () => {
  const { state, client } = harness();
  state.lose = true;
  await assert.rejects(() => client.completePlan("p1"), /lost response/);
  // 丢失的写入实际已生效；重试命中「已完成即保持」直接成功，不再 PUT
  const again = await client.completePlan("p1");
  assert.equal(again.completed, true);
  assert.equal(
    state.writes.filter((w) => w.method === "PUT").length,
    1
  );
});
test("completePlan rejects unknown, non-today and malformed rows", async () => {
  const { state, client } = harness();
  state.plans.push({
    record_id: "old",
    fields: {
      番茄: "1",
      计划日: new Date().setHours(0, 0, 0, 0) - 86400000,
      任务: ["t1"],
    },
  });
  await assert.rejects(() => client.completePlan("nope"), /已不存在/);
  await assert.rejects(() => client.completePlan("old"), /只能完成今天/);
  await assert.rejects(() => client.completePlan("../p1"), /格式错误/);
  assert.equal(state.writes.length, 0);
});
test("a right-click-completed row is never unchecked by a later sync merge", async () => {
  const { state, client } = harness();
  await client.completePlan("p1");
  // 该行之后再有专注记录同步（例如完成前已在计时）：台账照常累计，
  // 但 mergePlan 只会保持勾选，不会把已勾选行刷回未完成
  const receipt = await client.sync(record(720));
  assert.equal(receipt.completedCount, 0);
  assert.equal(state.plans[0].fields["已完成"], true);
  assert.equal(state.plans[0].fields["实际分钟"], 12);
  assert.equal(readLedger(state.plans[0].fields).entries.length, 1);
});

// ── 确认 N 个番茄：被选中行 + 其后连续序号共 N 行标记完成，缺行自动补建 ──
test("confirming N marks the selected row and following rows; minutes stay on the selected row", async () => {
  const { state, client } = harness();
  // 12 分钟 < 25 分钟目标：mergePlan 不会自动勾选，勾选完全来自手动选 N
  const receipt = await client.sync(record(720, { completedCount: 2 }));
  assert.equal(receipt.completedCount, 0);
  assert.deepEqual(receipt.completion, { marked: 2, failed: [] });
  assert.equal(state.plans[0].fields["已完成"], true);
  assert.equal(state.plans[1].fields["已完成"], true);
  // 分钟台账只记在被选中行，不拆分
  assert.equal(state.plans[0].fields["实际分钟"], 12);
  assert.equal(state.plans[1].fields["实际分钟"], undefined);
  assert.equal(state.plans[1].fields[ledgerField], undefined);
  // 左侧刷新口径：两行都从待办消失，只剩占位 done 行，已收 2/2
  const rows = await client.today();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "done");
  assert.equal(rows[0].doneToday, 2);
  assert.equal(rows[0].plannedToday, 2);
});
test("missing rows are auto-created with the generator idempotency key; a later generate skips them", async () => {
  const { state, client } = harness();
  // 只计划了 2 行却记了 4 个：补建第 3、4 行并一并标记完成
  const r = record(3300, { completedCount: 4 });
  const receipt = await client.sync(r);
  assert.deepEqual(receipt.completion, { marked: 4, failed: [] });
  assert.equal(state.plans.length, 4);
  const dayMs = dayStart(new Date()),
    dateKey = dateKeyOf(dayMs);
  for (const s of [3, 4]) {
    const row = state.plans.find((r) => r.fields["番茄"] === String(s));
    assert.ok(row, `missing auto-created row ${s}`);
    assert.equal(row.fields["已完成"], true);
    assert.equal(row.fields["计划日"], dayMs);
    const post = state.writes.find(
      (w) => w.method === "POST" && w.body.fields["番茄"] === String(s)
    );
    // client_token 与 generate/adjust 同一规范：today-pomodoro-create|appToken|任务|日期|序号
    assert.ok(
      post.route.includes(
        `client_token=${clientToken(
          `today-pomodoro-create|${config.appToken}|t1|${dateKey}|${s}`
        )}`
      )
    );
  }
  // 生成器口径：补行的键已存在，同日同任务再生成只会跳过不会重建
  const scan = scanExisting(state.plans, {
    dayMs,
    dateKey,
    dateField: "计划日",
    taskField: "任务",
    seqField: "番茄",
    knownTaskIds: new Set(["t1"]),
    candidateTaskIds: new Set(["t1"]),
    linkIds: (v) =>
      (Array.isArray(v) ? v : [v]).flatMap((x) =>
        typeof x === "string" ? [x] : x?.record_ids || []
      ),
  });
  const plan = pomodoroPlan(
    [{ recordId: "t1", count: 4 }],
    scan.keyCounts,
    scan.blocked,
    dateKey
  );
  assert.equal(plan.specs.length, 0);
  assert.equal(plan.alreadyPresent, 4);
  // 整条记录重试（例如补行前网络抖动后重同步）幂等：不再产生新写入
  const writes = state.writes.length;
  const again = await client.sync(r);
  assert.ok(again.synced);
  assert.equal(state.writes.length, writes);
});
test("already-completed rows in the range are skipped without extra writes", async () => {
  const { state, client } = harness();
  state.plans[1].fields["已完成"] = true;
  const receipt = await client.sync(record(720, { completedCount: 2 }));
  assert.deepEqual(receipt.completion, { marked: 2, failed: [] });
  // 被选中行 PUT 两次（台账合并 + 勾选），已勾选的第 2 行没有任何写入
  const puts = state.writes.filter((w) => w.method === "PUT");
  assert.equal(puts.length, 2);
  assert.ok(puts.every((w) => w.route.endsWith("/records/p1")));
  assert.equal(state.plans[1].fields["实际分钟"], undefined);
});
test("partial row failures are reported per sequence without failing the session sync", async () => {
  const { state, client } = harness();
  state.failPut = new Set(["p2"]);
  const receipt = await client.sync(record(720, { completedCount: 2 }));
  // 会话本体仍同步成功；第 2 行未成，序号和原因进 completion.failed
  assert.equal(receipt.synced, true);
  assert.equal(receipt.completion.marked, 1);
  assert.deepEqual(receipt.completion.failed, [
    { sequence: 2, reason: "write rejected" },
  ]);
  assert.equal(state.plans[0].fields["已完成"], true);
  assert.notEqual(state.plans[1].fields["已完成"], true);
});
test("free focus with N>0 never creates extra plan rows or completions", async () => {
  const { state, client } = harness();
  const free = record(1500, {
    completedCount: 3,
    task: {
      id: "free",
      planId: "",
      taskId: "",
      kind: "free",
      source: "feishu",
      sourceKey: connectionKey(config),
      title: "自由番茄",
    },
  });
  await client.sync(free);
  // 自由番茄只新增 1 行，不因 N=3 补建序号行
  assert.equal(state.plans.length, 3);
  assert.equal(state.plans[2].fields["番茄"], "自由番茄");
  assert.notEqual(state.plans[0].fields["已完成"], true);
  assert.notEqual(state.plans[1].fields["已完成"], true);
});
