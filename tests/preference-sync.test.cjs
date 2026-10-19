const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),esbuild=require('esbuild'),Module=require('node:module'),path=require('node:path');
const bundle=esbuild.buildSync({stdin:{contents:'export * from "./app/renderer/src/focus/preferences";export * from "./app/renderer/src/focus/preferenceSync";export {saveWeekGoal} from "./app/renderer/src/focus/weekgoal";',resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const m=new Module(__filename+'.bundle',module);m._compile(bundle,__filename+'.bundle');
const {PreferenceSync,PREFERENCE_DEFAULTS,PREFERENCE_KEYS,preferenceHeads,validPreferenceValue,localPreferences}=m.exports;
const clone=v=>structuredClone(v),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
class Memory {constructor(){this.map=new Map();}getItem(k){return this.map.get(k)??null;}setItem(k,v){this.map.set(k,String(v));}}
function device(cloud,values=clone(PREFERENCE_DEFAULTS),storage=new Memory(),scope='base-A'){
 const d={values,storage,status:null,offline:false,lose:false,failApply:false,live:true,writes:[],reads:0};
 d.create=()=>new PreferenceSync(storage,scope,{
   local:async()=>clone(d.values),validScope:()=>d.live,uuid:randomUUID,notify:s=>d.status=s,
   read:async()=>{d.reads++;if(d.readDelay)await d.readDelay;if(d.offline)throw Error('offline');return clone(cloud);},
   save:async e=>{if(d.offline || d.saveOffline)throw Error('offline');d.writes.push(clone(e));
     const found=cloud.find(v=>v.id===e.id);if(found){assert.deepEqual(found,e);return clone(cloud);}
     assert.deepEqual(preferenceHeads(cloud,e.key).map(v=>v.id).sort(),e.parents.slice().sort());cloud.push(clone(e));
     if(d.lose){d.lose=false;throw Error('lost reply');}return clone(cloud);},
   apply:async(k,v,before)=>{if(d.failApply)throw Error('storage full');assert.deepEqual(d.values[k],before);d.values[k]=clone(v);},
 });d.sync=d.create();return d;
}
test('empty read never creates default settings; explicit enable publishes current 0.6',async()=>{
 const cloud=[],a=device(cloud);a.values.weights.misc=.6;await a.sync.synchronize();assert.equal(cloud.length,0);await a.sync.synchronize(true);assert.equal(cloud.length,6);assert.equal(cloud.find(e=>e.key==='weights').value.misc,.6);
});
test('second device first differences require selection, then uses same global ratio',async()=>{
 const cloud=[],a=device(cloud);a.values.weights.misc=.6;await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();assert.equal(b.values.weights.misc,1);assert.deepEqual(b.status.conflicts.map(c=>c.key),['weights']);await b.sync.synchronize(false,{key:'weights',entryId:preferenceHeads(cloud,'weights')[0].id});assert.equal(b.values.weights.misc,.6);assert.equal(b.status.conflicts.length,0);
});
test('different preference groups merge without overwriting ratios',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();a.values.weights.misc=.6;await a.sync.synchronize();b.values.weekGoals={'2026-10-12':15};await b.sync.synchronize();await a.sync.synchronize();assert.equal(b.values.weights.misc,.6);assert.equal(a.values.weekGoals['2026-10-12'],15);
});
test('offline concurrent same group changes remain visible, local resolution is explicit',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();a.offline=true;a.values.weights.misc=.6;await a.sync.synchronize();b.values.weights.misc=.8;await b.sync.synchronize();a.offline=false;await a.sync.synchronize();assert.equal(a.status.conflicts.length,1);assert.equal(preferenceHeads(cloud,'weights')[0].value.misc,.8);await a.sync.synchronize(false,{key:'weights'});assert.equal(preferenceHeads(cloud,'weights')[0].value.misc,.6);
});
test('lost write response restart reuses exact durable id; no duplicate event',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);a.values.weights.misc=.6;a.lose=true;await a.sync.synchronize();const id=a.writes.at(-1).id;assert.equal(a.status.pending,1);a.sync.stop();a.sync=a.create();await a.sync.synchronize();assert.equal(cloud.filter(e=>e.id===id).length,1);assert.equal(a.status.pending,0);
});
test('cloud choice apply failure retains pending until restart application succeeds; never publishes stale local',async()=>{
 const cloud=[],a=device(cloud);a.values.weights.misc=.6;await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();b.failApply=true;await b.sync.synchronize(false,{key:'weights',entryId:preferenceHeads(cloud,'weights')[0].id});assert.equal(b.status.pending,1);assert.equal(b.values.weights.misc,1);const before=cloud.length;b.sync.stop();b.sync=b.create();await b.sync.synchronize();assert.equal(cloud.length,before);assert.equal(b.status.pending,1);b.failApply=false;await b.sync.synchronize();assert.equal(b.values.weights.misc,.6);assert.equal(b.status.pending,0);assert.equal(cloud.length,before);
});
test('pause survives restart and polling cannot reenable or upload',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);a.sync.disable();a.values.weights.misc=.6;a.sync.stop();a.sync=a.create();const before=cloud.length;await a.sync.synchronize();assert.equal(a.status.enabled,false);assert.equal(cloud.length,before);await a.sync.synchronize(true);assert.equal(a.status.enabled,true);assert.equal(preferenceHeads(cloud,'weights')[0].value.misc,.6);
});
test('concurrent siblings are visible and resolved by explicit choice without deleting history',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);const root=preferenceHeads(cloud,'weights')[0];cloud.push({...clone(root),id:randomUUID(),parents:[root.id],value:{...root.value,misc:.6}});cloud.push({...clone(root),id:randomUUID(),parents:[root.id],value:{...root.value,misc:.8}});await a.sync.synchronize();assert.equal(a.status.conflicts.length,1);assert.equal(a.status.conflicts[0].remote.length,2);const chosen=a.status.conflicts[0].remote.find(e=>e.value.misc===.6);await a.sync.synchronize(false,{key:'weights',entryId:chosen.id});assert.equal(a.values.weights.misc,.6);assert.equal(preferenceHeads(cloud,'weights').length,1);assert.equal(cloud.length,9);
});
test('source switch cancels late reply without local or old-source cache writes',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);const b=device(cloud);let resume;b.readDelay=new Promise(r=>resume=r);const before=[...b.storage.map.entries()];const run=b.sync.synchronize();await Promise.resolve();b.live=false;resume();await run;assert.deepEqual([...b.storage.map.entries()],before);assert.equal(b.values.weights.misc,1);
});
test('allowed preferences only, secret keys and invalid numbers rejected; raw session storage untouched',()=>{
 for(const key of PREFERENCE_KEYS)assert.doesNotThrow(()=>validPreferenceValue(key,PREFERENCE_DEFAULTS[key]));assert.throws(()=>validPreferenceValue('weights',{...PREFERENCE_DEFAULTS.weights,appSecret:'private'}));assert.throws(()=>validPreferenceValue('timer',{focusMinutes:0,restMinutes:5}));assert.throws(()=>validPreferenceValue('weekGoals',{'2026-02-30':20}));const s=new Memory();s.setItem('pomatez-focus-v1','ORIGINAL RECORD AND ACTIVE BYTES');const values=localPreferences(s,PREFERENCE_DEFAULTS.rest,PREFERENCE_DEFAULTS.browser);assert.deepEqual(values,PREFERENCE_DEFAULTS);assert.equal(s.getItem('pomatez-focus-v1'),'ORIGINAL RECORD AND ACTIVE BYTES');
});

