const test = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const {
  Feishu,
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const {
  JOURNAL_FIELDS,
} = require("../app/electron/build/focus/journal.js");
const { config } = require("./plan-fixture.cjs");
function fixture() {
  const state = {
    tables: [],
    rows: [],
    fields: JOURNAL_FIELDS,
    writes: [],
    lose: false,
    offline: false,
  };
  const client = new Feishu(
    { ...config },
    async (method, route, body) => {
      if (state.offline) throw Error("offline");
      if (route.startsWith("auth/"))
        return { tenant_access_token: "synthetic", expire: 7200 };
      const url = route.split("?")[0],
        list = (items) => ({
          data: { items: structuredClone(items), has_more: false },
        });
      if (method === "GET" && url.endsWith("/tables"))
        return list(state.tables);
      if (method === "GET" && url.endsWith("/fields"))
        return list(state.fields);
      if (method === "GET" && url.endsWith("/records"))
        return list(state.rows);
      state.writes.push({ method, route, body });
      if (method === "POST" && url.endsWith("/tables")) {
        state.tables.push({
          name: body.table.name,
          table_id: "journal",
        });
        return { data: {} };
      }
      if (method === "POST" && url.endsWith("/records")) {
        state.rows.push({
          record_id: "j" + state.rows.length,
          fields: structuredClone(body.fields),
        });
        if (state.lose) {
          state.lose = false;
          throw Error("lost response");
        }
        return { data: {} };
      }
      throw Error("Unexpected " + route);
    }
  );
  return { client, state };
}
const note = () => ({
  id: randomUUID(),
  sourceKey: connectionKey(config),
  at: Date.now() - 5000,
  author: "我",
  text: "Synthetic private thought",
  replyTo: "morning",
});
test("opening journal is read-only; first save creates scoped table, readback and another-computer read agree", async () => {
  const { client, state } = fixture();
  assert.deepEqual((await client.journal()).notes, []);
  assert.equal(state.writes.length, 0);
  const n = note();
  const saved = await client.saveJournal(n);
  assert.equal(saved.synced, true);
  assert.deepEqual((await client.journal()).notes, [saved]);
  assert.equal(state.writes.length, 2);
  assert.match(state.writes[1].route, /client_token=/);
  await client.saveJournal(n);
  assert.equal(state.writes.length, 2);
});
test("lost response retries same UUID without duplicate; different intent gets a new row", async () => {
  const { client, state } = fixture();
  const n = note();
  state.lose = true;
  await assert.rejects(client.saveJournal(n), /lost response/);
  await client.saveJournal(n);
  assert.equal(state.rows.length, 1);
  await client.saveJournal(note());
  assert.equal(state.rows.length, 2);
});
test("cross-Base, malformed, privileged author, incompatible schema and content conflicts cannot overwrite valid diary", async () => {
  const { client, state } = fixture();
  const n = note();
  await assert.rejects(
    client.saveJournal({ ...n, sourceKey: "b".repeat(64) }),
    /所属飞书表无效/
  );
  await assert.rejects(
    client.saveJournal({ ...n, text: "" }),
    /内容或所属/
  );
  await assert.rejects(
    client.saveJournal({ ...n, author: "澄" }),
    /只写入本人/
  );
  assert.equal(state.writes.length, 0);
  await client.saveJournal(n);
  const before = structuredClone(state.rows);
  await assert.rejects(
    client.saveJournal({ ...n, text: "changed" }),
    /不同内容/
  );
  assert.deepEqual(state.rows, before);
  state.fields = JOURNAL_FIELDS.map((f) =>
    f.field_name === "内容" ? { ...f, type: 2 } : f
  );
  await assert.rejects(client.saveJournal(note()), /字段不匹配/);
  assert.deepEqual(state.rows, before);
  state.fields = JOURNAL_FIELDS;
  assert.equal((await client.journal()).notes.length, 1);
});
