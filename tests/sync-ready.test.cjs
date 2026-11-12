const {test}=require('node:test'),assert=require('node:assert/strict');
const Module=require('node:module'), originalLoad=Module._load;
Module._load=function(name,...args){if(name==='electron')return {app:{getPath(){throw Error('No real profile access')}},safeStorage:{}};return originalLoad.call(this,name,...args)};
const {FocusService,request}=require('../app/electron/build/focus/service.js');
Module._load=originalLoad;
const {FeishuRequestError,recoverDataReady}=require('../app/electron/build/focus/feishuErrors.js');
const {harness,record,config}=require('./plan-fixture.cjs');
const {readLedger}=require('../app/electron/build/focus/plan.js');
const busy=(method='GET')=>new FeishuRequestError(1254607,400,method);
test('only structured1254607 is retried once; other failures and continued busy stop',async()=>{
 let calls=0,waits=[];
 assert.equal(await recoverDataReady(async()=>{if(++calls===1)throw busy();return 'ok'},async ms=>waits.push(ms)),'ok');
 assert.deepEqual(waits,[1500]);assert.equal(calls,2);
 calls=0;await assert.rejects(recoverDataReady(async()=>{calls++;throw busy()},async()=>{}),/暂未就绪/);assert.equal(calls,2);
 for(const error of [new FeishuRequestError(1254302,403,'PUT'),Error('offline'),Error('代码 1254607'),Error('conflict')]){
  calls=0;await assert.rejects(recoverDataReady(async()=>{calls++;throw error},async()=>assert.fail('must not wait')));assert.equal(calls,1);
 }
});
test('real HTTP decoder preserves classification without exposing route/body and never replays HTTP',async()=>{
 const https=require('node:https'),{EventEmitter}=require('node:events');const old=https.request;let calls=0;
 https.request=(_options,cb)=>{calls++;const req=new EventEmitter();req.write=()=>{};req.end=()=>{const res=new EventEmitter();res.statusCode=400;res.setEncoding=()=>{};cb(res);res.emit('data',JSON.stringify({code:1254607,msg:'private text'}));res.emit('end')};return req};
 try{await assert.rejects(request('PUT','private-route',{secret:'private'},'private-token'),e=>e instanceof FeishuRequestError&&e.code===1254607&&/写入/.test(e.message)&&!/private|权限/.test(e.message));assert.equal(calls,1)}finally{https.request=old}
});
test('real service/adapter retries pre-read and already-applied plan PUT without duplicated accounting',async()=>{
 for(const phase of ['read','write']){
  const {client,state}=harness(),service=new FocusService(),r=record(720),before=structuredClone(r);service.client=client;
  const raw=client.request;let injected=false;
  client.request=async(method,route,body,token)=>{
   if(!injected&&phase==='read'&&method==='GET'){injected=true;throw busy()}
   const result=await raw(method,route,body,token);
   if(!injected&&phase==='write'&&method==='PUT'){injected=true;throw busy('PUT')}
   return result;
  };
  await service.sync(r);assert.ok(injected);assert.deepEqual(r,before);
  assert.equal(state.plans[0].fields['实际分钟'],12);assert.equal(readLedger(state.plans[0].fields).entries.length,1);
  assert.equal(state.writes.filter(w=>w.method==='PUT').length,1);
 }
});
test('archive retries by rereading merged history after an applied write, without repeating minutes or snapshot',async()=>{
 const {client,state}=harness(),service=new FocusService(),r=record(720);service.client=client;
 const ack=await service.sync(r);const saved={...r,sync:'synced',syncedPlanId:ack.planId};
 const raw=client.request;let injected=false;
 client.request=async(method,...args)=>{const result=await raw(method,...args);if(!injected&&method==='PUT'){injected=true;throw busy('PUT')}return result};
 const result=await service.archiveHistory(saved);assert.ok(injected);assert.equal(result.cloudSynced,true);
 assert.equal(state.plans[0].fields['实际分钟'],12);assert.equal(readLedger(state.plans[0].fields).entries.length,1);
 assert.equal(state.writes.filter(w=>w.method==='PUT').length,2);
});
test('write lock spans recovery delay; source change cancels retry and input snapshot cannot drift',async()=>{
 const service=new FocusService();let calls=0,signal;const started=new Promise(r=>signal=r);
 const client={config,sync:async()=>{calls++;signal();throw busy('PUT')}};service.client=client;
 const value={syncTarget:'plan',id:'original'};const work=service.sync(value);await started;value.id='changed';
 await assert.rejects(service.sync(value),/正在写入/);
 service.client={sync:()=>assert.fail('must not write new source')};
 await assert.rejects(work,/连接已变化/);assert.equal(calls,1);assert.equal(service.planWriting,false);
 let snapshots=[];service.client={config,sync:async v=>{snapshots.push(v.id);if(snapshots.length===1)throw busy();return {synced:true}}};
 const next=service.sync(value);value.id='changed-again';await next;assert.deepEqual(snapshots,['changed','changed']);
});