test('A-B-A provenance prevents foreign local values from uploading to old Base',async()=>{
 const ca=[],cb=[],shared=new Memory(),values=clone(PREFERENCE_DEFAULTS);
 const a=device(ca,values,shared,'A');await a.sync.synchronize(true);a.sync.stop();
 const seed=device(cb);seed.values.weights.misc=.6;await seed.sync.synchronize(true);
 const b=device(cb,values,shared,'B');await b.sync.synchronize();await b.sync.synchronize(false,{key:'weights',entryId:preferenceHeads(cb,'weights')[0].id});assert.equal(values.weights.misc,.6);b.sync.stop();
 const back=device(ca,values,shared,'A'),before=ca.length;await back.sync.synchronize();assert.equal(ca.length,before);assert.equal(preferenceHeads(ca,'weights')[0].value.misc,1);assert.ok(back.status.conflicts.some(c=>c.key==='weights'));
 await back.sync.synchronize(false,{key:'weights',entryId:preferenceHeads(ca,'weights')[0].id});assert.equal(values.weights.misc,1);
});
test('failed pending persistence blocks external post until exact ID is durable',async()=>{
 const cloud=[],s=new Memory(),a=device(cloud,clone(PREFERENCE_DEFAULTS),s);await a.sync.synchronize(true);
 const set=s.setItem.bind(s);let fail=true;s.setItem=(k,v)=>{if(fail)throw Error('disk full');set(k,v);};
 a.values.weights.misc=.6;const before=cloud.length;
 await a.sync.synchronize();await a.sync.synchronize();assert.equal(cloud.length,before);
 fail=false;await a.sync.synchronize();assert.equal(cloud.length,before+1);assert.equal(preferenceHeads(cloud,'weights')[0].value.misc,.6);
});

test('corrupt baseline/pending/adoption maps and future metadata reject without rewriting bytes',()=>{
 const cache={version:1,enabled:true,baseline:{},pending:{}};
 for(const patch of [{baseline:[]},{pending:[]},{adoptions:[]},{futureSecret:'private'},{adoptions:{weights:{id:randomUUID(),expected:PREFERENCE_DEFAULTS.weights}}}]){
  const s=new Memory(),raw=JSON.stringify({...cache,...patch});s.setItem('pomatez-focus-preference-sync-v1:base-A',raw);
  assert.throws(()=>device([],clone(PREFERENCE_DEFAULTS),s));assert.equal(s.getItem('pomatez-focus-preference-sync-v1:base-A'),raw);
 }
});
test('week goal disk error and silent loss reject; valid save reads back and returns actual goal',()=>{
 const before=global.localStorage,s=new Memory();global.localStorage=s;
 try{const goal=m.exports.saveWeekGoal(Date.parse('2026-10-14T10:00:00+08:00'),15);assert.equal(goal['2026-10-12'],15);const raw=s.getItem('pomatez-focus-weekgoal-v1');s.setItem=()=>{throw Error('disk full');};assert.throws(()=>m.exports.saveWeekGoal(Date.now(),20));assert.equal(s.getItem('pomatez-focus-weekgoal-v1'),raw);s.setItem=()=>{};assert.throws(()=>m.exports.saveWeekGoal(Date.now(),20));}finally{global.localStorage=before;}
});


