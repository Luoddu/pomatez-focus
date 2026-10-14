// P0-POMO-060: pure source injection; no Electron/profile/Feishu/network.
// node --test tests/preferences-api.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const filename = path.resolve(__dirname, "../app/electron/src/focus/preferences.ts");
const sourceText = fs.readFileSync(filename, "utf8");
const compiled = ts.transpileModule(sourceText, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;
const memoryModule = new Module(filename, module);
memoryModule.filename = filename;
memoryModule.paths = Module._nodeModulePaths(path.dirname(filename));
memoryModule._compile(compiled, filename);
const { PrefsRepository, PREFERENCES_TABLE, PREFERENCE_FIELDS, PREFERENCE_LIMITS,
  PREFERENCE_KEYS, WEIGHT_KEYS, validatePreferenceEntry, validatePreferenceValue, preferenceHeads } = memoryModule.exports;
const clone = value => JSON.parse(JSON.stringify(value));
const defaults = {
  weights: Object.fromEntries(WEIGHT_KEYS.map(key => [key, 1])),
  weekGoals: { "2026-10-12": 15 }, researchGoals: { "2026-10-12": 29 },
  timer: { focusMinutes: 25, restMinutes: 5 },
  rest: { quotaMinutes: 60, supervise: true, pomodoroGoal: 12, reminderMinutes: 5 },
  browser: { mode: "pause", cooldownMinutes: 2, autoRaise: true },
};
const entry = (key = "weights", extra = {}) => ({
  version: 1, id: randomUUID(), key, parents: [], value: clone(defaults[key]), at: 1791943200000, ...extra,
});
const row = (value, recordId = "rec_" + randomUUID().replace(/-/g, "")) => ({
  record_id: recordId,
  fields: { "偏好ID": value.id, "设置项": value.key, "版本内容": JSON.stringify(value) },
});
function fixture(options = {}) {
  const state = {
    origin: "bitable/v1/apps/synthetic_base", table: options.missing ? null : { name: PREFERENCES_TABLE, table_id: "tbl_preferences" },
    fields: clone(PREFERENCE_FIELDS), rows: (options.entries || []).map(value => row(value)),
    reads: [], posts: [], offline: false, recordReads: 0, beforeList: null,
    lostTable: false, failTable: false, lostRecord: false, failRecord: false,
    failReadAfterPost: false, afterPostReadFailure: false, beforePost: null,
  };
  const source = {
    root: () => state.origin,
    findTable: async (name, required) => {
      state.reads.push(["find", name, required]);
      if (state.offline) throw Error("synthetic offline");
      assert.equal(name, PREFERENCES_TABLE); assert.equal(required, false);
      return state.table ? clone(state.table) : null;
    },
    list: async route => {
      state.reads.push(["list", route]);
      if (state.offline) throw Error("synthetic offline");
      if (route.endsWith("/records")) state.recordReads++;
      if (state.beforeList) await state.beforeList(route);
      if (state.afterPostReadFailure) { state.afterPostReadFailure = false; throw Error("synthetic readback unavailable"); }
      if (route.endsWith("/fields")) return clone(state.fields);
      if (route.endsWith("/records")) return clone(state.rows);
      throw Error("unexpected fixture list");
    },
    call: async (method, route, body) => {
      assert.equal(method, "POST", "append-only transport");
      if (state.offline) throw Error("synthetic offline");
      state.posts.push({ method, route, body: clone(body) });
      if (state.beforePost) await state.beforePost(route, body);
      if (route.endsWith("/tables")) {
        if (state.failTable) throw Error("synthetic table outcome unknown");
        state.table = { table_id: "tbl_preferences", name: PREFERENCES_TABLE };
        state.fields = clone(body.table.fields);
        if (state.lostTable) { state.lostTable = false; throw Error("synthetic lost table reply"); }
        return { data: { table_id: state.table.table_id } };
      }
      assert.match(route, /\/records\?client_token=[0-9a-f-]{36}$/);
      if (state.failRecord) throw Error("synthetic record outcome unknown");
      const value = JSON.parse(body.fields["版本内容"]);
      state.rows.push({ record_id: "rec_" + state.rows.length, fields: clone(body.fields) });
      assert.equal(route.split("client_token=")[1], value.id);
      if (state.failReadAfterPost) { state.failReadAfterPost = false; state.afterPostReadFailure = true; }
      if (state.lostRecord) { state.lostRecord = false; throw Error("synthetic lost record reply"); }
      return { data: { record: state.rows[state.rows.length - 1] } };
    },
  };
  return { state, source, repo: new PrefsRepository(source, { allowCreate: options.allowCreate === true }) };
}
const recordPosts = state => state.posts.filter(call => call.route.includes("/records?"));

test("read of missing table returns empty, never creates; save requires explicit enable", async () => {
  const { repo, state } = fixture({ missing: true });
  assert.deepEqual(await repo.read(), { entries: [] });
  await assert.rejects(repo.save(entry()), /未获准/);
  assert.equal(state.posts.length, 0);
});

test("enabled first save creates exact dedicated text schema then appends full JSON with client_token=id", async () => {
  const { repo, state } = fixture({ missing: true, allowCreate: true });
  const input = entry("weights", { value: { ...defaults.weights, misc: 0.6 } });
  const original = JSON.stringify(input);
  const saved = await repo.save(input);
  assert.deepEqual(saved.entries, [validatePreferenceEntry(input)]);
  assert.equal(state.posts.length, 2);
  assert.equal(state.posts[0].body.table.name, "农场偏好");
  assert.deepEqual(state.posts[0].body.table.fields, PREFERENCE_FIELDS);
  assert.deepEqual(Object.keys(state.posts[1].body.fields).sort(), ["偏好ID", "设置项", "版本内容"].sort());
  assert.equal(state.posts[1].route.split("client_token=")[1], input.id);
  assert.equal(JSON.stringify(input), original);
  assert.equal(saved.entries[0].value.misc, 0.6);
});

test("same immutable ID is idempotent even after a successor; changed payload/clock is rejected", async () => {
  const original = entry();
  const child = entry("weights", { parents: [original.id], value: { ...defaults.weights, misc: 0.6 } });
  const { repo, state } = fixture({ entries: [original, child] });
  assert.equal((await repo.save(original)).entries.length, 2);
  assert.equal(state.posts.length, 0);
  await assert.rejects(repo.save({ ...original, value: { ...defaults.weights, misc: 0.7 } }), /不同内容/);
  await assert.rejects(repo.save({ ...original, at: original.at + 1 }), /不同内容/);
});

test("table creation lost reply reconciles through reads, never duplicates table POST", async () => {
  const { repo, state } = fixture({ missing: true, allowCreate: true });
  state.lostTable = true;
  const input = entry();
  assert.equal((await repo.save(input)).entries[0].id, input.id);
  assert.equal(state.posts.filter(call => call.route.endsWith("/tables")).length, 1);
  assert.equal(recordPosts(state).length, 1);
});

test("unknown table outcome with no visible table is not blindly replayed on the same repository", async () => {
  const { repo, state } = fixture({ missing: true, allowCreate: true });
  state.failTable = true;
  const input = entry();
  await assert.rejects(repo.save(input), /outcome unknown/);
  await assert.rejects(repo.save(input), /创建结果待确认/);
  assert.equal(state.posts.length, 1);
  assert.deepEqual(await repo.read(), { entries: [] });
});

test("record POST lost reply reconciles matching remote entry, subsequent retry stays read-only", async () => {
  const { repo, state } = fixture();
  state.lostRecord = true;
  const input = entry();
  assert.equal((await repo.save(input)).entries[0].id, input.id);
  await repo.save(input);
  assert.equal(recordPosts(state).length, 1);
});

test("lost POST and failed readback retain caller's ID; fresh repository resolves committed retry", async () => {
  const { repo, state, source } = fixture();
  state.lostRecord = true; state.failReadAfterPost = true;
  const input = entry(), before = JSON.stringify(input);
  await assert.rejects(repo.save(input), /lost record reply/);
  assert.equal(JSON.stringify(input), before);
  assert.equal((await new PrefsRepository(source).save(input)).entries[0].id, input.id);
  assert.equal(recordPosts(state).length, 1);
});

test("uncommitted record failure does not replay automatically; explicit same-ID retry uses same token", async () => {
  const { repo, state } = fixture();
  state.failRecord = true;
  const input = entry();
  await assert.rejects(repo.save(input), /record outcome unknown/);
  assert.equal(recordPosts(state).length, 1); assert.equal(state.rows.length, 0);
  state.failRecord = false;
  await repo.save(input);
  assert.equal(recordPosts(state).length, 2);
  assert.equal(recordPosts(state)[0].route, recordPosts(state)[1].route);
});

test("offline read/save surfaces errors with no writes or mutation", async () => {
  const { repo, state } = fixture(); state.offline = true;
  const input = entry(), before = JSON.stringify(input);
  await assert.rejects(repo.read(), /offline/); await assert.rejects(repo.save(input), /offline/);
  assert.equal(state.posts.length, 0); assert.equal(JSON.stringify(input), before);
});

test("stale parent, first empty parent over existing head and partial conflict parents cannot append", async () => {
  const parent = entry(), child = entry("weights", { parents: [parent.id] });
  const { repo, state } = fixture({ entries: [parent, child] });
  await assert.rejects(repo.save(entry("weights", { parents: [parent.id] })), /过期/);
  await assert.rejects(repo.save(entry()), /过期/);
  assert.equal(state.posts.length, 0);
  const sibling = entry("weights", { parents: [parent.id] }); state.rows.push(row(sibling));
  await assert.rejects(repo.save(entry("weights", { parents: [child.id] })), /全部分支/);
  assert.equal(state.posts.length, 0);
});

test("last pre-POST snapshot notices changed heads; unrelated groups do not overwrite", async () => {
  const parent = entry(), child = entry("weights", { parents: [parent.id] });
  const { repo, state } = fixture({ entries: [parent] });
  state.beforeList = route => {
    if (route.endsWith("/records") && state.recordReads === 2) state.rows.push(row(child));
  };
  await assert.rejects(repo.save(entry("weights", { parents: [parent.id] })), /过期/);
  assert.equal(state.posts.length, 0);
  state.beforeList = null;
  const timer = entry("timer"); await repo.save(timer);
  assert.equal((await repo.read()).entries.length, 3);
  assert.deepEqual(preferenceHeads((await repo.read()).entries, "weights").map(e => e.id), [child.id]);
});

test("simultaneous same-parent saves legitimately form siblings; merge consumes all heads without clock LWW", async () => {
  const parent = entry();
  const { state, source } = fixture({ entries: [parent] });
  let waiting = 0, release;
  const barrier = new Promise(resolve => { release = resolve; });
  state.beforePost = async route => {
    if (!route.includes("/records?")) return;
    if (++waiting === 2) release();
    await barrier;
  };
  const left = entry("weights", { parents: [parent.id], value: { ...defaults.weights, misc: 0.6 }, at: 20 });
  const right = entry("weights", { parents: [parent.id], value: { ...defaults.weights, misc: 0.7 }, at: 10 });
  await Promise.all([new PrefsRepository(source).save(left), new PrefsRepository(source).save(right)]);
  state.beforePost = null;
  const read = await new PrefsRepository(source).read();
  assert.equal(read.entries.length, 3);
  assert.deepEqual(preferenceHeads(read.entries, "weights").map(e => e.id).sort(), [left.id, right.id].sort());
  const merged = entry("weights", { parents: [right.id, left.id], at: 1 });
  const result = await new PrefsRepository(source).save(merged);
  assert.deepEqual(preferenceHeads(result.entries, "weights").map(e => e.id), [merged.id]);
  assert.equal(result.entries.length, 4); assert.equal(recordPosts(state).length, 3);
});

test("scope-independent read rejects foreign-key parents, missing parents and cycles in any group", async () => {
  const root = entry("timer");
  const cross = entry("browser", { parents: [root.id] });
  await assert.rejects(fixture({ entries: [root, cross] }).repo.read(), /设置项不匹配/);
  await assert.rejects(fixture({ entries: [entry("timer", { parents: [randomUUID()] })] }).repo.read(), /缺失/);
  const a = entry("rest"), b = entry("rest"); a.parents = [b.id]; b.parents = [a.id];
  await assert.rejects(fixture({ entries: [a, b] }).repo.read(), /存在环/);
});

test("save rejects foreign parents, self parents and duplicate parents before POST", async () => {
  const parent = entry("timer"), { repo, state } = fixture({ entries: [parent] });
  await assert.rejects(repo.save(entry("rest", { parents: [parent.id] })), /设置项不匹配/);
  const self = entry(); self.parents = [self.id];
  await assert.rejects(repo.save(self), /引用自身/);
  await assert.rejects(repo.save(entry("timer", { parents: [parent.id, parent.id] })), /重复/);
  assert.equal(state.posts.length, 0);
});

test("unknown entry/value/secret fields and accessors are rejected before any transport access", async () => {
  const { repo, state } = fixture();
  for (const input of [entry("weights", { token: "never copy" }), entry("weights", { sourceKey: "forbidden" }),
    entry("weights", { value: { ...defaults.weights, apiKey: "forbidden" } }),
    entry("timer", { value: { ...defaults.timer, appSecret: "forbidden" } }),
    entry("weekGoals", { value: { access_token: 10 } }),
    entry("browser", { value: { ...defaults.browser, installPath: "forbidden" } })]) {
    await assert.rejects(repo.save(input));
  }
  let getterCalled = false;
  const input = entry(); Object.defineProperty(input.value, "misc", { enumerable: true, get() { getterCalled = true; return 0.6; } });
  await assert.rejects(repo.save(input)); assert.equal(getterCalled, false);
  assert.equal(state.reads.length, 0); assert.equal(state.posts.length, 0);
});

test("all six valid groups and settings edge bounds pass, real ratios preserve 14 of 18 and 4.64", async () => {
  const { repo } = fixture();
  for (const key of PREFERENCE_KEYS) await repo.save(entry(key));
  assert.equal((await repo.read()).entries.length, 6);
  const w = validatePreferenceValue("weights", { ...defaults.weights, misc: 0.6, research: 0.58 });
  assert.equal(8 * 1 + 10 * w.misc, 14); assert.equal(Math.round(8 * w.research * 100) / 100, 4.64);
  for (const value of [{ quotaMinutes: 5, supervise: false, pomodoroGoal: 0, reminderMinutes: 1 },
    { quotaMinutes: 480, supervise: true, pomodoroGoal: 60, reminderMinutes: 60 }]) assert.deepEqual(validatePreferenceValue("rest", value), value);
  assert.equal(validatePreferenceValue("browser", { mode: "quota", cooldownMinutes: 30, autoRaise: false }).cooldownMinutes, 30);
  assert.deepEqual(validatePreferenceValue("timer", { focusMinutes: 180, restMinutes: 60 }), { focusMinutes: 180, restMinutes: 60 });
});

test("invalid setting ranges/types/schema/UUID/timestamps reject while legal zero weights/empty goals pass", () => {
  for (const [key, value] of [["weights", { ...defaults.weights, misc: 0.601 }], ["weights", { ...defaults.weights, misc: -1 }],
    ["weights", { ...defaults.weights, misc: "0.6" }], ["timer", { focusMinutes: 0, restMinutes: 5 }],
    ["timer", { focusMinutes: 25.5, restMinutes: 5 }], ["rest", { ...defaults.rest, quotaMinutes: 6 }],
    ["rest", { ...defaults.rest, supervise: 1 }], ["rest", { ...defaults.rest, pomodoroGoal: 61 }],
    ["rest", { ...defaults.rest, reminderMinutes: 0 }], ["browser", { ...defaults.browser, mode: "auto" }],
    ["browser", { ...defaults.browser, cooldownMinutes: 31 }], ["weekGoals", { "2026-10-12": 0 }],
    ["researchGoals", { "2026-10-12": 351 }]]) assert.throws(() => validatePreferenceValue(key, value));
  for (const extra of [{ version: 2 }, { id: "a" }, { id: "00000000-0000-1000-8000-000000000000" }, { at: Infinity }, { at: NaN }, { key: "secret" }])
    assert.throws(() => validatePreferenceEntry(entry("weights", extra)));
  assert.throws(() => validatePreferenceEntry(entry("weights", { parents: new Array(1) })), /UUIDv4/);
  assert.equal(validatePreferenceValue("weights", { ...defaults.weights, misc: 0 }).misc, 0);
  assert.deepEqual(validatePreferenceValue("weekGoals", {}), {});
});

test("read rejects malformed JSON, future schema, duplicate IDs/physical rows and mismatched columns", async () => {
  const first = entry();
  await assert.rejects(fixture({ entries: [first, first] }).repo.read(), /重复ID/);
  for (const mutate of [
    r => { r.fields["版本内容"] = "{"; },
    r => { r.fields["版本内容"] = JSON.stringify({ ...first, version: 2 }); },
    r => { r.fields["偏好ID"] = randomUUID(); },
    r => { r.fields["设置项"] = "timer"; },
    r => { r.fields["版本内容"] = JSON.stringify({ ...first, secret: "forbidden" }); },
    r => { delete r.record_id; },
  ]) {
    const { repo, state } = fixture({ entries: [first] }); mutate(state.rows[0]);
    await assert.rejects(repo.read()); assert.equal(state.posts.length, 0);
  }
  const { repo, state } = fixture({ entries: [first, entry("timer")] });
  state.rows[1].record_id = state.rows[0].record_id;
  await assert.rejects(repo.read(), /行标识/);
});

test("schema missing/type mismatch/duplicate names fail closed without mutating existing fields", async () => {
  for (const mutate of [fields => fields.pop(), fields => { fields[0].type = 2; }, fields => fields.push(clone(fields[0]))]) {
    const { repo, state } = fixture(); mutate(state.fields);
    await assert.rejects(repo.read()); await assert.rejects(repo.save(entry())); assert.equal(state.posts.length, 0);
  }
});

test("rich-text columns parse strictly; canonical parent/key ordering permits identical retry", async () => {
  const parent = entry("weekGoals", { value: { "2026-10-19": 10, "2026-10-12": 15 } });
  const { repo, state } = fixture({ entries: [parent] });
  for (const key of Object.keys(state.rows[0].fields)) state.rows[0].fields[key] = [{ type: "text", text: state.rows[0].fields[key] }];
  const result = await repo.save({ ...parent, value: { "2026-10-12": 15, "2026-10-19": 10 } });
  assert.deepEqual(Object.keys(result.entries[0].value), ["2026-10-12", "2026-10-19"]);
  assert.equal(state.posts.length, 0);
});

test("row/entry/total byte/goal/parent limits reject explicitly, never silently truncate", async () => {
  const { repo, state } = fixture();
  state.rows = Array.from({ length: PREFERENCE_LIMITS.rows + 1 }, () => ({}));
  await assert.rejects(repo.read(), /数量超过/);
  state.rows = [row(entry())]; state.rows[0].fields["版本内容"] = " ".repeat(PREFERENCE_LIMITS.entryBytes + 1);
  await assert.rejects(repo.read(), /超过上限/);
  state.rows = Array.from({ length: 72 }, () => {
    const r = row(entry("timer")); r.fields["版本内容"] = " ".repeat(60000) + r.fields["版本内容"]; return r;
  });
  await assert.rejects(repo.read(), /内容超过上限/);
  await assert.rejects(repo.save(entry("weights", { parents: Array.from({ length: PREFERENCE_LIMITS.parents + 1 }, randomUUID) })), /父版本列表/);
  const goals = Object.fromEntries(Array.from({ length: 513 }, (_, i) => [`${String(2000 + i).padStart(4, "0")}-01-01`, 10]));
  assert.throws(() => validatePreferenceValue("weekGoals", goals), /数量超过/);
  assert.equal(state.posts.length, 0);
});

test("source changes during async reads stop before writes and do not return cross-source entries", async () => {
  const { repo, state } = fixture({ entries: [entry()] });
  state.beforeList = route => { if (route.endsWith("/fields")) state.origin = "bitable/v1/apps/other_base"; };
  await assert.rejects(repo.read(), /来源已切换/);
  state.origin = "bitable/v1/apps/synthetic_base";
  await assert.rejects(repo.save(entry("timer")), /来源已切换/); assert.equal(state.posts.length, 0);
});

test("handoff precheck: existing bounds/official task evidence reused; only injected POST append paths", () => {
  assert.ok(!/from ["']electron["']/.test(sourceText));
  assert.ok(!/this\.source\.call\(["'](?:PUT|DELETE)["']/.test(sourceText));
  // Current: TASK-P0-POMO-060, task/p0-pomo-060-preference-sync; root-owned transport/UI.
  // Official: task's pinned Bitable v1 create-record client_token UUIDv4 evidence; no new dependency/network.
  // Helpers: activitywatch.validSettings 5..480/5, 0..60, 1..60; validBrowserPolicy 1..30; weekgoal 1..350.
  // Acceptance: journalTable/saveJournal and tests/feishu.test.cjs; this synthetic repository suite.
  // Learning: none; preserves previously verified derived data/credential and append-only boundaries.
  // Scope: preferences.ts + this test only; no profile, actual Feishu writes, commit or root-owned files.
});
