// Assertions mirror Invoke-SelfTest in
// integrations/feishu/Invoke-FeishuTodayPomodoroGeneration.ps1 (schema_version 4).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveTodayCountField,
  integerFieldState,
  localDayOf,
  dayStart,
  dateKeyOf,
  pomodoroSequence,
  collectTaskPlans,
  scanExisting,
  pomodoroPlan,
  clientToken,
} = require("../app/electron/build/focus/generate.js");

const dateKey = "2026-08-14";
const dayMs = dayStart(new Date(2026, 7, 14));
const linkIds = (v) =>
  (Array.isArray(v) ? v : [v])
    .flatMap((x) => (typeof x === "string" ? [x] : x?.record_ids || []))
    .filter(Boolean);

test("plan diff matches the PowerShell self-test baseline", () => {
  const plans = [
    { recordId: "recA", count: 3 },
    { recordId: "recB", count: 2 },
  ];
  const existing = new Map([[`recA|${dateKey}|1`, 1]]);
  const blocked = new Set();
  const plan = pomodoroPlan(plans, existing, blocked, dateKey);
  assert.equal(plan.desired, 5);
  assert.equal(plan.alreadyPresent, 1);
  assert.equal(plan.specs.length, 4);
  // daily capacity is advisory only
  const capacity = 4;
  assert.ok(plan.desired > capacity);
  assert.equal(Math.max(0, plan.desired - capacity), 1);
  // rerun is idempotent once every generated key exists
  for (const spec of plan.specs) existing.set(spec.key, 1);
  const rerun = pomodoroPlan(plans, existing, blocked, dateKey);
  assert.equal(rerun.specs.length, 0);
  assert.equal(rerun.alreadyPresent, 5);
  // blocked tasks are isolated as a whole
  blocked.add("recA");
  const blockedRun = pomodoroPlan(plans, new Map(), blocked, dateKey);
  assert.equal(blockedRun.specs.length, 2);
});

test("plan counts pre-existing sequences above the target as excess", () => {
  const existing = new Map([
    [`recA|${dateKey}|1`, 1],
    [`recA|${dateKey}|2`, 1],
    [`recA|${dateKey}|3`, 1],
  ]);
  const plan = pomodoroPlan(
    [{ recordId: "recA", count: 2 }],
    existing,
    new Set(),
    dateKey
  );
  assert.equal(plan.specs.length, 0);
  assert.equal(plan.alreadyPresent, 2);
  assert.equal(plan.excess, 1);
});

test("count field resolution prefers the current name and rejects ambiguity", () => {
  const preferred = { field_id: "f1", field_name: "今日计划番茄数", type: 2 };
  const legacy = { field_id: "f2", field_name: "今日番茄数", type: 2 };
  const p = resolveTodayCountField([preferred]);
  assert.equal(p.name, "今日计划番茄数");
  assert.equal(p.resolution, "preferred");
  const l = resolveTodayCountField([legacy]);
  assert.equal(l.name, "今日番茄数");
  assert.equal(l.resolution, "legacy");
  const missing = resolveTodayCountField([]);
  assert.equal(missing.name, "今日计划番茄数");
  assert.equal(missing.resolution, "missing");
  assert.equal(missing.field, null);
  assert.throws(() => resolveTodayCountField([preferred, legacy]));
  assert.throws(() => resolveTodayCountField([preferred, { ...preferred }]));
});

test("integer field state accepts plain integers and rejects fractions/text", () => {
  assert.deepEqual(integerFieldState(null), {
    present: false,
    valid: true,
    value: 0,
  });
  assert.deepEqual(integerFieldState(""), {
    present: false,
    valid: true,
    value: 0,
  });
  assert.deepEqual(integerFieldState(3), { present: true, valid: true, value: 3 });
  assert.deepEqual(integerFieldState(" 4 "), {
    present: true,
    valid: true,
    value: 4,
  });
  assert.equal(integerFieldState(2.5).valid, false);
  assert.equal(integerFieldState("abc").valid, false);
});

test("pomodoro sequence parses plain and prefixed numbers only", () => {
  assert.equal(pomodoroSequence("3"), 3);
  assert.equal(pomodoroSequence("番茄 2"), 2);
  assert.equal(pomodoroSequence("番茄12"), 12);
  assert.equal(pomodoroSequence(""), 0);
  assert.equal(pomodoroSequence("0"), 0);
  assert.equal(pomodoroSequence("第3个"), 0);
});

