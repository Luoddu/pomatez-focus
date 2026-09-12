const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const {
  Feishu,
  connectionKey,
  validateConnection,
  sessionFields,
  SESSION_FIELDS,
} = require("../app/electron/build/focus/feishu.js");
const config = {
  appId: "test",
  appSecret: "synthetic",
  baseUrl: "https://example.feishu.cn/base/baseDemo",
  appToken: "baseDemo",
  planTable: "专注记录",
  dateField: "计划日",
  taskField: "任务",
  completedField: "已完成",
};
const now = new Date(),
  midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
function harness(options = {}) {
  const state = {
    rows: [],
    writes: [],
    lost: false,
    fail: false,
    taskFields: options.taskFields ?? [
      { field_name: "任务名称", type: 1 },
      {
        field_name: "四象限",
        type: 3,
        property: {
          options: [
            { name: "重要且紧急" },
            { name: "重要不紧急" },
            { name: "紧急不重要" },
            { name: "不紧急不重要" },
          ],
        },
      },
    ],
    taskRecords: options.taskRecords ?? [
      {
        record_id: "task1",
        fields: {
          任务名称: [{ text: "Synthetic task" }],
          四象限: "重要不紧急",
        },
      },
    ],
  };
  const request = async (method, route, body) => {
    if (state.fail) throw Error("offline");
    if (route.startsWith("auth/"))
      return { tenant_access_token: "synthetic", expire: 7200 };
    const url = route.split("?")[0];
    const items = (value) => ({
      data: { items: value, has_more: false },
    });
    if (url.endsWith("/tables"))
      return items([
        { name: "专注记录", table_id: "plans" },
        { name: "专注会话", table_id: "sessions" },
      ]);
    if (url.endsWith("/plans/fields"))
      return items([
        { field_name: "计划日", type: 5 },
        { field_name: "已完成", type: 7 },
        {
          field_name: "任务",
          type: 21,
          property: { table_id: "tasks" },
        },
      ]);
    if (url.endsWith("/tasks/fields")) return items(state.taskFields);
    if (url.endsWith("/sessions/fields")) return items(SESSION_FIELDS);
    if (url.endsWith("/plans/records"))
      return items([
        {
          record_id: "today",
          fields: {
            计划日: midnight,
            任务: options.taskLink ?? ["task1"],
            番茄: [{ text: "2" }],
          },
        },
        {
          record_id: "yesterday",
          fields: { 计划日: midnight - 86400000 },
        },
        {
          record_id: "tomorrow",
          fields: { 计划日: midnight + 86400000 },
        },
        {
          record_id: "done",
          fields: { 计划日: midnight, 已完成: true },
        },
      ]);
    if (url.endsWith("/tasks/records")) return items(state.taskRecords);
    if (url.endsWith("/sessions/records") && method === "GET")
      return state.rows.length
        ? items(
            state.rows.map((r) => ({
              ...r,
              fields: Object.fromEntries(
                Object.entries(r.fields).map(([k, v]) => [
                  k,
                  typeof v === "number" && !k.endsWith("时间")
                    ? String(v)
                    : v,
                ])
              ),
            }))
          )
        : { data: { total: 0, has_more: false } };
    if (url.endsWith("/sessions/records") && method === "POST") {
      state.writes.push({ method, route, body });
      state.rows.push({ record_id: "new", fields: body.fields });
      if (state.lost) {
        state.lost = false;
        throw Error("response lost");
      }
      return { data: { record: state.rows.at(-1) } };
    }
    throw Error(`Unexpected route ${method} ${route}`);
  };
  return {
    state,
    client: new Feishu(
      { ...config, ...(options.config || {}) },
      request
    ),
  };
}
const record = () => ({
  id: randomUUID(),
  status: "saved",
  task: {
    source: "feishu",
    sourceKey: connectionKey(config),
    title: "Synthetic",
    planId: "today",
    taskId: "task1",
  },
  startedAt: Date.now() - 1980000,
  endedAt: Date.now(),
  plannedSeconds: 1500,
  elapsedSeconds: 1980,
  acceptedSeconds: 1680,
  completedCount: 1,
});
test("connection accepts Feishu URLs and rejects foreign hosts, credentials and paths", () => {
  assert.equal(validateConnection(config).planTable, "专注记录");
  for (const baseUrl of [
    "https://evil.example/base/a",
    "http://a.feishu.cn/base/a",
    "https://a.feishu.cn.evil.example/base/a",
    "https://x@a.feishu.cn/base/a",
    "https://a.feishu.cn:4430/base/a",
    "https://a.feishu.cn/base/a/other",
  ])
    assert.throws(() => validateConnection({ ...config, baseUrl }));
});
test("today excludes yesterday/tomorrow/completed rows and resolves linked task title", async () => {
  const { client, state } = harness();
  const rows = await client.today(now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "today");
  assert.equal(rows[0].title, "Synthetic task · 第 2 个番茄");
  assert.equal(state.writes.length, 0);
});
test("v1 record_ids link objects resolve task identity, title and quadrant", async () => {
  for (const taskLink of [
    [
      {
        table_id: "tasks",
        record_ids: ["task1"],
        text: "Display fallback",
        text_arr: ["Display fallback"],
        type: "text",
      },
    ],
    { record_ids: ["task1"] },
    [{ record_id: "task1" }],
    ["task1"],
  ]) {
    const { client, state } = harness({ taskLink });
    const [row] = await client.today(now);
    assert.equal(row.taskId, "task1");
    assert.equal(row.title, "Synthetic task · 第 2 个番茄");
    assert.equal(row.quadrant, "inu");
    assert.equal(row.planId, "today");
    assert.equal(state.writes.length, 0);
  }
});
test("wrong-table and malformed link IDs are not joined while the plan stays available", async () => {
  for (const taskLink of [
    [
      {
        table_id: "different-table",
        record_ids: ["task1"],
        text: "Fallback",
      },
    ],
    [{ record_ids: [null, {}, "../task1", ""] }],
  ]) {
    const { client, state } = harness({ taskLink });
    const rows = await client.today(now);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].taskId, "");
    assert.equal(rows[0].quadrant, "unu");
    assert.equal(state.writes.length, 0);
  }
});
test("named quadrant field maps the single-select label to a quadrant key", async () => {
  const { client } = harness();
  const rows = await client.today(now);
  assert.equal(rows[0].quadrant, "inu");
  assert.equal(client.quadrantFieldResolved, "四象限");
});
test("missing quadrant field falls back to not-urgent-unimportant without failing today", async () => {
  const { client } = harness({
    taskFields: [{ field_name: "任务名称", type: 1 }],
  });
  const rows = await client.today(now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quadrant, "unu");
  assert.equal(client.quadrantFieldResolved, null);
});
test("unmatched quadrant label falls back to unu; object text form is read", async () => {
  const { client } = harness({
    taskRecords: [
      {
        record_id: "task1",
        fields: {
          任务名称: [{ text: "Synthetic task" }],
          四象限: { text: "稍后归类" },
        },
      },
    ],
  });
  const rows = await client.today(now);
  assert.equal(rows[0].quadrant, "unu");
  assert.equal(client.quadrantFieldResolved, "四象限");
});
test("empty quadrantField auto-detects a single-select field covering the four labels", async () => {
  const { client } = harness({
    config: { quadrantField: "" },
    taskFields: [
      { field_name: "任务名称", type: 1 },
      {
        field_name: "优先级",
        type: 3,
        property: {
          options: [
            { name: "重要且紧急" },
            { name: "重要不紧急" },
            { name: "紧急不重要" },
            { name: "不紧急不重要" },
          ],
        },
      },
    ],
    taskRecords: [
      {
        record_id: "task1",
        fields: {
          任务名称: [{ text: "Synthetic task" }],
          优先级: "紧急不重要",
        },
      },
    ],
  });
  const rows = await client.today(now);
  assert.equal(client.quadrantFieldResolved, "优先级");
  assert.equal(rows[0].quadrant, "uni");
});
test("auto-detect ignores single-select fields without the full label set", async () => {
  const { client } = harness({
    config: { quadrantField: "" },
    taskFields: [
      { field_name: "任务名称", type: 1 },
      {
        field_name: "状态",
        type: 3,
        property: {
          options: [{ name: "重要且紧急" }, { name: "其他" }],
        },
      },
    ],
  });
  const rows = await client.today(now);
  assert.equal(client.quadrantFieldResolved, null);
  assert.equal(rows[0].quadrant, "unu");
});

