import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WEIGHTS, WEIGHTS_KEY, effectiveCount, effectiveWeekCount, hasDiscountedRecords, formatEffective, validateWeights, loadWeights, saveWeights, effectiveRecords, effectiveToneRecords, tomatoWeight, effectiveTaskProgress } from '../app/renderer/src/focus/weights.js';
const r = (n, type='misc', extra={}) => ({status:'saved',completedCount:n,task:{projectType:type},...extra});
const weights = {...DEFAULT_WEIGHTS,misc:0.6};
test('research and discounted work preserve raw counts and durations while target uses 14 of 18',()=>{
  const records=[r(8,'research',{acceptedSeconds:12000}),r(10,'misc',{acceptedSeconds:15000})];
  const before=JSON.stringify(records);
  assert.equal(effectiveCount(records,weights),14);
  assert.ok(effectiveCount(records,weights)<15);
  assert.equal(effectiveCount(records),18);
  assert.equal(JSON.stringify(records),before);
});
test('sum fractional credit without per-session rounding; zero rates keep original records',()=>{
  assert.equal(effectiveCount(Array.from({length:10},()=>r(1)),weights),6);
  assert.equal(effectiveCount([r(7)],{...weights,misc:0.13}),0.91);
  assert.equal(effectiveCount([r(3)],{...weights,misc:0}),0);
  assert.equal(formatEffective(4.8),'4.8');
});
test('only accepted saved records count, override wins, unknown does not become misc',()=>{
  assert.equal(effectiveCount([r(5,'misc',{status:'active'}),r(5,'misc',{status:'review'}),r(2,'misc',{colorOverride:'research'}),r(3,undefined)],weights),3.8);
  assert.equal(effectiveCount([{status:'saved',completedCount:3,task:{}}],weights),3);
  assert.equal(hasDiscountedRecords([r(1,'research')],weights),false);
  assert.equal(hasDiscountedRecords([r(1)],weights),true);
  assert.equal(hasDiscountedRecords([r(1)],{...weights,misc:0}),true);
  assert.equal(hasDiscountedRecords([r(0)],weights),false);
});
test('week boundaries use Monday UTC+8 and historical weights can be recalculated',()=>{
  const now=Date.parse('2026-10-14T12:00:00+08:00');
  const records=[r(10,'misc',{startedAt:Date.parse('2026-10-12T00:00:00+08:00')}),r(9,'research',{startedAt:Date.parse('2026-10-11T23:59:59+08:00')}),r(10,'misc',{startedAt:Date.parse('2026-10-19T00:00:00+08:00')})];
  assert.equal(effectiveWeekCount(records,now,weights),6);
  assert.equal(effectiveWeekCount(records,now),10);
});
test('configuration roundtrip, legacy defaults, corruption and failed storage are explicit',()=>{
  let data=null;const store={getItem:()=>data,setItem:(_,v)=>{data=v}};
  assert.deepEqual(loadWeights(store),DEFAULT_WEIGHTS);
  assert.deepEqual(saveWeights(store,weights),weights);
  assert.deepEqual(loadWeights(store),weights);
  for(const n of [-1,1.1,NaN,Infinity,0.123,'0.6',null])assert.throws(()=>validateWeights({...weights,misc:n}));
  data='';assert.throws(()=>loadWeights(store));
  data='null';assert.throws(()=>loadWeights(store));
  data='{broken';assert.throws(()=>loadWeights(store));
  data=JSON.stringify({version:2,weights});assert.throws(()=>loadWeights(store));
  assert.throws(()=>saveWeights({setItem:()=>{throw Error('full')}},weights),/full/);
  assert.equal(WEIGHTS_KEY,'pomatez-focus-tomato-weights-v1');
});

test('inherited names and arbitrary categories consistently fall back to unclassified',()=>{
  const w={...DEFAULT_WEIGHTS,unclassified:0.5};
  for(const type of ['constructor','toString','__proto__','unexpected'])assert.equal(effectiveCount([r(3,type)],w),1.5);
});


test('display projection keeps raw snapshots and times untouched; recomputes only once',()=>{
 const raw=[r(8,'research',{id:'r',startedAt:1,acceptedSeconds:12000}),r(10,'misc',{id:'m',startedAt:2,acceptedSeconds:15000})];const original=JSON.stringify(raw);
 const display=effectiveRecords(raw,weights);assert.deepEqual(display.map(x=>x.completedCount),[8,6]);assert.deepEqual(display.map(x=>x.acceptedSeconds),[12000,15000]);assert.equal(JSON.stringify(raw),original);assert.notEqual(display[0],raw[0]);
 assert.equal(effectiveRecords(raw,DEFAULT_WEIGHTS)[1].completedCount,10);
 assert.equal(tomatoWeight(raw[1],weights),0.6);assert.equal(effectiveRecords(raw,{...weights,misc:0})[1].completedCount,0);
});
test('visual color mass accumulates fractions across records instead of ceiling each session',()=>{
 const raw=Array.from({length:3},(_,i)=>r(1,'misc',{id:String(i),startedAt:i}));
 assert.equal(effectiveToneRecords(raw,weights).length,2);assert.equal(effectiveToneRecords(raw,{...weights,misc:0}).length,0);assert.equal(effectiveToneRecords(raw,weights,1).length,1);
 const sampled=effectiveToneRecords([r(1,'research',{startedAt:1}),r(10,'misc',{startedAt:2})],{...weights,misc:0},21);assert.equal(sampled.length,1);assert.equal(sampled[0].task.projectType,'research');
});


test('partial cross-device history never replaces the complete confirmed task total; source isolation and overrides preserved',()=>{
 const now=Date.parse('2026-10-14T12:00:00+08:00');const task={taskId:'t',source:'feishu',sourceKey:'base-A',projectType:'misc',doneToday:10,plannedToday:10};
 const record=(count,extra={})=>r(count,'misc',{startedAt:now,task, ...extra});
 assert.deepEqual(effectiveTaskProgress(task,[record(1)],now,weights),{done:6,planned:6,missing:9});
 assert.deepEqual(effectiveTaskProgress(task,[record(10)],now,weights),{done:6,planned:6,missing:0});
 assert.deepEqual(effectiveTaskProgress(task,[record(1,{colorOverride:'research'})],now,weights),{done:6.4,planned:6,missing:9});
 assert.deepEqual(effectiveTaskProgress(task,[record(10,{task:{...task,sourceKey:'base-B',projectType:'research'}})],now,weights),{done:6,planned:6,missing:10});
 assert.equal(effectiveTaskProgress(task,[record(1)],now,{...weights,misc:0}).done,0);
});
