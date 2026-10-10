import test from "node:test";
import assert from "node:assert/strict";
import { newJourney, journeyDay } from "../app/renderer/src/focus/journey.js";
import { readRestLog, writeRestLog, restLogKey, legacyRestLogKey, openRest, startRest, closeRest, restClock, completedBeforeRest, validateRestLog, restBackfillWindow, backfillRest } from "../app/renderer/src/focus/restLog.ts";
const at = (d,h,m=0) => new Date(2026,9,d,h,m).getTime();
const memory = () => { const m=new Map(); return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}; };
const plan = () => newJourney("A",journeyDay(at(10,12)),()=>"unused");
test("first and second same-kind presets consumed in sequence, actual counts remain immutable",()=>{
  const storage=memory(),p=plan(); p.stages.forEach((s,i)=>s.id=`stage${i}`);
  let log=startRest(readRestLog(storage,"A"),p,"meal",at(10,12),6,"m1");
  assert.equal(openRest(log).presetKey,"stage0:0"); assert.equal(openRest(log).afterCount,6);
  log=writeRestLog(storage,closeRest(log,at(10,12,30)));
  log=startRest(readRestLog(storage,"A"),p,"meal",at(10,18),10,"m2");
  assert.equal(openRest(log).presetKey,"stage2:2"); assert.equal(log.events[0].afterCount,6);
  log=closeRest(log,at(10,18,30)); log=startRest(log,p,"meal",at(10,21),14,"m3");
  assert.equal(openRest(log).presetKey,null); assert.equal(log.events.length,3);
});
test("meal to nap is contiguous, no-op same kind, finish/restart and next-day closing",()=>{
  const storage=memory(),p=plan(); let log=startRest(readRestLog(storage,"A"),p,"meal",at(10,12),6,"m");
  const same=startRest(log,p,"meal",at(10,12,15),8,"dup"); assert.deepEqual(same,log);
  log=startRest(log,p,"nap",at(10,12,30),6,"n"); assert.equal(log.events[0].endedAt,openRest(log).startedAt);
  assert.equal(restClock(log.events[0],at(10,13)),"30:00"); assert.equal(restClock(openRest(log),at(10,13,35)),"1:05:00");
  writeRestLog(storage,log); const cold=readRestLog(storage,"A"); assert.equal(restClock(openRest(cold),at(10,12,45)),"15:00");
  const tomorrow={...p,day:journeyDay(at(11,8))}; log=startRest(cold,tomorrow,"meal",at(11,8),0,"next");
  assert.equal(log.events[1].endedAt,at(11,8)); assert.equal(openRest(log).afterCount,0);
  assert.equal(openRest(closeRest(log,at(11,8,30))),undefined);
});
test("source isolated and actual saved count excludes pending/demo/future/other day",()=>{
  const storage=memory(),p=plan(); writeRestLog(storage,startRest(readRestLog(storage,"A"),p,"meal",at(10,12),6,"m"));
  assert.equal(readRestLog(storage,"B").events.length,0);
  assert.throws(()=>startRest(readRestLog(storage,"B"),p,"meal",at(10,12),6,"x"),/来源/);
  const r={status:"saved",startedAt:at(10,10),endedAt:at(10,11),completedCount:6,task:{source:"feishu",sourceKey:"A"}};
  assert.equal(completedBeforeRest([r,{...r,status:"review"},{...r,task:{source:"local",sourceKey:"A"}},{...r,startedAt:at(11,10)},{...r,endedAt:at(10,13)}],"A",at(10,12)),6);
});
test("corrupt/empty bytes not overwritten, missing and verified writes still work",()=>{
  for(const raw of ["", "{", JSON.stringify({version:1,scope:"wrong",events:[]})]){
    const storage=memory();storage.setItem(restLogKey("A"),raw);
    assert.throws(()=>readRestLog(storage,"A"));
    assert.throws(()=>writeRestLog(storage,{version:1,scope:"A",events:[]}));
    assert.equal(storage.getItem(restLogKey("A")),raw);
  }
  const log=readRestLog(memory(),"A"), storage=memory(); assert.deepEqual(writeRestLog(storage,log),readRestLog(storage,"A"));
  assert.throws(()=>writeRestLog({getItem:()=>null,setItem:()=>{}},log),/未保存/);
});
test("overlap, duplicate ids, backwards clock, malformed and oversized records refused",()=>{
  const p=plan(),log=startRest(readRestLog(memory(),"A"),p,"nap",at(10,12),0,"n");
  assert.throws(()=>closeRest(log,at(10,11)),/系统时间/);
  assert.throws(()=>validateRestLog({...log,events:[...log.events,...log.events]},"A"));
  for(const change of [{afterCount:-1},{afterCount:1.5},{endedAt:at(10,11)},{startedAt:NaN}])
    assert.throws(()=>validateRestLog({...log,events:[{...log.events[0],...change}]},"A"));
  assert.throws(()=>validateRestLog({...log,events:Array(2049).fill(log.events[0])},"A"));
});

