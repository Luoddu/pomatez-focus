const test = require("node:test"),
  assert = require("node:assert/strict");
const { harness, record, config } = require("./plan-fixture.cjs");
const {
  Feishu,
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const {
  HISTORY_FIELD,
  historyRecord,
  readHistory,
} = require("../app/electron/build/focus/history.js");
const {
  dailyReviews,
} = require("../app/electron/build/focus/reviews.js");
const key = connectionKey(config);
test("manual color writes only metadata; lost response retry, reset and new-computer read keep accounting", async () => {
  const { client, state } = harness();
  const r = record(1500, { completedCount: 1 });
  const receipt = await client.sync(r);
  await client.archiveHistory({
    ...r,
    sync: "synced",
    syncedPlanId: receipt.planId,
  });
  const before = (await client.history()).records[0];
  const unchanged = state.plans.map((row) => {
    const f = { ...row.fields };
    delete f[HISTORY_FIELD];
    return f;
  });
  const after = {
    ...before,
    colorRevision: 1,
    colorOverride: "research",
  };
  state.writes = [];
  state.lose = true;
  await assert.rejects(
    client.recolorRecord({ before, after }),
    /lost response/
  );
  await client.recolorRecord({ before, after });
  assert.equal(state.writes.length, 1);
  assert.deepEqual(Object.keys(state.writes[0].body.fields), [
    HISTORY_FIELD,
  ]);
  assert.equal(
    JSON.parse(state.plans[0].fields[HISTORY_FIELD]).version,
    2
  );
  await client.archiveHistory(before); // old unchanged session may not erase metadata
  assert.equal(
    (await client.history()).records[0].colorOverride,
    "research"
  );
  const recolored = (await client.history()).records[0];
  await assert.rejects(
    client.recolorRecord({
      before,
      after: { ...after, colorOverride: "delivery" },
    }),
    /另一台/
  );
  await assert.rejects(
    client.recolorRecord({
      before: recolored,
      after: { ...recolored, colorRevision: 2, acceptedSeconds: 10 },
    }),
    /不能/
  );
  const reset = { ...recolored, colorRevision: 2 };
  delete reset.colorOverride;
  await client.recolorRecord({ before: recolored, after: reset });
  assert.equal(
    (await client.history()).records[0].colorOverride,
    undefined
  );
  assert.equal((await client.history()).records[0].colorRevision, 2);
  state.plans.forEach((row, i) => {
    const f = { ...row.fields };
    delete f[HISTORY_FIELD];
    assert.deepEqual(f, unchanged[i]);
  });
  assert.equal((await client.history()).records.length, 1);
  assert.equal(
    (await client.history()).records[0].acceptedSeconds,
    1500
  );
  assert.throws(
    () => readHistory(JSON.stringify({ version: 3, records: [] }), key),
    /格式/
  );
  assert.throws(
    () => historyRecord({ ...r, colorOverride: "research" }, key),
    /分类/
  );
});
test("review schema reads only daily summary with Beijing date, no writes; ambiguous and invalid rows omitted", async () => {
  const stamp = Date.parse("2026-09-25T16:00:00Z");
  const rows = [
    {
      fields: {
        周期类型: "日",
        周期开始: stamp,
        进展与卡点: "模拟当日复盘",
      },
    },
    {
      fields: {
        周期类型: "周",
        周期开始: stamp,
        进展与卡点: "不应作为日复盘",
      },
    },
    {
      fields: {
        周期类型: "日",
        周期开始: 1e100,
        进展与卡点: "无效日期",
      },
    },
  ];
  assert.deepEqual(dailyReviews(rows), {
    "2026-09-26": "模拟当日复盘",
  });
  assert.deepEqual(dailyReviews([...rows, rows[0]]), {});
  const { client: base, state } = harness();
  const calls = [];
  const items = (x) => ({ data: { items: x, has_more: false } });
  const client = new Feishu(
    { ...config },
    async (method, route, body, token) => {
      calls.push(method);
      const p = route.split("?")[0];
      if (method === "GET" && p.endsWith("/tables"))
        return items([{ name: "安排与复盘", table_id: "reviews" }]);
      if (method === "GET" && p.endsWith("/reviews/fields"))
        return items([
          { field_name: "周期类型", type: 1 },
          { field_name: "周期开始", type: 5 },
          { field_name: "进展与卡点", type: 1 },
        ]);
      if (method === "GET" && p.endsWith("/reviews/records"))
        return items(rows);
      return base.request(method, route, body, token);
    }
  );
  assert.deepEqual(await client.dailyReviews(), {
    sourceKey: key,
    summaries: { "2026-09-26": "模拟当日复盘" },
  });
  assert.equal(state.writes.length, 0);
  assert.ok(calls.every((m) => m === "GET" || m === "POST"));
});