const renamedQuadrantFields = () => [
  {
    field_name: "任务象限",
    type: 3,
    property: {
      options: [
        "重要且紧急",
        "重要不紧急",
        "紧急不重要",
        "不紧急不重要",
      ].map((name) => ({ name })),
    },
  },
];
test("legacy, previous default and empty config resolve all quadrants under a different column name", async () => {
  for (const savedConfig of [
    {},
    { quadrantField: "四象限" },
    { quadrantField: "" },
  ]) {
    const { client, state } = harness({
      config: savedConfig,
      taskFields: renamedQuadrantFields(),
    });
    for (const [label, key] of Object.entries({
      重要且紧急: "iu",
      重要不紧急: "inu",
      紧急不重要: "uni",
      不紧急不重要: "unu",
    })) {
      state.taskRecords = [
        {
          record_id: "task1",
          fields: { 任务名称: "Synthetic task", 任务象限: label },
        },
      ];
      const rows = await client.today(now);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].quadrant, key);
      assert.equal(rows[0].planId, "today");
      assert.equal(rows[0].taskId, "task1");
      assert.equal(rows[0].sourceKey, connectionKey(config));
      assert.equal(client.quadrantFieldResolved, "任务象限");
      assert.equal(state.writes.length, 0);
    }
  }
});