test("v1 is read without rewriting; gym persists in v2, corrupt old and new bytes stay intact",()=>{
  const storage=memory(),p=plan();const old=JSON.stringify({version:1,scope:"A",events:[]});
  storage.setItem(legacyRestLogKey("A"),old);
  const initial=readRestLog(storage,"A");assert.equal(initial.version,2);assert.equal(storage.getItem(restLogKey("A")),null);
  const gym=startRest(initial,p,"gym",at(10,16),10,"g");
  const saved=writeRestLog(storage,gym);assert.equal(readRestLog(storage,"A").events[0].kind,"gym");
  assert.equal(storage.getItem(legacyRestLogKey("A")),old);assert.deepEqual(saved,gym);
  for(const key of [legacyRestLogKey("A"),restLogKey("A")]){
    const broken=memory();broken.setItem(key,"");assert.throws(()=>writeRestLog(broken,initial));assert.equal(broken.getItem(key),"");
  }
});

const record=(start,end,count=6)=>({status:"saved",startedAt:start,endedAt:end,completedCount:count,
  task:{source:"feishu",sourceKey:"A"}});
test("backfill defaults to most recent ended focus/rest, allows adjusted meal/nap/gym sequential presets",()=>{
  const p=plan(),empty=readRestLog(memory(),"A"),r=record(at(10,9),at(10,11));
  assert.deepEqual(restBackfillWindow(empty,[r],null,at(10,12)),{startedAt:at(10,11),endedAt:at(10,12)});
  let log=backfillRest(empty,p,"meal",at(10,11,15),at(10,12),at(10,12),[r],null,"m1");
  assert.equal(log.events[0].afterCount,6);assert.equal(log.events[0].startedAt,at(10,11,15));assert.equal(openRest(log),undefined);
  assert.equal(restBackfillWindow(log,[r],null,at(10,13)).startedAt,at(10,12));
  log=backfillRest(log,p,"nap",at(10,12),at(10,12,30),at(10,13),[r],null,"n");
  log=backfillRest(log,p,"gym",at(10,16),at(10,17),at(10,18),[r],null,"g");
  assert.ok(log.events[2].presetKey);assert.equal(log.events[2].kind,"gym");
  log=backfillRest(log,p,"meal",at(10,18),at(10,18,30),at(10,19),[r],null,"m2");
  assert.notEqual(log.events[0].presetKey,log.events[3].presetKey);
});
test("backfill rejects overlaps/future/running focus/open other rest, but paused gaps and cross-day remain valid",()=>{
  const p=plan(),empty=readRestLog(memory(),"A"),r=record(at(10,9),at(10,11));
  for(const [s,e] of [[at(10,10),at(10,12)],[at(10,13),at(10,12)],[at(10,12),at(10,14)]])
    assert.throws(()=>backfillRest(empty,p,"meal",s,e,at(10,13),[r],null,"x"));
  const paused={...r,status:"paused",endedAt:undefined,segments:[{start:at(10,9),end:at(10,10)},{start:at(10,11),end:at(10,12)}]};
  const valid=backfillRest(empty,p,"nap",at(10,10),at(10,11),at(10,13),[],paused,"gap");
  assert.equal(valid.events.length,1);
  assert.throws(()=>backfillRest(empty,p,"nap",at(10,10),at(10,11),at(10,13),[],{...paused,status:"active"},"run"));
  assert.throws(()=>backfillRest(startRest(empty,p,"meal",at(10,12),6,"m"),p,"nap",at(10,12),at(10,13),at(10,13),[],null,"open"));
  assert.throws(()=>backfillRest(valid,p,"nap",at(10,10),at(10,11),at(10,13),[],null,"dup"));
  assert.equal(restBackfillWindow(empty,[{...r,task:{source:"local",sourceKey:"A"}}],null,at(10,12)).startedAt,null);
  const overnight=backfillRest(empty,p,"nap",at(10,23),at(11,1),at(11,2),[],null,"night");
  assert.equal(overnight.events[0].endedAt,at(11,1));
});

test("backfill into earlier empty gap sorts chronologically without changing existing event identities",()=>{
  const p=plan(),empty=readRestLog(memory(),"A");
  const later=backfillRest(empty,p,"meal",at(10,12),at(10,12,30),at(10,13),[],null,"later");
  const before=structuredClone(later.events[0]);
  const next=backfillRest(later,p,"nap",at(10,10),at(10,11),at(10,13),[],null,"earlier");
  assert.deepEqual(next.events.map(e=>e.id),["earlier","later"]);assert.deepEqual(next.events[1],before);
  assert.throws(()=>backfillRest(later,p,"gym",at(10,12,15),at(10,13),at(10,13),[],null,"overlap"),/已有休息/);
});
test("legacy paused focus with unknown end is not treated as empty; explicit segments keep normal gaps available",()=>{
  const p=plan(),empty=readRestLog(memory(),"A"),old={...record(at(10,9),at(10,10)),endedAt:undefined,elapsedSeconds:3600,status:"paused"};
  assert.throws(()=>restBackfillWindow(empty,[],old,at(10,12)),/可靠/);
  assert.throws(()=>backfillRest(empty,p,"meal",at(10,9,30),at(10,10),at(10,12),[],old,"no"),/可靠/);
  assert.equal(backfillRest(empty,p,"nap",at(10,8),at(10,9),at(10,12),[],old,"before").events.length,1);
  const known={...old,segments:[{start:at(10,9),end:at(10,10)}]};
  assert.equal(restBackfillWindow(empty,[],known,at(10,12)).startedAt,at(10,10));
  assert.equal(backfillRest(empty,p,"nap",at(10,10),at(10,11),at(10,12),[],known,"gap").events.length,1);
});