test('equal local and cloud values retire stale-parent pending after restart without writing a version',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();
 a.saveOffline=true;a.values.weights.misc=.6;await a.sync.synchronize();assert.equal(a.status.pending,1);
 b.values.weights.misc=.6;await b.sync.synchronize();const before=cloud.length;a.sync.stop();a.sync=a.create();a.saveOffline=false;
 await a.sync.synchronize();assert.equal(a.status.conflicts.length,0);assert.equal(a.status.pending,0);assert.equal(cloud.length,before);await a.sync.synchronize();assert.equal(cloud.length,before);
});
test('current agreement supersedes an obsolete unsent value, preserving latest local choice',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();a.saveOffline=true;a.values.weights.misc=.6;await a.sync.synchronize();a.values.weights.misc=.8;b.values.weights.misc=.8;await b.sync.synchronize();const before=cloud.length;a.saveOffline=false;await a.sync.synchronize();assert.equal(a.status.pending,0);assert.equal(a.status.conflicts.length,0);assert.equal(a.values.weights.misc,.8);assert.equal(cloud.length,before);
});
test('equal sibling heads and reordered object fields need no choice or extra cloud event',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);const root=preferenceHeads(cloud,'weights')[0];for(let i=0;i<2;i++)cloud.push({...clone(root),id:randomUUID(),parents:[root.id],value:Object.fromEntries(Object.entries(root.value).reverse())});const before=cloud.length;await a.sync.synchronize();assert.equal(a.status.conflicts.length,0);assert.equal(cloud.length,before);a.values.weights.misc=.6;await a.sync.synchronize();assert.equal(preferenceHeads(cloud,'weights').length,1);assert.equal(preferenceHeads(cloud,'weights')[0].parents.length,2);
});
test('equal remote adoption completes CAS against actual head IDs without replaying stale parents',async()=>{
 const cloud=[],a=device(cloud);a.values.weights.misc=.6;await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();const chosen=preferenceHeads(cloud,'weights')[0];b.saveOffline=true;await b.sync.synchronize(false,{key:'weights',entryId:chosen.id});assert.equal(b.status.pending,1);cloud.push({...clone(chosen),id:randomUUID(),parents:[chosen.id]});const before=cloud.length;b.saveOffline=false;await b.sync.synchronize();assert.equal(b.values.weights.misc,.6);assert.equal(b.status.pending,0);assert.equal(b.status.conflicts.length,0);assert.equal(cloud.length,before);
});
test('different queued adoption is exposed even when displayed local and latest cloud agree',async()=>{
 const cloud=[],a=device(cloud);a.values.weights.misc=.6;await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();b.saveOffline=true;await b.sync.synchronize(false,{key:'weights',entryId:preferenceHeads(cloud,'weights')[0].id});a.values.weights.misc=1;await a.sync.synchronize();b.saveOffline=false;await b.sync.synchronize();const c=b.status.conflicts.find(c=>c.key==='weights');assert(c);assert.equal(c.local.misc,1);assert.equal(c.remote[0].value.misc,1);assert.equal(c.pending.misc,.6);assert.equal(b.status.pending,1);
});
test('equal pending target does not overwrite a newer local edit after adoption CAS mismatch',async()=>{
 const cloud=[],a=device(cloud);a.values.weights.misc=.6;await a.sync.synchronize(true);const b=device(cloud);await b.sync.synchronize();b.saveOffline=true;await b.sync.synchronize(false,{key:'weights',entryId:preferenceHeads(cloud,'weights')[0].id});const root=preferenceHeads(cloud,'weights')[0];cloud.push({...clone(root),id:randomUUID(),parents:[root.id]});b.values.weights.misc=.8;b.saveOffline=false;const before=cloud.length;await b.sync.synchronize();assert.equal(b.values.weights.misc,.8);assert.equal(b.status.pending,1);assert.equal(b.status.conflicts.length,1);assert.equal(cloud.length,before);
});
test('equal values cannot hide an inconsistent exact ID receipt',async()=>{
 const cloud=[],a=device(cloud);await a.sync.synchronize(true);a.saveOffline=true;a.values.weights.misc=.6;await a.sync.synchronize();const cache=JSON.parse(a.storage.getItem('pomatez-focus-preference-sync-v1:base-A')),pending=cache.pending.weights;cloud.push({...clone(pending),at:pending.at+1});a.saveOffline=false;await a.sync.synchronize();assert.match(a.status.message,/回读不一致/);assert.equal(a.status.pending,1);
});