test("ambiguous auto-detection leaves the plan available and falls back to unu", async () => {
  const { client, state } = harness({
    taskFields: [
      ...renamedQuadrantFields(),
      { ...renamedQuadrantFields()[0], field_name: "其他象限" },
    ],
  });
  const rows = await client.today(now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quadrant, "unu");
  assert.equal(client.quadrantFieldResolved, null);
  assert.equal(state.writes.length, 0);
});

test("explicit field wins over other candidates and an incorrect custom field is not guessed", async () => {
  const { client, state } = harness({
    config: { quadrantField: "指定字段" },
    taskFields: [
      ...renamedQuadrantFields(),
      { ...renamedQuadrantFields()[0], field_name: "指定字段" },
    ],
    taskRecords: [
      {
        record_id: "task1",
        fields: {
          任务名称: "Synthetic",
          任务象限: "重要且紧急",
          指定字段: "紧急不重要",
        },
      },
    ],
  });
  assert.equal((await client.today(now))[0].quadrant, "uni");
  assert.equal(client.quadrantFieldResolved, "指定字段");
  client.config.quadrantField = "不存在的自定义字段";
  const rows = await client.today(now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quadrant, "unu");
  assert.equal(client.quadrantFieldResolved, null);
  assert.equal(state.writes.length, 0);
});
test("confirmed duration/count sync exactly; repeated and concurrent sync create one row", async () => {
  const { client, state } = harness(),
    r = record();
  await client.setup();
  await Promise.all([client.sync(r), client.sync(r)]);
  await client.sync(r);
  assert.equal(state.writes.length, 1);
  assert.equal(state.rows[0].fields["实际分钟"], 28);
  assert.equal(state.rows[0].fields["完成番茄数"], 1);
  assert.match(state.writes[0].route, /client_token=/);
  assert.ok(
    state.writes.every((w) => w.route.includes("/sessions/records"))
  );
});
test("lost write response is reconciled before retry; no duplicate side effect", async () => {
  const { client, state } = harness(),
    r = record();
  state.lost = true;
  await assert.rejects(client.sync(r), /response lost/);
  await client.sync(r);
  assert.equal(state.writes.length, 1);
});
test("offline fails without mutating the local record; retry succeeds", async () => {
  const { client, state } = harness(),
    r = record(),
    before = structuredClone(r);
  state.fail = true;
  await assert.rejects(client.sync(r), /offline/);
  assert.deepEqual(r, before);
  state.fail = false;
  await client.sync(r);
  assert.equal(state.writes.length, 1);
});
test("wrong destination and conflicting existing content cannot overwrite; original still syncs", async () => {
  const { client, state } = harness(),
    r = record();
  await assert.rejects(
    client.sync({ ...r, task: { ...r.task, sourceKey: "other" } })
  );
  await client.sync(r);
  await assert.rejects(
    client.sync({ ...r, acceptedSeconds: 1500 }),
    /不一致/
  );
  await client.sync(r);
  assert.equal(state.writes.length, 1);
});
test("malformed durations/counts rejected and valid zero completion retained", () => {
  const r = record();
  assert.equal(
    sessionFields({ ...r, completedCount: 0 })["完成番茄数"],
    0
  );
  for (const patch of [
    { acceptedSeconds: Infinity },
    { acceptedSeconds: 2000 },
    { completedCount: 0.5 },
    { endedAt: r.startedAt - 1 },
    { status: "active" },
    { id: "not-a-uuid" },
  ])
    assert.throws(() => sessionFields({ ...r, ...patch }));
});

