import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QuietSync,QUIET_SYNC_KEY} from '../app/renderer/src/focus/quietSync.ts';
const store=()=>{const m=new Map();return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
const change=(id,source='A',value='v')=>({key:id,source,value});
test('last local change resets five minutes; receipt removal does not postpone siblings',()=>{
  const s=store(),q=new QuietSync(s);q.observe([],0);q.observe([change('a')],1000);
  assert.equal(q.allowed('A',300000),false);
  q.observe([change('a'),change('b')],200000);
  assert.equal(q.allowed('A',499999),false);assert.equal(q.allowed('A',500000),true);
  q.observe([change('b')],500001);assert.equal(q.allowed('A',500001),true);
  q.touch('A',500002);assert.equal(q.allowed('A',500002),false);
});
test('cold restart preserves deadline; manual flush is immediate and a new mutation cancels it',()=>{
  const s=store(),q=new QuietSync(s);q.observe([change('a')],1000);
  const restored=new QuietSync(s);restored.observe([change('a')],2000);
  assert.equal(restored.remaining('A',2000),299000);
  restored.flush('A');assert.equal(restored.allowed('A',2001),true);
  restored.observe([change('a'),change('b')],2002);assert.equal(restored.allowed('A',2002),false);
  assert.equal(restored.allowed('B',500000),false);
  restored.observe([change('a'),change('b'),change('c','B')],3000);
  assert.equal(restored.allowed('A',302002),true);assert.equal(restored.allowed('B',302002),false);
});
test('bad metadata stays untouched; manual sync works, new local work invalidates override',()=>{
  const s=store();s.setItem(QUIET_SYNC_KEY,'broken');const q=new QuietSync(s);
  q.observe([change('a')],0);assert.ok(q.error);assert.equal(s.getItem(QUIET_SYNC_KEY),'broken');
  assert.equal(q.allowed('A',999999),false);q.flush('A');assert.equal(q.allowed('A',0),true);
  q.observe([change('a'),change('b')],1);assert.equal(q.allowed('A',1),false);
  assert.equal(s.getItem(QUIET_SYNC_KEY),'broken');
});
