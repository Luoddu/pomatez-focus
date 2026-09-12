const assert = require("node:assert/strict"),
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
const config = {
  appId: "synthetic",
  appSecret: "synthetic",
  appToken: "demo",
  baseUrl: "https://example.feishu.cn/base/demo",
  planTable: "专注记录",
  dateField: "计划日",
  taskField: "任务",
  completedField: "已完成",
};
const day = new Date().setHours(0, 0, 0, 0);
function harness() {
  const state = {
    writes: [],
    lose: false,
    fail: false,
    fields: [
      { field_name: "番茄", type: 1, is_primary: true },
      { field_name: "计划日", type: 5 },
      { field_name: "已完成", type: 7 },
      { field_name: "任务", type: 21, property: { table_id: "tasks" } },
      ...PLAN_FIELDS,
    ],
    plans: [
      {
        record_id: "p1",
        fields: {
          番茄: "1",
          计划日: day,
          任务: [
            { table_id: "tasks", record_ids: ["t1"], text: "Fallback" },
          ],
          进展: "keep",
        },
      },
      {
        record_id: "p2",
        fields: {
          番茄: "2",
          计划日: day,
          任务: ["t1"],
          进展: "untouched",
        },
      },
    ],
    tasks: [
      {
        record_id: "t1",
        fields: { 任务名称: "Synthetic task", 象限: "重要且紧急" },
      },
    ],
  };
  let seq = 0;
  const client = new Feishu(
    { ...config },
    async (method, route, body) => {
      if (state.fail) throw Error("offline");
      if (route.startsWith("auth/"))
        return { tenant_access_token: "synthetic", expire: 7200 };
      const url = route.split("?")[0],
        items = (x) => ({
          data: { items: structuredClone(x), has_more: false },
        });
      if (method === "GET" && url.endsWith("/tables"))
        return items([{ name: config.planTable, table_id: "plans" }]);
      if (method === "GET" && url.endsWith("/plans/fields"))
        return items(state.fields);
      if (method === "GET" && url.endsWith("/tasks/fields"))
        return items([
          { field_name: "任务名称", type: 1, is_primary: true },
          {
            field_name: "象限",
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
        ]);
      const bucket = url.includes("/tables/plans/")
        ? state.plans
        : state.tasks;
      if (method === "GET" && url.endsWith("/records"))
        return items(bucket);
      if (method === "GET" && /\/records\/[^/]+$/.test(url))
        return {
          data: {
            record: structuredClone(
              bucket.find((r) => r.record_id === url.split("/").pop())
            ),
          },
        };
      if (method === "POST" && url.endsWith("/plans/fields")) {
        state.writes.push({ method, route, body });
        state.fields.push(structuredClone(body));
        return { data: { field: body } };
      }
      if (method === "PUT" && url.includes("/plans/records/")) {
        const row = state.plans.find(
          (r) => r.record_id === url.split("/").pop()
        );
        assert.ok(row);
        if (state.failPut && state.failPut.has(row.record_id))
          throw Error("write rejected");
        Object.assign(row.fields, structuredClone(body.fields));
        state.writes.push({
          method,
          route,
          body: structuredClone(body),
        });
        if (state.lose) {
          state.lose = false;
          throw Error("lost response");
        }
        return { data: { record: row } };
      }
      if (method === "POST" && url.endsWith("/records")) {
        assert.match(route, /client_token=/);
        const row = {
          record_id: "new" + ++seq,
          fields: structuredClone(body.fields),
        };
        bucket.push(row);
        state.writes.push({
          method,
          route,
          body: structuredClone(body),
        });
        if (state.lose && bucket === state.plans) {
          state.lose = false;
          throw Error("lost response");
        }
        return { data: { record: structuredClone(row) } };
      }
      throw Error("Unexpected route " + method + " " + url);
    }
  );
  return { state, client };
}
function record(seconds = 720, extra = {}) {
  const end = Date.now() - 1000,
    start = end - seconds * 1000;
  return {
    id: randomUUID(),
    status: "saved",
    syncTarget: "plan",
    task: {
      id: "p1",
      planId: "p1",
      taskId: "t1",
      source: "feishu",
      sourceKey: connectionKey(config),
      title: "Synthetic",
    },
    startedAt: start,
    endedAt: end,
    elapsedSeconds: seconds,
    acceptedSeconds: seconds,
    plannedSeconds: 1500,
    completedCount: 0,
    segments: [{ start, end }],
    ...extra,
  };
}

module.exports = { harness, record, config };