// ── 生成今日番茄（移植 Invoke-FeishuTodayPomodoroGeneration.ps1 的口径） ──
function generateHarness(options = {}) {
  const state = {
    created: [],
    plans: options.plans ?? [],
    taskFields: options.taskFields ?? [
      { field_name: "任务名称", type: 1 },
      { field_name: "计划日", type: 5 },
      { field_name: "今日计划番茄数", type: 2 },
    ],
    taskRecords: options.taskRecords ?? [],
  };
  const request = async (method, route, body) => {
    if (route.startsWith("auth/"))
      return { tenant_access_token: "synthetic", expire: 7200 };
    const url = route.split("?")[0];
    const items = (value) => ({ data: { items: value, has_more: false } });
    if (url.endsWith("/tables"))
      return items([
        { name: "专注记录", table_id: "plans" },
        { name: "任务", table_id: "tasks" },
      ]);
    if (url.endsWith("/plans/fields"))
      return items([
        { field_name: "计划日", type: 5 },
        { field_name: "已完成", type: 7 },
        { field_name: "番茄", type: 1 },
        {
          field_name: "任务",
          type: 21,
          property: { table_id: "tasks" },
        },
      ]);
    if (url.endsWith("/tasks/fields")) return items(state.taskFields);
    if (url.endsWith("/tasks/records")) return items(state.taskRecords);
    if (url.endsWith("/plans/records") && method === "GET")
      return items(state.plans);
    if (url.endsWith("/plans/records/batch_create") && method === "POST") {
      const made = body.records.map((r, i) => ({
        record_id: `new${state.created.length + i}`,
        fields: r.fields,
      }));
      state.created.push(...made);
      state.plans.push(...made);
      return { data: { records: made } };
    }
    throw Error(`Unexpected route ${method} ${route}`);
  };
  return {
    state,
    client: new Feishu({ ...config, ...(options.config || {}) }, request),
  };
}
const plannedTask = (id, count, date = midnight) => ({
  record_id: id,
  fields: {
    任务名称: [{ text: `Task ${id}` }],
    计划日: date,
    今日计划番茄数: count,
  },
});
test("generateToday creates only missing pomodoros and a rerun is idempotent", async () => {
  const { client, state } = generateHarness({
    taskRecords: [
      plannedTask("t1", 2),
      plannedTask("t2", 1),
      plannedTask("t3", 5, midnight - 86400000),
    ],
    plans: [
      {
        record_id: "x1",
        fields: { 计划日: midnight, 任务: ["t1"], 番茄: [{ text: "1" }] },
      },
    ],
  });
  const first = await client.generateToday(now);
  assert.equal(first.created, 2);
  assert.equal(first.desired, 3);
  assert.equal(first.alreadyPresent, 1);
  assert.equal(first.blocked, 0);
  const keys = state.created
    .map((r) => `${r.fields["任务"][0]}|${r.fields["番茄"]}`)
    .sort();
  assert.deepEqual(keys, ["t1|2", "t2|1"]);
  for (const r of state.created) assert.equal(r.fields["计划日"], midnight);
  const second = await client.generateToday(now);
  assert.equal(second.created, 0);
  assert.equal(second.alreadyPresent, 3);
  assert.equal(state.created.length, 2);
});
test("generateToday rejects invalid today counts without writing", async () => {
  const { client, state } = generateHarness({
    taskRecords: [plannedTask("t1", 2.5)],
  });
  await assert.rejects(() => client.generateToday(now), /不是 0–50 的整数/);
  assert.equal(state.created.length, 0);
});
test("generateToday reports a missing or ambiguous count field instead of creating it", async () => {
  const missing = generateHarness({
    taskFields: [
      { field_name: "任务名称", type: 1 },
      { field_name: "计划日", type: 5 },
    ],
    taskRecords: [plannedTask("t1", 2)],
  });
  await assert.rejects(() => missing.client.generateToday(now), /缺少「今日计划番茄数」/);
  const ambiguous = generateHarness({
    taskFields: [
      { field_name: "任务名称", type: 1 },
      { field_name: "计划日", type: 5 },
      { field_name: "今日计划番茄数", type: 2 },
      { field_name: "今日番茄数", type: 2 },
    ],
    taskRecords: [plannedTask("t1", 2)],
  });
  await assert.rejects(() => ambiguous.client.generateToday(now), /只保留一个/);
  const legacy = generateHarness({
    taskFields: [
      { field_name: "任务名称", type: 1 },
      { field_name: "计划日", type: 5 },
      { field_name: "今日番茄数", type: 2 },
    ],
    taskRecords: [
      {
        record_id: "t1",
        fields: {
          任务名称: "Task t1",
          计划日: midnight,
          今日番茄数: 1,
        },
      },
    ],
  });
  const result = await legacy.client.generateToday(now);
  assert.equal(result.created, 1);
  assert.equal(result.fieldResolution, "legacy");
});
test("generateToday isolates tasks with multi-linked or duplicate-keyed records", async () => {
  const { client, state } = generateHarness({
    taskRecords: [plannedTask("t1", 2), plannedTask("t2", 1)],
    plans: [
      {
        record_id: "x1",
        fields: { 计划日: midnight, 任务: ["t1", "t2"], 番茄: "1" },
      },
    ],
  });
  const result = await client.generateToday(now);
  assert.equal(result.blocked, 2);
  assert.equal(result.created, 0);
  const dup = generateHarness({
    taskRecords: [plannedTask("t1", 2)],
    plans: [
      { record_id: "x1", fields: { 计划日: midnight, 任务: ["t1"], 番茄: "1" } },
      { record_id: "x2", fields: { 计划日: midnight, 任务: ["t1"], 番茄: "1" } },
    ],
  });
  const dupResult = await dup.client.generateToday(now);
  assert.equal(dupResult.blocked, 1);
  assert.equal(dupResult.created, 0);
});

