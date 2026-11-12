const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),{EventEmitter}=require('node:events');
const oldLoad=Module._load;
Module._load=function(name,...args){if(name==='electron')return {app:{getPath(){throw Error('No personal profile')}},safeStorage:{}};return oldLoad.call(this,name,...args)};
const {request,FocusService}=require('../app/electron/build/focus/service');Module._load=oldLoad;
const {FeishuTransportError,recoverDataReady}=require('../app/electron/build/focus/feishuErrors');
const https=require('node:https'),http=require('node:http');
const {harness,record}=require('./plan-fixture.cjs');
const {readLedger}=require('../app/electron/build/focus/plan');
const secret='private-token-body-route-message';
function mock(action){const original=https.request;let calls=0;https.request=(opts,cb)=>{calls++;const req=new EventEmitter();req.write=()=>{};req.destroy=()=>queueMicrotask(()=>req.emit('error',Error(secret)));req.end=()=>queueMicrotask(()=>action(req,cb));return req};return {restore:()=>{https.request=original},calls:()=>calls};}
test('transport whitelist preserves actionable cause, method and safe category without leaking native text',async()=>{
 for(const code of ['ENOTFOUND','EAI_AGAIN','ECONNRESET','ETIMEDOUT','CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID','EPROTO',secret]){
  const m=mock(req=>req.emit('error',Object.assign(Error(secret),{code})));
  try{await assert.rejects(request('PUT','bitable/v1/apps/'+secret+'/tables/'+secret+'/records/'+secret,{secret},secret),e=>e instanceof FeishuTransportError&&e.code===(code===secret?'UNKNOWN_TRANSPORT':code)&&e.message.includes('写入表格记录')&&e.message.includes('写入结果尚未确认')&&!e.message.includes(secret));assert.equal(m.calls(),1)}finally{m.restore()}
 }
});
test('timeout, response size and interrupted events settle once without parsing partial JSON or retry',async()=>{
 for(const kind of ['timeout','size','aborted','error','close','end']){
  const m=mock((req,cb)=>{if(kind==='timeout'){req.emit('timeout');return}const res=new EventEmitter();res.statusCode=200;res.complete=false;res.setEncoding=()=>{};cb(res);
   if(kind==='size')res.emit('data','x'.repeat(8*1024*1024+1));
   else if(kind==='error')res.emit('error',Object.assign(Error(secret),{code:'ECONNRESET'}));
   else res.emit(kind);
   res.emit('error',Error(secret));res.emit('data','{"code":0}');res.emit('end');res.emit('close');
  });
  try{const code=kind==='timeout'?'CLIENT_TIMEOUT':kind==='size'?'RESPONSE_TOO_LARGE':kind==='error'?'ECONNRESET':'RESPONSE_INTERRUPTED';await assert.rejects(request('GET','bitable/v1/apps/private/tables/private/records',null),e=>e.code===code&&!e.message.includes('private')&&!e.message.includes('尚未确认'));assert.equal(m.calls(),1)}finally{m.restore()}
 }
});
test('success and Feishu application errors remain compatible; transport errors never enter data-ready retry',async()=>{
 for(const code of [0,1254607]){const m=mock((_req,cb)=>{const res=new EventEmitter();res.statusCode=code?400:200;res.complete=true;res.setEncoding=()=>{};cb(res);res.emit('data',JSON.stringify({code,data:{ok:true}}));res.emit('end');res.emit('close')});try{if(code)await assert.rejects(request('GET','public',null),e=>e.code===1254607);else assert.deepEqual(await request('GET','public',null),{code:0,data:{ok:true}})}finally{m.restore()}}
 let n=0;await assert.rejects(recoverDataReady(async()=>{n++;throw new FeishuTransportError({code:'ECONNRESET'},'PUT','records')},async()=>assert.fail('must not replay')));assert.equal(n,1);
});
test('real response parser: server applies PUT then truncates response; promise rejects, lock frees, manual reconciliation does not double count',async()=>{
 const {client,state}=harness(),service=new FocusService(),saved=record(720);service.client=client;
 const raw=client.request;let actualWrites=0,once=true;
 const server=http.createServer((req,res)=>{req.resume();req.on('end',()=>{actualWrites++;res.writeHead(200,{'Content-Type':'application/json','Content-Length':1000});res.write('{"code":');setImmediate(()=>res.destroy())})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const original=https.request;
 https.request=(opts,cb)=>http.request({...opts,hostname:'127.0.0.1',port:server.address().port,agent:false},cb);
 client.request=async(method,route,body,token)=>{const result=await raw(method,route,body,token);if(once&&method==='PUT'){once=false;await request(method,route,body,token)}return result};
 try{
  await assert.rejects(service.sync(saved),e=>e.code==='RESPONSE_INTERRUPTED'||e.code==='ECONNRESET');
  assert.equal(service.planWriting,false);assert.equal(actualWrites,1);assert.equal(state.plans[0].fields['实际分钟'],12);
  const result=await service.sync(saved);assert.equal(result.synced,true);assert.equal(actualWrites,1);assert.equal(state.writes.filter(w=>w.method==='PUT').length,1);assert.equal(readLedger(state.plans[0].fields).entries.length,1);
 }finally{https.request=original;await new Promise(r=>server.close(r))}
});
