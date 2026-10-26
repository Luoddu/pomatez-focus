import {test} from 'node:test';import assert from 'node:assert/strict';
import {withTaskCredit,partialProgress,resumableFreeTasks} from '../app/renderer/src/focus/partialTomato.ts';
import {cutSession,timeParts,confirmSession,restoreSession} from '../app/renderer/src/focus/session.ts';
const task={id:'row',planId:'row',taskId:'task',source:'feishu',sourceKey:'base',title:'同名任务',goalSeconds:1500};
const active={id:'a',task,startedAt:1000,endedAt:861000,plannedSeconds:1500,elapsedSeconds:860,status:'review',sync:'local',syncTarget:'plan',segments:[{start:1000,end:861000}]};
test('cut14m20 saves zero, another task stays independent, resume10m40 counts one and only new seconds',()=>{
 const first=cutSession(active,860);assert.equal(first.completedCount,0);assert.equal(first.acceptedSeconds,860);
 const resumedTask=withTaskCredit(task,[first]);assert.equal(partialProgress(resumedTask).remaining,640);
 const resumed={...active,id:'b',task:resumedTask,startedAt:2000000,elapsedSeconds:640,segments:[{start:2000000,end:2640000}]};assert.deepEqual(timeParts(resumed),{remaining:0,base:640,overtime:0});
 const second=confirmSession(resumed,640,1);assert.equal(first.acceptedSeconds+second.acceptedSeconds,1500);assert.equal(first.completedCount+second.completedCount,1);assert.equal(withTaskCredit({...task,id:'another',planId:'another'},[first]).creditedSeconds,0);
 assert.deepEqual(restoreSession({...resumed,status:'active'}).segments,resumed.segments);assert.equal(restoreSession({...resumed,status:'active'}).status,'paused');assert.equal(timeParts({...resumed,elapsedSeconds:650}).overtime,10);
});
test('free cut exposes a stable resume target including sync-created plan and retires after completion',()=>{
 const free={...task,id:'free-original',planId:undefined,kind:'free'},first={...cutSession({...active,task:free},860),syncedPlanId:'free-plan',sync:'synced'};
 const targets=resumableFreeTasks([first],'base');assert.equal(targets.length,1);assert.equal(targets[0].id,'free-original');assert.equal(targets[0].planId,'free-plan');assert.equal(partialProgress(targets[0]).remaining,640);assert.deepEqual(resumableFreeTasks([first],'other'),[]);
 const done={...first,id:'free-second',task:targets[0],acceptedSeconds:640,completedCount:1};assert.deepEqual(resumableFreeTasks([first,done],'base'),[]);
});
test('credit reconciles before/after sync and stale readback without replay, same-name/source identities isolated',()=>{
 const first=cutSession(active,860),synced={...first,sync:'synced',cloudSynced:true};
 for(const record of [first,synced])assert.equal(withTaskCredit(task,[record]).creditedSeconds,860);
 assert.equal(withTaskCredit({...task,creditedSeconds:860,appliedSessionIds:['a']},[synced]).creditedSeconds,860);
 assert.equal(withTaskCredit({...task,sourceKey:'other'},[first]).creditedSeconds,0);
 const second=cutSession({...active,id:'b',task:withTaskCredit(task,[first]),elapsedSeconds:100},100);assert.equal(partialProgress(withTaskCredit(task,[first,second])).remaining,540);
 assert.throws(()=>cutSession(active,0));assert.throws(()=>cutSession(active,1500));assert.throws(()=>cutSession({...active,status:'saved'},1));assert.equal(active.status,'review');
});
test('local and quick slots reuse stable identity; completed local cycles do not become another partial',()=>{
 const local={id:'local',source:'local',title:'同名任务'},a={...cutSession(active,860),task:local};assert.equal(withTaskCredit(local,[a]).creditedSeconds,860);
 const done={...a,id:'done',startedAt:1000000,endedAt:1100000,completedCount:1};assert.equal(withTaskCredit(local,[a,done]).creditedSeconds,0);
 const quick={...local,source:'feishu',sourceKey:'base',id:'quick-1',quickTask:{id:'q',sequence:1}},q={...a,task:quick};assert.equal(withTaskCredit(quick,[q]).creditedSeconds,860);assert.equal(withTaskCredit({...quick,id:'quick-2'},[q]).creditedSeconds,0);
});