// ── 已收 x/y 聚合与悬浮 ± 调整（补建行/删行口径） ──
const { clientToken, dateKeyOf } = require("../app/electron/build/focus/generate.js");
function adjustHarness(options = {}) {
  const state = {
    created: [],
    deleted: [],
    plans: options.plans ?? [],
    persistCreate: options.persistCreate ?? true,
    persistDelete: options.persistDelete ?? true,
  };
  const request = async (method, route, body) => {
    if (route.startsWith("auth/"))
      return { tenant_access_token: "synthetic", expire: 7200 };
    const url = route.split("?")[0];
    const items = (value) => ({ data: { items: value, has_more: false } });
    if (url.endsWith("/tables"))
      return items([
        { name: "专注记录", table_id: "plans" },
        { name: "任务", table_id: "tasks" },
      ]);
    if (url.endsWith("/plans/fields"))
      return items([
        { field_name: "计划日", type: 5 },
        { field_name: "已完成", type: 7 },
        { field_name: "番茄", type: 1 },
        {
          field_name: "任务",
          type: 21,
          property: { table_id: "tasks" },
        },
      ]);
    if (url.endsWith("/tasks/fields"))
      return items([
        { field_name: "任务名称", type: 1 },
        {
          field_name: "四象限",
          type: 3,
          property: {
            options: [
              { name: "重要且紧急" },
              { name: "重要不紧急" },
              { name: "紧急不重要" },
              { name: "不紧急不重要" },
            ],
          },
        },
      ]);
    if (url.endsWith("/tasks/records"))
      return items([
        {
          record_id: "t1",
          fields: { 任务名称: [{ text: "写周报" }], 四象限: "重要且紧急" },
        },
      ]);
    if (url.endsWith("/plans/records") && method === "GET")
      return items(state.plans);
    if (url.endsWith("/plans/records") && method === "POST") {
      const record = {
        record_id: `new${state.created.length}`,
        fields: body.fields,
      };
      state.created.push({ ...record, route });
      if (state.persistCreate) state.plans.push(record);
      return { data: { record } };
    }
    const del = url.match(/\/plans\/records\/([A-Za-z0-9_-]+)$/);
    if (del && method === "DELETE") {
      state.deleted.push(del[1]);
      if (state.persistDelete)
        state.plans = state.plans.filter((r) => r.record_id !== del[1]);
      return { data: {} };
    }
    throw Error(`Unexpected route ${method} ${route}`);
  };
  return {
    state,
    client: new Feishu({ ...config, ...(options.config || {}) }, request),
  };
}
const planRow = (id, seq, extra = {}) => ({
  record_id: id,
  fields: {
    计划日: midnight,
    任务: ["t1"],
    番茄: [{ text: String(seq) }],
    ...extra,
  },
});
const ledgerRow = (id, seq, seconds) => ({
  record_id: id,
  fields: {
    计划日: midnight,
    任务: ["t1"],
    番茄: [{ text: String(seq) }],
    专注同步明细: JSON.stringify({
      version: 1,
      target: 1500,
      entries: [
        {
          id: randomUUID(),
          start: midnight,
          end: midnight + seconds * 1000,
          seconds,
          elapsed: seconds,
          spans: [{ start: midnight, end: midnight + seconds * 1000 }],
          count: 0,
        },
      ],
    }),
  },
});

