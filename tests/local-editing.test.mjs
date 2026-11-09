import test from 'node:test';
import assert from 'node:assert/strict';
import {EditQueue} from '../app/renderer/src/focus/editQueue.ts';
import {projectLocalCompletion,sameTask} from '../app/renderer/src/focus/localBoard.ts';
import {setTaskCategory,taskCategory,saveBoardLayout,readBoardLayout,projectBoardLayout,rebindBoardGroup,categoryApplies} from '../app/renderer/src/focus/boardLayout.ts';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
const task={id:'plan1',planId:'plan1',taskId:'task',source:'feishu',sourceKey:'base',title:'Same',plannedToday:2,doneToday:0,projectType:'research'};
const day=new Date().setHours(0,0,0,0);
const record={id:'record',task,status:'saved',startedAt:day+1000,endedAt:day+1501000,acceptedSeconds:1500,plannedSeconds:1500,completedCount:1,sync:'pending',revision:0,colorRevision:0};
const intent=(before,after,kind='color',id='edit')=>({id,sourceKey:'base',kind,state:'pending',payload:{id,sourceKey:'base',before,after}});
test('unsubmitted color/edit/color coalesce with original baseline, latest values and cold restore',()=>{
 const s=store(),q=new EditQueue(s);
 q.revise([intent(record,{...record,colorOverride:'software',colorRevision:1})]);
 const a=q.project(record,'base');q.revise([intent(a,{...a,completedCount:2,revision:1},'edit','second')]);
 const b=q.project(record,'base');q.revise([intent(b,{...b,colorOverride:'personal',colorRevision:2},'color','third')]);
 assert.equal(q.entries.length,1);assert.equal(q.entries[0].id,'edit');assert.deepEqual(q.entries[0].payload.before,record);
 assert.equal(q.entries[0].kind,'edit');assert.equal(q.entries[0].payload.after.colorRevision,1);
 const restored=new EditQueue(s).project(record,'base');assert.equal(restored.completedCount,2);assert.equal(restored.colorOverride,'personal');
 assert.deepEqual(q.project(record,'foreign'),record);
 assert.throws(()=>q.revise([intent(record,{...record,completedCount:3},'edit')]),/已改变/);
});
test('in-flight and failed edits retain original payload while unrelated draft edits remain usable',async()=>{
 const s=store(),q=new EditQueue(s);q.revise([intent(record,{...record,colorOverride:'personal',colorRevision:1})]);
 let release;const sent=q.drain('base',()=>new Promise(r=>{release=r}));
 const current=q.project(record,'base');assert.throws(()=>q.revise([intent(current,{...current,colorOverride:'misc'})]),/已发送/);
 const other={...record,id:'other'};q.revise([intent(other,{...other,colorOverride:'misc'},'color','other')]);
 assert.equal(q.entries.length,2);release(false);await sent;
 assert.equal(new EditQueue(s).entries[0].attempted,true);
});
test('batch replacement is atomic and failed storage never acknowledges edit',()=>{
 const s=store(),q=new EditQueue(s);q.revise([intent(record,{...record,colorOverride:'personal'})]);
 const before=JSON.stringify(q.entries);s.setItem=()=>{throw Error('full')}; // queue captured the same store
 assert.throws(()=>q.revise([intent(q.project(record,'base'),{...record,colorOverride:'misc'})]),/空间/);
 assert.equal(JSON.stringify(q.entries),before);
});
test('local completion removes saved slot before sync, keeps partial slot, isolates source and does not double after refresh',()=>{
 const second={...task,id:'plan2',planId:'plan2'}, rows=[task,second];
 const first=projectLocalCompletion(rows,[record],day);
 assert.equal(first[0].kind,'done');assert.notEqual(first[1].kind,'done');assert.equal(first[0].doneToday,1);
 assert.equal(projectLocalCompletion(rows,[{...record,completedCount:0,acceptedSeconds:600}],day)[0].kind,undefined);
 assert.equal(projectLocalCompletion(rows,[{...record,task:{...task,sourceKey:'foreign'}}],day)[0].doneToday,0);
 const refreshed=projectLocalCompletion([{...second,doneToday:1}], [{...record,cloudSynced:true,sync:'synced'}],day);
 assert.equal(refreshed[0].doneToday,1);assert.notEqual(refreshed[0].kind,'done');
 assert.equal(projectLocalCompletion(rows,[record],day+86400000)[0].kind,undefined);
});
test('task preference is instant, durable, scoped, rebinds quick identity, leaves original project/history untouched',()=>{
 const s=store();let layout=setTaskCategory(null,'base',task,'software');saveBoardLayout(s,layout);
 layout=readBoardLayout(s,'base');assert.equal(taskCategory(task,layout).type,'software');
 assert.equal(projectBoardLayout([task],layout)[0].tomatoType,'software');assert.equal(projectBoardLayout([task],layout)[0].projectType,'research');assert.equal(task.projectType,'research');
 assert.equal(taskCategory({...task,sourceKey:'foreign'},layout),undefined);
 assert.equal(sameTask(task,{...task,id:'another-plan'}),true);assert.equal(sameTask(task,{...task,taskId:'same-name'}),false);
 const quick={...task,taskId:'quick-q'};layout=setTaskCategory(layout,'base',quick,'misc');
 const rebound=rebindBoardGroup(layout,'quick-q','real');assert.equal(taskCategory({...task,taskId:'real'},rebound).type,'misc');
 assert.equal(taskCategory(task,rebound).type,'software');
 assert.throws(()=>setTaskCategory(layout,'foreign',task,'misc'));
 assert.throws(()=>saveBoardLayout({getItem:()=>null,setItem:()=>{}},layout),/未能保存/);
});
test('explicit discarded color remains discarded after cold start; a newer task choice can apply again',()=>{
 const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),get length(){return m.size},key:i=>[...m.keys()][i]};
 const q=new EditQueue(s),item={...intent(record,{...record,colorOverride:'software'}),state:'failed'};
 q.add(item);q.discardFailedEdit('base',item.id);
 const at=JSON.parse(s.getItem('pomatez-discarded-edit-v1:edit')).discardedAt;
 assert.equal(new EditQueue(s).categoryDiscarded(record,'base','software',at-1),true);
 assert.equal(new EditQueue(s).categoryDiscarded(record,'base','software',at+1),false);
 assert.equal(q.categoryDiscarded(record,'foreign','software',at-1),false);
 assert.equal(q.categoryDiscarded(record,'base','personal',at-1),false);
});
test('task type applies to free focus bound to a Base and multiple completed slots without crossing task IDs',()=>{
 const free={...task,source:'local',kind:'free',taskId:undefined};
 assert.equal(taskCategory(free,setTaskCategory(null,'base',free,'software')).type,'software');
 const rows=[1,2,3].map(n=>({...task,id:'p'+n,planId:'p'+n,title:`Same · 第 ${n} 个番茄`,plannedToday:3}));
 const r={...record,task:rows[0],completedCount:2};
 const projected=projectLocalCompletion(rows,[r],day);
 assert.deepEqual(projected.map(t=>t.kind),['done','done',undefined]);assert.equal(projected[0].doneToday,2);
});
test('upgrade preserves unknown old pending payload for idempotent send; only explicit new draft is editable',async()=>{
 const s=store(),legacy=intent(record,{...record,colorOverride:'software',colorRevision:1});
 s.setItem('pomatez-quick-edit-outbox-v1',JSON.stringify([legacy]));
 const old=new EditQueue(s);assert.equal(old.entries[0].attempted,true);
 assert.throws(()=>old.revise([intent(old.project(record,'base'),{...record,colorOverride:'research'})]),/已发送/);
 let sent;await old.drain('base',async e=>{sent=e});assert.deepEqual(sent.payload,legacy.payload);
 const freshStore=store(),fresh=new EditQueue(freshStore);fresh.revise([legacy]);assert.equal(fresh.entries[0].attempted,false);
 const restored=new EditQueue(freshStore); // constructor preserves explicit false
 assert.equal(restored.entries[0].attempted,false);
 restored.revise([intent(restored.project(record,'base'),{...record,colorOverride:'research',colorRevision:2})]);
 assert.equal(restored.project(record,'base').colorOverride,'research');
});
test('completed task choice never rewrites newer remote color; explicit new choice and newly saved local record still work',()=>{
 const original={...record,cloudSynced:true};
 const layout=setTaskCategory(null,'base',task,'software',[original]),choice=taskCategory(task,layout);
 assert.equal(categoryApplies(original,choice),true);
 const applied={...original,colorOverride:'software',colorRevision:1};assert.equal(categoryApplies(applied,choice),false);
 const remote={...applied,colorOverride:'research',colorRevision:2};assert.equal(categoryApplies(remote,choice),false);
 assert.equal(categoryApplies(remote,taskCategory(task,setTaskCategory(layout,'base',task,'personal',[remote]))),true);
 assert.equal(categoryApplies({...record,id:'new'},choice),true);
 assert.equal(categoryApplies({...record,id:'remote-new',cloudSynced:true},choice),false);
 const projected=projectBoardLayout([task],layout)[0];assert.equal(projected.projectType,'research');
 const reset=setTaskCategory(layout,'base',task,'',[applied]);
 assert.equal(projectBoardLayout([task],reset)[0].projectType,'research');
 assert.equal(projected.tomatoType,'software');assert.equal(projectBoardLayout([task],reset)[0].tomatoType,undefined);
});
