const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const file=require('node:path').resolve(__dirname,'../app/renderer/src/focus/syncFailures.ts');
const moduleUnderTest=new Module(file,module);moduleUnderTest._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {SyncFailures}=moduleUnderTest.exports;
const record=(extra={})=>({id:'synthetic',startedAt:1000,endedAt:2000,acceptedSeconds:1,completedCount:0,task:{source:'feishu',sourceKey:'A'},...extra});
test('failed revision stays blocked with exact message until its cloud receipt; read-only checks do not clear it',()=>{
 const f=new SyncFailures(),r=record();f.add('A',r,'写回记录失败：synthetic conflict');
 assert.equal(f.has('A',r),true);assert.deepEqual(f.messages('A',[r]),['写回记录失败：synthetic conflict']);
 assert.deepEqual(f.messages('A',[r]),['写回记录失败：synthetic conflict']);
 assert.deepEqual(f.messages('A',[{...r,sync:'synced'}]),['写回记录失败：synthetic conflict']);
 assert.deepEqual(f.messages('A',[{...r,cloudSynced:true}]),[]);assert.equal(f.has('A',r),false);
});
test('only matching source retries; another source keeps error and pending records are unchanged',()=>{
 const f=new SyncFailures(),a=record(),b=record({task:{source:'feishu',sourceKey:'B'}}),before=structuredClone([a,b]);
 f.add('A',a,'A failed');f.add('B',b,'B failed');f.retry('A');assert.equal(f.has('A',a),false);assert.equal(f.has('B',b),true);
 assert.deepEqual(f.messages('A',[a,b]),[]);assert.deepEqual(f.messages('B',[a,b]),['B failed']);assert.deepEqual([a,b],before);
});
test('new explicit record revision is eligible; stale diagnostics retire without changing or deleting original records',()=>{
 const f=new SyncFailures(),old=record(),edited=record({revision:1,acceptedSeconds:.5});f.add('A',old,'old failure');
 assert.equal(f.has('A',edited),false);assert.deepEqual(f.messages('A',[edited]),[]);assert.equal(f.has('A',old),false);
 const quick=record({task:{source:'feishu',sourceKey:'A',quickTask:{id:'q'}}});f.add('A',quick,'quick');assert.deepEqual(f.messages('A',[quick]),[]);
});