test("today attaches harvest counts; partial completion stays a normal row", async () => {
  const { client } = adjustHarness({
    plans: [planRow("p1", 1, { 已完成: true }), planRow("p2", 2)],
  });
  const rows = await client.today(now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "p2");
  assert.equal(rows[0].doneToday, 1);
  assert.equal(rows[0].plannedToday, 2);
  assert.equal(rows[0].kind, undefined);
});

test("ledger-complete rows count as harvested even without the checkbox", async () => {
  const { client } = adjustHarness({
    plans: [ledgerRow("p1", 1, 1500), planRow("p2", 2)],
  });
  // 未勾选的行仍留在待办列表（现有行为），但台账达标计入“已收”
  const rows = await client.today(now);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].doneToday, 1);
  assert.equal(rows[0].plannedToday, 2);
  assert.equal(rows[1].doneToday, 1);
});

test("fully completed task stays visible as a done placeholder row", async () => {
  const { client } = adjustHarness({
    plans: [planRow("p1", 1, { 已完成: true }), planRow("p2", 2, { 已完成: true })],
  });
  const rows = await client.today(now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "done");
  assert.equal(rows[0].taskId, "t1");
  assert.equal(rows[0].title, "写周报");
  assert.equal(rows[0].quadrant, "iu");
  assert.equal(rows[0].doneToday, 2);
  assert.equal(rows[0].plannedToday, 2);
});