test("task plan collection filters by local plan date and isolates invalid counts", () => {
  const records = [
    { record_id: "a", fields: { 计划日: dayMs, 今日计划番茄数: 2 } },
    { record_id: "b", fields: { 计划日: dayMs, 今日计划番茄数: 2.5 } },
    { record_id: "c", fields: { 计划日: dayMs, 今日计划番茄数: 51 } },
    { record_id: "d", fields: { 计划日: dayMs, 今日计划番茄数: 0 } },
    { record_id: "e", fields: { 计划日: dayMs } },
    { record_id: "f", fields: { 计划日: dayMs + 86400000, 今日计划番茄数: 3 } },
  ];
  const { plans, invalid } = collectTaskPlans(records, "今日计划番茄数", dayMs);
  assert.deepEqual(plans, [{ recordId: "a", count: 2 }]);
  assert.equal(invalid, 2);
});

test("existing scan blocks multi-linked, unkeyed and duplicate-keyed tasks", () => {
  const records = [
    // healthy existing key
    { record_id: "p1", fields: { 计划日: dayMs, 任务: ["recA"], 番茄: [{ text: "1" }] } },
    // duplicate of the same key -> recA blocked
    { record_id: "p2", fields: { 计划日: dayMs, 任务: ["recA"], 番茄: [{ text: "1" }] } },
    // multi-linked -> recB blocked
    { record_id: "p3", fields: { 计划日: dayMs, 任务: ["recB", "recX"], 番茄: "2" } },
    // linked but no sequence -> recC blocked
    { record_id: "p4", fields: { 计划日: dayMs, 任务: ["recC"], 番茄: "自由" } },
    // unlinked and orphan rows are only counted
    { record_id: "p5", fields: { 计划日: dayMs, 番茄: "1" } },
    { record_id: "p6", fields: { 计划日: dayMs, 任务: ["recGone"], 番茄: "1" } },
    // other days are ignored
    { record_id: "p7", fields: { 计划日: dayMs - 86400000, 任务: ["recA"], 番茄: "1" } },
  ];
  const scan = scanExisting(records, {
    dayMs,
    dateKey,
    dateField: "计划日",
    taskField: "任务",
    seqField: "番茄",
    knownTaskIds: new Set(["recA", "recB", "recC"]),
    candidateTaskIds: new Set(["recA", "recB", "recC"]),
    linkIds,
  });
  assert.equal(scan.todayCount, 6);
  assert.equal(scan.unlinked, 1);
  assert.equal(scan.multiLinked, 1);
  assert.equal(scan.orphanLinked, 1);
  assert.equal(scan.unkeyed, 1);
  assert.equal(scan.duplicateGroups, 1);
  assert.deepEqual([...scan.blocked].sort(), ["recA", "recB", "recC"]);
  assert.equal(scan.keyCounts.get(`recA|${dateKey}|1`), 2);
  // a fully blocked candidate set produces no specs
  const plan = pomodoroPlan(
    [
      { recordId: "recA", count: 2 },
      { recordId: "recB", count: 1 },
    ],
    scan.keyCounts,
    scan.blocked,
    dateKey
  );
  assert.equal(plan.specs.length, 0);
});

test("local day helpers agree with the key format", () => {
  assert.equal(localDayOf(dayMs + 3600000), dayMs);
  assert.equal(localDayOf(dayMs - 1), dayMs - 86400000);
  assert.equal(localDayOf("not a date"), null);
  assert.equal(dateKeyOf(dayMs), dateKey);
});

test("client token is deterministic and UUID-shaped", () => {
  const a = clientToken("today-pomodoro-create|base|k1;k2");
  assert.equal(a, clientToken("today-pomodoro-create|base|k1;k2"));
  assert.notEqual(a, clientToken("today-pomodoro-create|base|k1;k3"));
  assert.match(
    a,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/
  );
});

test('recent action selects checked tasks regardless of date, excludes completed/abandoned, and preserves exact counts', () => {
  const { resolvePlanningMode } = require('../app/electron/build/focus/generate.js');
  assert.equal(resolvePlanningMode([{field_name:'近日行动',type:7},{field_name:'计划日',type:5}]), 'recent');
  assert.equal(resolvePlanningMode([{field_name:'计划日',type:5}]), 'date');
  assert.throws(()=>resolvePlanningMode([{field_name:'近日行动',type:1},{field_name:'计划日',type:5}]), /复选框/);
  const row=(id,n,extra={})=>({record_id:id,fields:{近日行动:true,今日计划番茄数:n,...extra}});
  const source=[row('a',2),row('b',2),row('c',6),row('d',4),row('e',2),row('parent',null),row('done',4,{完成:true}),row('abandoned',3,{放弃:true}),row('unchecked',7,{近日行动:false,计划日:dayMs})];
  const selected=collectTaskPlans(source,'今日计划番茄数',dayMs,50,'recent');
  assert.equal(selected.invalid,0);assert.equal(selected.plans.length,6);assert.equal(selected.plans.reduce((n,p)=>n+p.count,0),23);
  const keys=new Map();const first=pomodoroPlan(selected.plans,keys,new Set(),dateKey);assert.equal(first.specs.length,23);
  first.specs.forEach(s=>keys.set(s.key,1));assert.equal(pomodoroPlan(selected.plans,keys,new Set(),dateKey).specs.length,0);
  assert.equal(collectTaskPlans([row('bad',2.5)],'今日计划番茄数',dayMs,50,'recent').invalid,1);
  assert.equal(collectTaskPlans([row('no',2,{近日行动:'true'})],'今日计划番茄数',dayMs,50,'recent').plans.length,0);
});

