import test from "node:test";
import assert from "node:assert/strict";
import {newJourney,journeyDay,journeyTimeline} from "../app/renderer/src/focus/journey.js";
import {quickRest,closeRest,readRestLog,writeRestLog,defaultRestMinutes} from "../app/renderer/src/focus/restLog.ts";
const at=(h,m=0)=>new Date(2026,10,4,h,m).getTime();
const plan=()=>newJourney("local",journeyDay(at(12)),()=>crypto.randomUUID());
const blank=()=>({version:2,scope:"local",events:[]});
const record=(id,start,end)=>({id,status:"saved",startedAt:start,endedAt:end,elapsedSeconds:(end-start)/1000,completedCount:1,task:{source:"local"}});
const records=[record("a",at(10),at(11)),record("b",at(13),at(14))];
test("defaults and sequential meal/nap/gym estimates move predictions and survive reload",()=>{
  assert.deepEqual([defaultRestMinutes("meal"),defaultRestMinutes("gym"),defaultRestMinutes("nap",true),defaultRestMinutes("nap")],[30,60,50,20]);
  const p=plan(), raw=JSON.stringify(records);
  let log=quickRest(blank(),p,"meal",at(14,25),records,null,"m");
  log=quickRest(log,p,"nap",at(14,25),records,null,"n");
  log=quickRest(log,p,"gym",at(14,25),records,null,"g");
  assert.deepEqual(log.events.map(e=>[e.startedAt,e.endedAt]),[[at(14),at(14,30)],[at(14,30),at(15,20)],[at(15,20),at(16,20)]]);
  assert.ok(Object.values(journeyTimeline(p,[],null,log.events).starts).every(s=>s.at>=at(16,20)));
  const m=new Map(), storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
  assert.deepEqual(readRestLog(storage,"local"),blank());
  assert.deepEqual(readRestLog((writeRestLog(storage,log),storage),"local"),log);
  assert.equal(JSON.stringify(records),raw);
});
test("standalone nap and recent short break start at current time; previous day not consumed",()=>{
  assert.equal(quickRest(blank(),plan(),"nap",at(14,5),records,null,"n").events[0].endedAt,at(14,25));
  const old=record("old",at(0)-7200000,at(0)-3600000);
  assert.equal(quickRest(blank(),plan(),"meal",at(8),[old],null,"m").events[0].startedAt,at(8));
});
test("drop packs historical gap; meal-linked nap defaults 50, full gap rejects and focus immutable",()=>{
  const p=plan(); let log=quickRest(blank(),p,"meal",at(15),records,null,"m","b");
  log=quickRest(log,p,"nap",at(15),records,null,"n","b");
  log=quickRest(log,p,"gym",at(15),records,null,"g","b");
  assert.deepEqual(log.events.map(e=>[e.startedAt,e.endedAt]),[[at(11),at(11,30)],[at(11,30),at(12,20)],[at(12,20),at(13)]]);
  assert.throws(()=>quickRest(log,p,"nap",at(15),records,null,"x","b"),/空档/);
  assert.throws(()=>quickRest(blank(),p,"nap",at(15),records,null,"x","a"),/空档/);
});
test("moving an estimate preserves identity without duplicate, failed move keeps original",()=>{
  const p=plan(), log=quickRest(blank(),p,"gym",at(14,25),records,null,"g");
  const moved=quickRest(log,p,"gym",at(15),records,null,"unused","b","g");
  assert.equal(moved.events.length,1);assert.equal(moved.events[0].id,"g");
  assert.equal(moved.events[0].startedAt,at(11));assert.equal(moved.events[0].afterCount,1);
  assert.throws(()=>quickRest(log,p,"gym",at(15),records,null,"unused","missing","g"));
  assert.equal(log.events[0].startedAt,at(14));
});
test("starting focus early truncates current estimate, removes future queued estimates, retains past",()=>{
  const p=plan();let log=quickRest(blank(),p,"meal",at(14,25),records,null,"m");
  log=quickRest(log,p,"nap",at(14,25),records,null,"n");
  const closed=closeRest(log,at(14,26));
  assert.equal(closed.events.length,1);assert.equal(closed.events[0].endedAt,at(14,26));
  assert.deepEqual(closeRest(log,at(16)),log);
});
test("source/date/active/missing interval protection and midnight cap",()=>{
  const p=plan();
  assert.throws(()=>quickRest(blank(),{...p,scope:"other"},"nap",at(15),records,null,"n"),/来源/);
  assert.throws(()=>quickRest(blank(),p,"nap",at(15),records,{...records[0],status:"active"},"n"),/暂停/);
  assert.throws(()=>quickRest(blank(),p,"nap",at(15),[{...records[0],endedAt:undefined}],null,"n"),/结束时间/);
  const result=quickRest(blank(),p,"gym",at(23,50),[],null,"g");
  assert.equal(result.events[0].endedAt,at(24));
  assert.throws(()=>quickRest(result,p,"nap",at(23,50),[],null,"n"),/空档/);
});

test("legacy/native ongoing rests close atomically and allow one-click switching",async()=>{
  const {startRest}=await import('../app/renderer/src/focus/restLog.ts');
  const p=plan(),ongoing=startRest(blank(),p,'meal',at(14),2,'old');
  const next=quickRest(ongoing,p,'nap',at(14,30),records,null,'n');
  assert.equal(next.events[0].endedAt,at(14,30));assert.equal(next.events[1].endedAt,at(15,20));
  assert.equal(ongoing.events[0].endedAt,null);
  const finished=quickRest(ongoing,p,'meal',at(14,30),records,null,'unused');
  assert.equal(finished.events.length,1);assert.equal(finished.events[0].endedAt,at(14,30));
});