test("adjust +1 creates the next sequence with the generator idempotency key", async () => {
  const { client, state } = adjustHarness({
    plans: [planRow("p1", 1, { 已完成: true }), planRow("p2", 2)],
  });
  const result = await client.adjustToday("t1", 1, now);
  assert.equal(result.action, "added");
  assert.equal(result.sequence, 3);
  assert.equal(state.created.length, 1);
  assert.equal(state.created[0].fields["番茄"], "3");
  assert.deepEqual(state.created[0].fields["任务"], ["t1"]);
  assert.equal(state.created[0].fields["计划日"], midnight);
  const expected = clientToken(
    `today-pomodoro-create|baseDemo|t1|${dateKeyOf(midnight)}|3`
  );
  assert.ok(state.created[0].route.includes(`client_token=${expected}`));
  // 再 +1 递增到 4
  const again = await client.adjustToday("t1", 1, now);
  assert.equal(again.sequence, 4);
  assert.equal(state.created.length, 2);
});

test("adjust +1 readback failure throws after a single create call", async () => {
  const { client, state } = adjustHarness({
    plans: [planRow("p1", 1)],
    persistCreate: false,
  });
  await assert.rejects(() => client.adjustToday("t1", 1, now), /回读校验/);
  assert.equal(state.created.length, 1);
});

test("adjust +1 enforces the per-task daily cap", async () => {
  const { client, state } = adjustHarness({ plans: [planRow("p1", 50)] });
  await assert.rejects(() => client.adjustToday("t1", 1, now), /最多 50/);
  assert.equal(state.created.length, 0);
});

test("adjust -1 removes only the highest uncompleted and untimed row", async () => {
  const { client, state } = adjustHarness({
    plans: [
      planRow("p1", 1, { 已完成: true }),
      ledgerRow("p2", 2, 300),
      planRow("p3", 3),
    ],
  });
  const result = await client.adjustToday("t1", -1, now);
  assert.equal(result.action, "removed");
  assert.equal(result.sequence, 3);
  assert.deepEqual(state.deleted, ["p3"]);
  // 剩余：已完成 + 已有专注分钟，都不可减
  await assert.rejects(
    () => client.adjustToday("t1", -1, now),
    /没有可减去的待办番茄/
  );
  assert.deepEqual(state.deleted, ["p3"]);
});

test("adjust -1 refuses when nothing is removable and never deletes", async () => {
  const { client, state } = adjustHarness({
    plans: [planRow("p1", 1, { 已完成: true })],
  });
  await assert.rejects(
    () => client.adjustToday("t1", -1, now),
    /没有可减去的待办番茄/
  );
  assert.deepEqual(state.deleted, []);
});

test("adjust -1 throws when the deleted row still reads back", async () => {
  const { client, state } = adjustHarness({
    plans: [planRow("p1", 1)],
    persistDelete: false,
  });
  await assert.rejects(() => client.adjustToday("t1", -1, now), /回读/);
  assert.deepEqual(state.deleted, ["p1"]);
});

test("adjust validates task id and delta before any request", async () => {
  const { client, state } = adjustHarness();
  await assert.rejects(
    () => client.adjustToday("../t1", 1, now),
    /格式错误/
  );
  await assert.rejects(() => client.adjustToday("t1", 0, now), /无效/);
  await assert.rejects(() => client.adjustToday("t1", 2, now), /无效/);
  assert.equal(state.created.length, 0);
  assert.equal(state.deleted.length, 0);
});
