import test from "node:test";
import assert from "node:assert/strict";
import { newJourney, journeyDay } from "../app/renderer/src/focus/journey.js";
import { readRestLog, writeRestLog, restLogKey, openRest, startRest, closeRest, restClock, completedBeforeRest, validateRestLog } from "../app/renderer/src/focus/restLog.ts";
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
