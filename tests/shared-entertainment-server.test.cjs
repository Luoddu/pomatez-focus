const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');const path=require('node:path');const crypto=require('node:crypto');
const {Authority,createServer,dateOf}=require('../services/shared-entertainment/server.cjs');
const initial=Date.parse('2026-11-16T12:00:00+08:00');
function setup(t,options={}){const dir=mkdtempSync(path.join(tmpdir(),'p095-authority-'));let now=initial;
  const file=path.join(dir,'test.sqlite');let a=new Authority(file,{...options,now:()=>now});
  t.after(()=>{a.close();rmSync(dir,{recursive:true,force:true});});
  return {get a(){return a;},time:n=>now=n,advance:n=>now+=n,restart(){a.close();a=new Authority(file,{...options,now:()=>now});},body:id=>({day:dateOf(now),id})};}
test('one shared grant, restart and duplicate request do not increase allowance',t=>{
 const f=setup(t);f.a.call('release','one',f.body('release'));
 const a=f.a.call('grant','one',f.body('first')),b=f.a.call('grant','two',f.body('first'));
 assert.equal(a.permitUntil,b.permitUntil);assert.equal(b.reservedMs,20000);
 f.restart();assert.equal(f.a.call('grant','one',f.body('first')).reservedMs,20000);
 f.advance(21000);const replay=f.a.call('grant','one',f.body('first'));assert.equal(replay.operation.deadline,a.permitUntil);assert.equal(replay.reservedMs,20000);
 assert.equal(f.a.call('grant','two',f.body('second')).reservedMs,40000);
 assert.throws(()=>f.a.call('release','one',f.body('first')),/conflict/);
});
test('quota exhausted blocks grants, next day permits genuine new daily allowance',t=>{
 const f=setup(t,{weekdaySeconds:25});f.a.call('release','one',f.body('r'));
 f.a.call('grant','one',f.body('a'));f.advance(20000);const b=f.a.call('grant','two',f.body('b'));assert.equal(b.remainingMs,0);assert.equal(b.operation.deadline,initial+25000);
 f.advance(5000);assert.equal(f.a.call('grant','one',f.body('c')).operation.deadline,0);
 f.advance(86400000);f.a.call('release','two',f.body('r2'));assert.equal(f.a.call('grant','two',f.body('d')).remainingMs,5000);
 assert.throws(()=>f.a.call('grant','one',{id:'new',day:'2026-11-16'}),/invalid/);
});
test('cooldown and release are shared absolute deadlines, replay cannot restart them',t=>{
 const f=setup(t);const r=f.a.call('release','one',f.body('a'));f.advance(10000);
 assert.equal(f.a.call('release','two',f.body('b')).releaseUntil,r.releaseUntil);
 const c=f.a.call('cooldown','one',{...f.body('c'),key:'reminder'});f.advance(5000);
 assert.equal(f.a.call('cooldown','two',{...f.body('d'),key:'reminder'}).cooldownUntil,c.cooldownUntil);
 assert.equal(f.a.call('grant','two',f.body('e')).operation.deadline,0);
 f.advance(120000);assert.equal(f.a.call('cooldown','two',{...f.body('f'),key:'reminder'}).cooldownUntil,c.cooldownUntil);
 assert.ok(f.a.call('grant','two',f.body('g')).operation.deadline>0);
 f.a.call('resume','one',f.body('h'));assert.equal(f.a.call('grant','two',f.body('i')).operation.deadline,0);
});
test('usage uploads merge overlapping retries and cannot erase already received time',t=>{
 const f=setup(t),interval={start:initial-10000,end:initial,site:'bilibili'};
 f.a.call('usage','one',{day:dateOf(initial),intervals:[interval,interval]});
 f.a.call('usage','one',{day:dateOf(initial),intervals:[]});
 const stats=f.a.call('statistics','two',{days:7});assert.equal(stats.sessions.length,1);assert.deepEqual(stats.sessions[0],interval);assert.equal(stats.coverage,'reported-only');
 assert.throws(()=>f.a.call('usage','one',{day:dateOf(initial),intervals:[{...interval,end:initial+1}]}),/interval/);
 assert.throws(()=>f.a.call('statistics','two',{days:10000}),/range/);
});
test('backwards server clock fails closed without losing persisted quota',t=>{
 const f=setup(t);f.a.call('release','one',f.body('a'));f.a.call('grant','one',f.body('b'));f.time(initial-10000);
 assert.throws(()=>f.a.call('state','two'),/clock moved/);f.time(initial);assert.equal(f.a.call('state','two').reservedMs,20000);
});
test('real HTTP two authenticated clients race safely; invalid authentication denied',async t=>{
 const f=setup(t),a=crypto.randomBytes(32).toString('hex'),b=crypto.randomBytes(32).toString('hex');
 const server=createServer(f.a,{[a]:'one',[b]:'two'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const url='http://127.0.0.1:'+server.address().port;
 const call=async(action,token,body={})=>{const r=await fetch(url+'/v1/'+action,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 assert.equal((await call('state','bad')).status,401);assert.equal((await call('state',a)).status,200);
 await call('release',a,f.body('r'));
 const result=await Promise.all(Array.from({length:12},(_,i)=>call('grant',i%2?a:b,f.body('g'+i))));
 assert.ok(result.every(x=>x.status===200&&x.body.reservedMs===20000));assert.equal(new Set(result.map(x=>x.body.permitUntil)).size,1);
 assert.equal((await call('unknown',a)).status,404);assert.equal((await call('state',b)).body.remainingMs,880000);
});

test('midnight rolls daily quota but does not erase an active cooldown',t=>{
 const f=setup(t);f.time(Date.parse('2026-11-16T23:59:30+08:00'));
 const before=f.a.call('cooldown','one',{...f.body('c'),key:'night'});f.advance(60000);
 const after=f.a.call('state','two');assert.equal(after.day,'2026-11-17');assert.equal(after.cooldownUntil,before.cooldownUntil);
 f.a.call('release','two',f.body('r'));assert.equal(f.a.call('grant','two',f.body('g')).operation.deadline,0);
 f.advance(60000);assert.ok(f.a.call('grant','two',f.body('g2')).operation.deadline>0);
});
