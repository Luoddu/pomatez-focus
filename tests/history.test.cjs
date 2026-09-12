const test = require("node:test"),
  assert = require("node:assert/strict");
const { harness, record, config } = require("./plan-fixture.cjs");
const {
  Feishu,
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const {
  HISTORY_FIELD,
} = require("../app/electron/build/focus/history.js");
const { ledgerField } = require("../app/electron/build/focus/plan.js");
const key = connectionKey(config);
const saved = (r, receipt) => ({
  ...r,
  sync: "synced",
  syncedPlanId: receipt.planId,
});
test("A and B share exact user counts; repeat metadata migration never writes minutes or completion", async () => {
  const { client: a, state } = harness(),
    b = new Feishu({ ...config }, a.request);
  const r = record(4500, { completedCount: 3 });
  const receipt = await a.sync(r),
    before = structuredClone(state.plans),
    writes = state.writes.length;
  await a.archiveHistory(saved(r, receipt));
  const history = await b.history();
  assert.equal(history.records.length, 1);
  assert.equal(history.records[0].completedCount, 3);
  assert.equal(history.missing, 0);
  for (const write of state.writes
    .slice(writes)
    .filter((w) => w.method === "PUT"))
    assert.deepEqual(Object.keys(write.body.fields), [HISTORY_FIELD]);
  state.plans.forEach((row, i) => {
    const fields = { ...row.fields };
    delete fields[HISTORY_FIELD];
    assert.deepEqual(fields, before[i].fields);
  });
  const count = state.writes.length;
  await a.archiveHistory(saved(r, receipt));
  assert.equal(state.writes.length, count);
  const second = record(720, { completedCount: 0 });
  await b.archiveHistory(saved(second, await b.sync(second)));
  const again = await a.history();
  assert.equal(again.records.length, 2);
  assert.equal(
    again.records.reduce((n, r) => n + r.acceptedSeconds, 0),
    5220
  );
});
test("old ledger explicitly reports missing full history, and backfill retains original count", async () => {
  const { client } = harness(),
    r = record(720, { completedCount: 2 });
  const receipt = await client.sync(r);
  assert.equal((await client.history()).missing, 1);
  await client.archiveHistory(saved(r, receipt));
  assert.equal((await client.history()).records[0].completedCount, 2);
});
test("local free history binds once; lost metadata response retries without new rows or extra minutes", async () => {
  const { client, state } = harness();
  const local = record(720, {
    sync: "local",
    task: {
      id: "local-task",
      source: "local",
      title: "自由番茄",
      kind: "free",
    },
  });
  const first = await client.archiveHistory(local),
    rows = state.plans.length;
  await client.archiveHistory(local);
  assert.equal(state.plans.length, rows);
  assert.equal((await client.history()).records[0].id, local.id);
  const r = record(500),
    receipt = await client.sync(r);
  state.lose = true;
  await assert.rejects(
    client.archiveHistory(saved(r, receipt)),
    /lost response/
  );
  const minutes = state.plans[0].fields["实际分钟"];
  await client.archiveHistory(saved(r, receipt));
  assert.equal(state.plans[0].fields["实际分钟"], minutes);
  assert.ok(first.cloudSynced);
});
test("offline and foreign Base do not lose records; valid retry still works", async () => {
  const { client, state } = harness(),
    r = record(),
    receipt = await client.sync(r);
  state.fail = true;
  await assert.rejects(
    client.archiveHistory(saved(r, receipt)),
    /offline/
  );
  state.fail = false;
  const before = state.writes.length;
  await assert.rejects(
    client.archiveHistory({
      ...saved(r, receipt),
      task: { ...r.task, sourceKey: "foreign" },
    }),
    /所属飞书表/
  );
  assert.equal(state.writes.length, before);
  await client.archiveHistory(saved(r, receipt));
  assert.equal((await client.history()).records.length, 1);
});
test("changed same-ID count, corrupted cloud and duplicated cross-row identity are rejected", async () => {
  const { client, state } = harness(),
    r = record(),
    s = saved(r, await client.sync(r));
  await client.archiveHistory(s);
  const before = state.writes.length;
  await assert.rejects(
    client.archiveHistory({ ...s, completedCount: 3 }),
    /内容不同/
  );
  assert.equal(state.writes.length, before);
  const good = state.plans[0].fields[HISTORY_FIELD];
  state.plans[0].fields[HISTORY_FIELD] = "broken";
  await assert.rejects(client.history(), /无法解析/);
  state.plans[0].fields[HISTORY_FIELD] = good;
  state.plans[1].fields[HISTORY_FIELD] = good;
  await assert.rejects(client.history(), /重复专注 ID/);
  delete state.plans[1].fields[HISTORY_FIELD];
  assert.equal((await client.history()).records.length, 1);
});
test("metadata migration cannot fabricate an already-accounted record", async () => {
  const { client, state } = harness(),
    r = record();
  const before = state.writes.length;
  await assert.rejects(
    client.archiveHistory({ ...r, sync: "synced" }),
    /记账与本机历史/
  );
  assert.equal(state.writes.length, before);
  assert.equal(state.plans[0].fields[ledgerField], undefined);
});

test('legacy session backfill only adds metadata to its existing original plan', async () => {
  const { client, state } = harness();
  const old = record(3600, { completedCount: 3, syncTarget: undefined, sync: 'synced' });
  const { sessionFields } = require('../app/electron/build/focus/feishu.js');
  const original = client.request;
  client.request = async (method, route, body, token) => {
    if (method === 'GET' && route.split('?')[0].endsWith('/tables')) {
      const response = await original(method, route, body, token);
      response.data.items.push({ name: '专注会话', table_id: 'legacy' });
      return response;
    }
    if (method === 'GET' && route.split('?')[0].endsWith('/legacy/records'))
      return { data: { items: [{ record_id: 'legacy1', fields: sessionFields(old) }], has_more: false } };
    return original(method, route, body, token);
  };
  const archived = await client.archiveHistory(old);
  assert.equal(archived.completedCount, 3);
  assert.equal(state.plans[0].fields['实际分钟'], undefined);
  assert.equal(state.plans[0].fields['已完成'], undefined);
  assert.equal((await client.history()).records[0].completedCount, 3);
});

test('changed task relation and incompatible history field reject while original data is preserved', async () => {
  const { client, state } = harness(), r = record();
  const s = saved(r, await client.sync(r));
  const before = state.writes.length;
  state.plans[0].fields['任务'] = ['other'];
  await assert.rejects(client.archiveHistory(s), /关联任务已改变/);
  state.plans[0].fields['任务'] = ['t1'];
  state.fields.push({ field_name: HISTORY_FIELD, type: 2 });
  await assert.rejects(client.archiveHistory(s), /必须是文本/);
  assert.equal(state.writes.length, before);
  state.fields.pop();
  await client.archiveHistory(s);
  assert.equal((await client.history()).records.length, 1);
});