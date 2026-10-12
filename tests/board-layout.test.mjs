import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_LAYOUT_KEY,readBoardLayout,saveBoardLayout,projectBoardLayout,moveBoardGroup} from '../app/renderer/src/focus/boardLayout.ts';
const row=(key,quad='iu',extra={})=>({id:key+'-1',taskId:key,planId:key+'-1',source:'feishu',sourceKey:'A',title:key,quadrant:quad,...extra});
const rows=[row('a','iu'),row('b','iu',{projectType:'research'}),row('b','iu',{id:'b-2',planId:'b-2',creditedSeconds:70,appliedSessionIds:['r']}),row('c','inu'),row('d','iu',{kind:'done',doneToday:1})];
const store=()=>{const m=new Map();return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('default research priority still works; manual order above/below overrides it without altering rows',()=>{
 const before=structuredClone(rows);assert.deepEqual(projectBoardLayout(rows,null).map(t=>t.id),['b-1','b-2','a-1','c-1','d-1']);
 let layout=moveBoardGroup(rows,null,'A','a','iu','b');
 assert.deepEqual(projectBoardLayout(rows,layout).filter(t=>t.quadrant==='iu').map(t=>t.id),['a-1','b-1','b-2','d-1']);
 layout=moveBoardGroup(rows,layout,'A','a','iu','d',true);assert.deepEqual(projectBoardLayout(rows,layout).filter(t=>t.quadrant==='iu').map(t=>t.id),['b-1','b-2','d-1','a-1']);assert.deepEqual(rows,before);
});
test('group moves intact into populated or empty quadrant; IDs, credits, completed group unchanged',()=>{
 let layout=moveBoardGroup(rows,null,'A','b','inu','c');let projected=projectBoardLayout(rows,layout);
 const b=projected.filter(t=>t.taskId==='b');assert.ok(b.every(t=>t.quadrant==='inu'));assert.equal(b[1].creditedSeconds,70);assert.deepEqual(b[1].appliedSessionIds,['r']);assert.equal(b[1].planId,'b-2');
 layout=moveBoardGroup(rows,layout,'A','d','unu');assert.equal(projectBoardLayout(rows,layout).find(t=>t.taskId==='d').kind,'done');
});
test('durable preference survives fresh rows and restart; new tasks remain and different source stays isolated',()=>{
 const s=store(),layout=moveBoardGroup(rows,null,'A','a','unu');saveBoardLayout(s,layout);assert.deepEqual(readBoardLayout(s,'A'),layout);assert.equal(readBoardLayout(s,'B'),null);
 const fresh=[...structuredClone(rows),row('new')];assert.equal(projectBoardLayout(fresh,readBoardLayout(s,'A')).find(t=>t.taskId==='a').quadrant,'unu');assert.equal(projectBoardLayout(fresh,layout).length,fresh.length);
 assert.equal(projectBoardLayout([row('a','iu',{sourceKey:'B'})],layout)[0].quadrant,'iu');
 const manual=moveBoardGroup(rows,null,'A','a','iu','b');
 assert.deepEqual(projectBoardLayout([row('a','iu',{sourceKey:'B'}),row('b','iu',{sourceKey:'B',projectType:'research'})],manual).map(t=>t.taskId),['b','a']);
});
test('invalid/foreign/stale/temporary moves fail while valid task still moves',()=>{
 for(const args of [['A','missing','iu'],['B','a','iu'],['A','a','bad'],['A','a','iu','gone'],['A','a','iu','c']])assert.throws(()=>moveBoardGroup(rows,null,...args));
 assert.throws(()=>moveBoardGroup([row('q','iu',{quickTask:{id:'q',sequence:1}})],null,'A','q','inu'));
 assert.throws(()=>moveBoardGroup([row('q','iu',{kind:'pending'})],null,'A','q','inu'));
 assert.equal(projectBoardLayout(rows,moveBoardGroup(rows,null,'A','a','inu')).find(t=>t.taskId==='a').quadrant,'inu');
});
test('malformed schema, duplicate IDs, wrong scope and failed storage never masquerade as saved; clean save works',()=>{
 const s=store(),layout=moveBoardGroup(rows,null,'A','a','inu');const key=BOARD_LAYOUT_KEY+':A';
 for(const bad of ['{',JSON.stringify({...layout,scope:'B'}),JSON.stringify({...layout,order:['a','a']}),JSON.stringify({...layout,quadrants:[{key:'a',quadrant:'bad'}]})]){s.setItem(key,bad);assert.equal(readBoardLayout(s,'A'),null)}
 assert.throws(()=>saveBoardLayout({getItem:()=>null,setItem:()=>{throw Error('quota')}},layout));assert.throws(()=>saveBoardLayout({getItem:()=>null,setItem:()=>{}},layout));saveBoardLayout(s,layout);assert.deepEqual(readBoardLayout(s,'A'),layout);
});
test('metadata contains IDs/order/quadrant only; local task arrangement has separate scope',()=>{
 const s=store(),local=[row('local','iu',{source:'local',sourceKey:undefined,title:'private task'})];const layout=moveBoardGroup(local,null,'local','local','inu');saveBoardLayout(s,layout);assert.equal(s.getItem(BOARD_LAYOUT_KEY+':local').includes('private task'),false);assert.equal(projectBoardLayout(local,layout)[0].quadrant,'inu');assert.equal(readBoardLayout(s,'A'),null);
});
