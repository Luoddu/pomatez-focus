const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const {
  Feishu,
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const {
  mergePlan,
  PLAN_FIELDS,
} = require("../app/electron/build/focus/plan.js");
const {
  HISTORY_FIELD,
  historyRecord,
} = require("../app/electron/build/focus/history.js");
function harness() {
  const config = {
    appId: "synthetic",
    appSecret: "synthetic",
    appToken: "base",
    planTable: "专注记录",
    dateField: "计划日",
    taskField: "任务",
    completedField: "已完成",
  };
  const labels = [
    "重要且紧急",
    "重要不紧急",
    "紧急不重要",
    "不紧急不重要",
  ];
  const fields = {
    tasks: [
      { field_name: "任务名称", type: 1 },
      { field_name: "计划日", type: 5 },
      { field_name: "今日计划番茄数", type: 2 },
      {
        field_name: "象限",
        type: 3,
        property: { options: labels.map((name) => ({ name })) },
      },
    ],
    plans: [
      { field_name: "计划日", type: 5 },
      { field_name: "任务", type: 21, property: { table_id: "tasks" } },
      { field_name: "已完成", type: 7 },
      { field_name: "番茄", type: 1 },
      ...PLAN_FIELDS,
      { field_name: HISTORY_FIELD, type: 1 },
    ],
  };
  const state = {
    fields,
    tasks: [],
    plans: [],
    writes: [],
    lose: "",
    next: 1,
  };
  const request = async (method, route, body) => {
    if (route.startsWith("auth/"))
      return { tenant_access_token: "synthetic", expire: 7200 };
    const url = route.split("?")[0];
    const items = (items) => ({
      data: { items: structuredClone(items), has_more: false },
    });
    if (url.endsWith("/tables"))
      return items([{ name: "专注记录", table_id: "plans" }]);
    const m =
      /\/tables\/(tasks|plans)\/(fields|records)(?:\/([^/]+))?$/.exec(
        url
      );
    assert.ok(m, url);
    const [, table, kind, id] = m;
    if (method === "GET") {
      if (kind === "fields") return items(fields[table]);
      if (!id) return items(state[table]);
      return {
        data: {
          record: structuredClone(
            state[table].find((r) => r.record_id === id)
          ),
        },
      };
    }
    state.writes.push({ method, route, body: structuredClone(body) });
    const fail =
      method === "PUT" && kind === "records" && --state.failWrite === 0;
    if (fail && state.failBefore)
      throw Error("synthetic interrupted move");
    if (kind === "fields") {
      fields[table].push(body);
      return { data: {} };
    }
    let row;
    if (method === "POST") {
      row = {
        record_id: table + state.next++,
        fields: structuredClone(body.fields),
      };
      state[table].push(row);
    } else {
      row = state[table].find((r) => r.record_id === id);
      assert.ok(row);
      Object.assign(row.fields, structuredClone(body.fields));
    }
    if (fail) throw Error("synthetic interrupted move");
    if (state.lose === `${method}:${table}`) {
      state.lose = "";
      throw Error("synthetic response lost");
    }
    return { data: { record: structuredClone(row) } };
  };
  return {
    client: new Feishu(config, request),
    key: connectionKey(config),
    state,
  };
}
test("quick task writes correct quadrant/date/count and retries after lost task response without duplicates", async () => {
  const h = harness(),
    now = new Date();
  const value = {
    id: randomUUID(),
    sourceKey: h.key,
    title: "Synthetic quick task",
    quadrant: "inu",
    count: 2,
    day: +new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  };
  h.state.lose = "POST:tasks";
  await assert.rejects(
    h.client.createQuickTask(value),
    /response lost/
  );
  assert.equal(h.state.tasks.length, 1);
  await h.client.createQuickTask(value);
  await h.client.createQuickTask(value);
  assert.equal(h.state.tasks.length, 1);
  assert.equal(h.state.plans.length, 2);
  assert.equal(h.state.tasks[0].fields.象限, "重要不紧急");
  assert.equal(h.state.tasks[0].fields.近日行动, undefined);
  assert.equal(h.state.tasks[0].fields.计划日, value.day);
  const before = h.state.writes.length;
  await assert.rejects(
    h.client.createQuickTask({ ...value, sourceKey: "other" }),
    /所属/
  );
  await assert.rejects(
    h.client.createQuickTask({ ...value, title: "Changed intent" }),
    /不一致/
  );
  assert.equal(h.state.writes.length, before);
});
test("quick task can finish a partially created plan with same operation identity", async () => {
  const h = harness();
  const value = {
    id: randomUUID(),
    sourceKey: h.key,
    title: "Synthetic",
    quadrant: "iu",
    count: 3,
    day: Date.now(),
  };
  h.state.lose = "POST:plans";
  await assert.rejects(
    h.client.createQuickTask(value),
    /response lost/
  );
  await h.client.createQuickTask(value);
  assert.equal(h.state.tasks.length, 1);
  assert.equal(h.state.plans.length, 3);
});
function seed(h) {
  const end = Date.now() - 60000;
  const r = {
    id: randomUUID(),
    task: {
      id: "p1",
      planId: "p1",
      taskId: "t1",
      source: "feishu",
      sourceKey: h.key,
      title: "Synthetic · 第 1 个番茄",
    },
    status: "saved",
    syncTarget: "plan",
    sync: "synced",
    startedAt: end - 3000000,
    endedAt: end,
    elapsedSeconds: 3000,
    acceptedSeconds: 3000,
    plannedSeconds: 1500,
    completedCount: 2,
    completionOwnedPlanIds: ["p1", "p2"],
  };
  const patch = mergePlan({}, r, "已完成").patch;
  h.state.plans.push({
    record_id: "p1",
    fields: {
      ...patch,
      番茄: "1",
      任务: ["t1"],
      计划日: r.startedAt,
      [HISTORY_FIELD]: JSON.stringify({
        version: 1,
        records: [historyRecord(r, h.key)],
      }),
    },
  });
  h.state.plans.push({
    record_id: "p2",
    fields: {
      番茄: "2",
      任务: ["t1"],
      计划日: r.startedAt,
      已完成: true,
    },
  });
  return r;
}
test("correction replaces ledger/history, unchecks owned excess row, and retries lost write response idempotently", async () => {
  const h = harness(),
    before = seed(h);
  const after = {
    ...before,
    revision: 1,
    startedAt: before.endedAt - 1500000,
    elapsedSeconds: 1500,
    acceptedSeconds: 1500,
    completedCount: 1,
  };
  h.state.lose = "PUT:plans";
  await assert.rejects(
    h.client.correctRecord({ before, after }),
    /response lost/
  );
  const result = await h.client.correctRecord({ before, after });
  assert.equal(result.record.revision, 1);
  assert.equal(h.state.plans[0].fields.实际分钟, 25);
  assert.equal(h.state.plans[1].fields.已完成, false);
  await h.client.correctRecord({ before, after });
  assert.equal(
    JSON.parse(h.state.plans[0].fields[HISTORY_FIELD]).records.length,
    1
  );
  const writes = h.state.writes.length;
  await assert.rejects(
    h.client.correctRecord({
      before,
      after: { ...after, completedCount: 0 },
    }),
    /另一台/
  );
  assert.equal(h.state.writes.length, writes);
});
test("legacy unowned completions are retained and manual ledger changes block corrections", async () => {
  const h = harness(),
    before = seed(h);
  delete before.completionOwnedPlanIds;
  h.state.plans[0].fields[HISTORY_FIELD] = JSON.stringify({
    version: 1,
    records: [historyRecord(before, h.key)],
  });
  const after = { ...before, revision: 1, completedCount: 1 };
  const result = await h.client.correctRecord({ before, after });
  assert.match(result.warning, /核对/);
  assert.equal(h.state.plans[1].fields.已完成, true);
  h.state.plans[0].fields.实际分钟 = 999;
  await assert.rejects(
    h.client.correctRecord({
      before: after,
      after: { ...after, revision: 2 },
    }),
    /分钟/
  );
});

function moveSeed() {
  const h = harness(),
    before = seed(h);
  h.state.plans.push({
    record_id: "p3",
    fields: { 番茄: "1", 任务: ["t2"], 计划日: before.startedAt },
  });
  h.state.plans.push({
    record_id: "p4",
    fields: { 番茄: "2", 任务: ["t2"], 计划日: before.startedAt },
  });
  const after = {
    ...before,
    revision: 1,
    task: {
      ...before.task,
      id: "p3",
      planId: "p3",
      taskId: "t2",
      title: "Target · 第 1 个番茄",
      quadrant: "inu",
    },
  };
  return { ...h, before, after };
}
test("reassign moves minutes/history/completions once; subsequent correction and another move remain valid", async () => {
  const h = moveSeed();
  const first = await h.client.correctRecord(h);
  assert.equal(h.state.plans[0].fields.实际分钟, 0);
  assert.equal(h.state.plans[0].fields.专注日期, null);
  assert.equal(h.state.plans[0].fields.已完成, false);
  assert.equal(h.state.plans[1].fields.已完成, false);
  assert.equal(h.state.plans[2].fields.实际分钟, 50);
  assert.equal(h.state.plans[3].fields.已完成, true);
  assert.deepEqual(first.record.completionOwnedPlanIds, ["p3", "p4"]);
  assert.equal((await h.client.history()).records.length, 1);
  const writes = h.state.writes.length;
  assert.deepEqual(
    (await h.client.correctRecord(h)).record,
    first.record
  );
  assert.equal(h.state.writes.length, writes);
  const corrected = await h.client.correctRecord({
    before: first.record,
    after: { ...first.record, revision: 2, completedCount: 1 },
  });
  assert.equal(h.state.plans[3].fields.已完成, false);
  const back = await h.client.correctRecord({
    before: corrected.record,
    after: { ...corrected.record, revision: 3, task: h.before.task },
  });
  assert.equal(back.record.previousTasks.length, 2);
  assert.equal((await h.client.history()).missing, 0);
  assert.equal(h.state.plans[0].fields.实际分钟, 50);
  assert.equal(h.state.plans[2].fields.实际分钟, 0);
});
test("every move write interruption, before or after application, exposes one record and retries without duplication", async () => {
  const ref = moveSeed();
  await ref.client.correctRecord(ref);
  const count = ref.state.writes.filter(
    (w) => w.method === "PUT"
  ).length;
  assert.ok(count >= 6);
  for (const failBefore of [true, false])
    for (let n = 1; n <= count; n++) {
      const h = moveSeed();
      h.state.failWrite = n;
      h.state.failBefore = failBefore;
      await assert.rejects(h.client.correctRecord(h), /interrupted/);
      const intermediate = await h.client.history();
      assert.equal(
        intermediate.records.length,
        1,
        `${n}/${failBefore}`
      );
      assert.equal(intermediate.missing, 0);
      assert.equal(intermediate.records[0].acceptedSeconds, 3000);
      const result = await h.client.correctRecord(h);
      assert.equal(result.record.task.planId, "p3");
      assert.equal(h.state.plans[0].fields.实际分钟, 0);
      assert.equal(h.state.plans[2].fields.实际分钟, 50);
      assert.equal((await h.client.history()).records.length, 1);
      assert.equal(h.state.plans.length, 4);
    }
});
test("reassign retains unrelated ledger and completion ownership, rejects concurrent and wrong-Base changes", async () => {
  const h = moveSeed();
  const other = {
    ...h.before,
    id: randomUUID(),
    acceptedSeconds: 500,
    completedCount: 1,
  };
  const row = h.state.plans[0];
  Object.assign(
    row.fields,
    mergePlan(row.fields, other, "已完成").patch
  );
  row.fields[HISTORY_FIELD] = JSON.stringify({
    version: 1,
    records: [
      historyRecord(h.before, h.key),
      historyRecord(other, h.key),
    ],
  });
  await assert.rejects(
    h.client.correctRecord({
      before: h.before,
      after: {
        ...h.after,
        task: { ...h.after.task, sourceKey: "other" },
      },
    }),
    /所属/
  );
  await h.client.correctRecord(h);
  assert.equal(row.fields.实际分钟, 500 / 60);
  assert.equal(row.fields.已完成, true);
  assert.equal((await h.client.history()).records.length, 2);
  const x = moveSeed();
  x.state.plans[0].fields.实际分钟 = 999;
  await assert.rejects(x.client.correctRecord(x), /分钟/);
  assert.equal(x.state.writes.length, 0);
});
test("interrupted task move protects its accounting from ordinary writes, while history remains readable and retry works", async () => {
  const h = moveSeed();
  h.state.failWrite = 2;
  await assert.rejects(h.client.correctRecord(h), /interrupted/);
  const writes = h.state.writes.length;
  await assert.rejects(h.client.sync(h.before), /修改尚未/);
  await assert.rejects(h.client.archiveHistory(h.before), /修改尚未/);
  await assert.rejects(h.client.completePlan("p2"), /修改尚未/);
  assert.equal(h.state.writes.length, writes);
  assert.equal((await h.client.history()).records.length, 1);
  await h.client.correctRecord(h);
  await assert.rejects(h.client.sync(h.before), /另一台/);
  assert.equal((await h.client.history()).records[0].task.planId, "p3");
});