test('today OR recent selects each task once and preserves exclusions and counts', () => {
  const row=(id,extra={})=>({record_id:id,fields:{今日计划番茄数:2,...extra}});
  const records=[row('both',{近日行动:true,计划日:dayMs}),row('dateOnly',{近日行动:false,计划日:dayMs+12*3600000}),row('recentOnly',{近日行动:true,计划日:dayMs-86400000}),row('yesterday',{计划日:dayMs-86400000}),row('tomorrow',{计划日:dayMs+86400000}),row('done',{计划日:dayMs,完成:true}),row('abandoned',{计划日:dayMs,放弃:true}),row('empty',{计划日:dayMs,今日计划番茄数:null}),row('zero',{计划日:dayMs,今日计划番茄数:0})];
  const before=structuredClone(records);
  assert.deepEqual(collectTaskPlans(records,'今日计划番茄数',dayMs,50,'recent'),{plans:[{recordId:'both',count:2},{recordId:'dateOnly',count:2},{recordId:'recentOnly',count:2}],invalid:0});
  assert.deepEqual(records,before);
  const {resolvePlanningMode}=require('../app/electron/build/focus/generate.js');
  assert.throws(()=>resolvePlanningMode([{field_name:'近日行动',type:7},{field_name:'计划日',type:1}]),/日期字段/);
});

test('Feishu generation creates the union once and readback shows the date-only task', async () => {
  const {harness}=require('./plan-fixture.cjs');const {client,state}=harness();state.plans=[];
  const today=dayStart(new Date());
  state.tasks=[{record_id:'t1',fields:{任务名称:'Recent',近日行动:true,今日计划番茄数:2}},{record_id:'t2',fields:{任务名称:'Scheduled',近日行动:false,计划日:today,今日计划番茄数:3}},{record_id:'t3',fields:{任务名称:'Both',近日行动:true,计划日:today,今日计划番茄数:1}}];
  const original=client.request;
  client.request=async(m,p,b,t)=>{
    if(m==='GET'&&p.split('?')[0].endsWith('/tasks/fields'))return {data:{items:[{field_name:'任务名称',type:1},{field_name:'近日行动',type:7},{field_name:'计划日',type:5},{field_name:'今日计划番茄数',type:2}],has_more:false}};
    if(m==='POST'&&p.split('?')[0].endsWith('/records/batch_create')) {const made=b.records.map((r,i)=>({record_id:'new'+(state.plans.length+i),fields:structuredClone(r.fields)}));state.plans.push(...made);return {data:{records:made}};}
    return original(m,p,b,t);
  };
  assert.equal((await client.generateToday()).created,6);
  assert.equal((await client.generateToday()).created,0);
  assert.equal(state.plans.filter(r=>r.fields.任务[0]==='t2').length,3);
  assert.equal(state.plans.filter(r=>r.fields.任务[0]==='t3').length,1);
  assert.equal((await client.today()).filter(r=>r.taskId==='t2').length,3);
});

test('Feishu generation uses recent checkbox without task date column and remains idempotent', async () => {
  const {harness}=require('./plan-fixture.cjs');const {client,state}=harness();state.plans=[];
  state.tasks=[{record_id:'t1',fields:{任务名称:'Synthetic',近日行动:true,今日计划番茄数:3}},{record_id:'t2',fields:{任务名称:'Done',近日行动:true,今日计划番茄数:2,完成:true}}];
  const original=client.request;
  client.request=async(m,p,b,t)=>{
    if(m==='GET'&&p.split('?')[0].endsWith('/tasks/fields'))return {data:{items:[{field_name:'任务名称',type:1},{field_name:'近日行动',type:7},{field_name:'今日计划番茄数',type:2}],has_more:false}};
    if(m==='POST'&&p.split('?')[0].endsWith('/records/batch_create')) {const made=b.records.map((r,i)=>({record_id:'new'+(state.plans.length+i),fields:structuredClone(r.fields)}));state.plans.push(...made);return {data:{records:made}};}
    return original(m,p,b,t);
  };
  const first=await client.generateToday();assert.equal(first.created,3);assert.equal(first.planningMode,'recent');assert.equal(first.eligibleTasks,1);
  assert.equal((await client.generateToday()).created,0);assert.equal(state.plans.length,3);
  state.tasks[0].fields.近日行动=false;assert.equal((await client.generateToday()).eligibleTasks,0);assert.equal(state.plans.length,3);
});
