const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ProjectCatalog}=require('../app/renderer/src/focus/projectCatalog.ts');
const result=(sourceKey,id='p')=>({sourceKey,projects:[{id,name:id}]});
test('session reuse has no minute expiry; explicit refresh and concurrent requests coalesce',async()=>{
 const c=new ProjectCatalog();let calls=0,resolve;
 const read=()=>{calls++;return new Promise(r=>resolve=r)};
 const first=c.load('A',read);assert.equal(c.load('A',read,true),first);
 await Promise.resolve();resolve(result('A'));await first;
 const now=Date.now;Date.now=()=>now()+3600000;
 try{assert.equal(await c.load('A',read),(await first));assert.equal(calls,1)}finally{Date.now=now}
 const refresh=c.load('A',read,true);assert.equal(c.load('A',read,true),refresh);
 assert.equal((await c.load('A',read))[0].id,'p');
 await Promise.resolve();resolve(result('A','new'));assert.equal((await refresh)[0].id,'new');assert.equal(calls,2);
});
test('failed first read retries; failed refresh preserves usable previous catalog',async()=>{
 const c=new ProjectCatalog();const fail=()=>Promise.reject(Error('offline'));
 await assert.rejects(c.load('A',fail),/offline/);
 await c.load('A',async()=>result('A'));
 await assert.rejects(c.load('A',fail,true),/offline/);
 assert.equal((await c.load('A',fail))[0].id,'p');
});
test('source switch and clear reject late responses and never expose another catalog',async()=>{
 const c=new ProjectCatalog();let resolve;
 const old=c.load('A',()=>new Promise(r=>resolve=r));await Promise.resolve();
 assert.equal((await c.load('B',async()=>result('B','b')))[0].id,'b');
 resolve(result('A'));await assert.rejects(old,/连接已变化/);
 assert.equal((await c.load('B',async()=>{throw Error('must reuse')}))[0].id,'b');
 c.clear();await assert.rejects(c.load('B',async()=>result('A')),/连接已变化/);
 assert.equal((await c.load('B',async()=>result('B','fresh')))[0].id,'fresh');
});
