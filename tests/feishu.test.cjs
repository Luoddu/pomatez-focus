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
function harness() {
  const state = { rows: [], writes: [], lost: false, fail: false };
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
    if (url.endsWith("/sessions/fields")) return items(SESSION_FIELDS);
    if (url.endsWith("/plans/records"))
      return items([
        {
          record_id: "today",
          fields: {
            计划日: midnight,
            任务: ["task1"],
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
    if (url.endsWith("/tasks/records"))
      return items([
        {
          record_id: "task1",
          fields: { 任务名称: [{ text: "Synthetic task" }] },
        },
      ]);
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
  return { state, client: new Feishu({ ...config }, request) };
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
