import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createJourneyApi} from '../app/renderer/src/focus/journeyApi.js';
import {journeyDay,journeyKey,writeJourney,readJourney,journeyMetadata} from '../app/renderer/src/focus/journey.js';
function fixture(){const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},task={id:'local-stable',source:'local',title:'关键问题'},context={ready:true,scope:'local',tasks:[task],records:[],active:null,restLog:{events:[]}},notices=[];return{storage,context,notices,call:createJourneyApi(storage,()=>context,p=>notices.push(p))};}
const read=day=>({protocol:1,requestId:randomUUID(),op:'read',day:day||journeyDay()});
const write=(r,operations)=>({protocol:1,requestId:randomUUID(),op:'write',day:r.day,expectedRevision:r.revision,operations});
test('stable default IDs, atomic task/order/rest/time write, readback and repeat after manual edit',async()=>{
 const f=fixture(),r=await f.call(read());assert.equal(r.journey.stages.length,5);assert.ok(r.revision);assert.deepEqual((await f.call(read())).journey,r.journey);
 const a=r.journey.stages[0],b=r.journey.stages[1],id=a.slots[0].id;
 const q=write(r,[{type:'assign',slotId:id,taskId:r.tasks[0].id},{type:'move',slotId:id,stageId:b.id,beforeSlotId:b.slots[0].id},{type:'stage',stageId:b.id,time:13,restActions:['meal','nap']},{type:'end',hour:23}]);
 const out=await f.call(q);assert.equal(out.error,undefined);assert.equal(out.journey.stages[1].slots[0].task.key,'local-stable');assert.equal(out.journey.endHour,23);assert.deepEqual((await f.call(read())).journey,out.journey);
 const p=readJourney(f.storage,'local',r.day);p.endHour=22;writeJourney(f.storage,p);
 const replay=await f.call(q);assert.equal(replay.replayed,true);assert.equal(replay.journey.endHour,22);assert.equal(replay.appliedRevision,out.revision);
 assert.equal((await f.call({...q,operations:[{type:'end',hour:24}]})).error.code,'ID_REUSED');assert.ok(f.notices.length>=3);
});
test('manual A B A invalidates old versions; completed/active slots and actual rest stay protected',async()=>{
 const f=fixture(),r=await f.call(read()),plan=r.journey,original=JSON.parse(JSON.stringify(plan));plan.endHour=22;writeJourney(f.storage,plan);writeJourney(f.storage,original);
 assert.equal((await f.call(write(r,[{type:'end',hour:20}]))).error.code,'CONFLICT');
 f.context.records=[{id:'done',status:'saved',startedAt:Date.now(),completedCount:1,task:f.context.tasks[0]}];
 let current=await f.call(read()),slot=current.journey.stages[0].slots[0];const originalRecords=JSON.stringify(f.context.records);
 assert.equal((await f.call(write(current,[{type:'assign',slotId:slot.id,taskId:null}]))).error.code,'LOCKED');
 const activeSlot=current.journey.stages[0].slots[1];current.journey.stages[0].slots[1].binding={sessionId:'running',unit:0};writeJourney(f.storage,current.journey);
 f.context.active={id:'running',startedAt:Date.now(),task:f.context.tasks[0],elapsedSeconds:123,status:'running'};
 current=await f.call(read());const active=JSON.stringify(f.context.active);
 assert.equal((await f.call(write(current,[{type:'move',slotId:activeSlot.id,stageId:current.journey.stages[1].id,beforeSlotId:null}]))).error.code,'LOCKED');
 f.context.restLog.events=[{id:'meal',presetKey:current.journey.stages[0].id+':0',endedAt:null}];
 assert.equal((await f.call(write(current,[{type:'stage',stageId:current.journey.stages[0].id,restActions:['gym']}]))).error.code,'LOCKED');
 const ok=await f.call(write(current,[{type:'assign',slotId:current.journey.stages[0].slots[2].id,taskId:current.tasks[0].id}]));assert.equal(ok.error,undefined);
 assert.equal(JSON.stringify(f.context.active),active);assert.equal(JSON.stringify(f.context.records),originalRecords);
});
test('atomic batch invalid/foreign task no partial write; storage failure retained; serial CAS one success',async()=>{
 const f=fixture(),r=await f.call(read()),key=journeyKey('local',r.day),raw=f.storage.getItem(key),a=r.journey.stages[0];
 let out=await f.call(write(r,[{type:'end',hour:22},{type:'assign',slotId:a.slots[0].id,taskId:'foreign'}]));assert.equal(out.error.code,'TASK_UNAVAILABLE');assert.equal(f.storage.getItem(key),raw);
 out=await f.call(write(r,[{type:'move',slotId:a.slots[0].id,stageId:a.id,beforeSlotId:'missing'}]));assert.equal(out.error.code,'NOT_FOUND');
 const set=f.storage.setItem;f.storage.setItem=()=>{throw Error('disk full')};assert.equal((await f.call(write(r,[{type:'end',hour:22}]))).error.code,'SAVE_FAILED');f.storage.setItem=set;assert.equal(f.storage.getItem(key),raw);
 const results=await Promise.all([f.call(write(r,[{type:'end',hour:22}])),f.call(write(r,[{type:'end',hour:21}]))]);assert.equal(results.filter(v=>!v.error).length,1);assert.equal(results[1].error.code,'CONFLICT');
 assert.equal(journeyMetadata(f.storage,'local',r.day).receipts.length,1);
});
test('readiness, malformed dates/unknown fields/history write and changes during digest refused; retry still works',async()=>{
 const f=fixture();for(const extra of [{day:'2026-02-30'},{scope:'foreign'},{op:'erase'}])assert.ok((await f.call({...read(),...extra})).error);
 f.context.ready=false;assert.equal((await f.call(read())).error.code,'NOT_READY');f.context.ready=true;
 const r=await f.call(read()),q=write(r,[{type:'end',hour:22}]);const promise=f.call(q);queueMicrotask(()=>{f.context.active={id:'new-active',startedAt:Date.now(),task:f.context.tasks[0]}});assert.equal((await promise).error.code,'CONFLICT');
 assert.equal((await f.call({...q,day:'2000-01-01'})).error.code,'READ_ONLY');assert.equal((await f.call(read())).error,undefined);
});
test('initialization requires real save/readback and midnight invalidates pending writes; next-day operations still pass',async()=>{
 const f=fixture(),set=f.storage.setItem;f.storage.setItem=()=>{};assert.equal((await f.call(read())).error.code,'SAVE_FAILED');f.storage.setItem=set;
 const r=await f.call(read()),q=write(r,[{type:'end',hour:22}]),RealDate=Date;
 try {const pending=f.call(q);queueMicrotask(()=>{globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[RealDate.now()+86400000]))}static now(){return RealDate.now()+86400000}}});assert.equal((await pending).error.code,'CONFLICT');assert.equal((await f.call(read())).error,undefined);}finally{globalThis.Date=RealDate}
 assert.equal((await f.call(write(await f.call(read()),[{type:'end',hour:23}]))).error,undefined);
});
