import test from "node:test";
import assert from "node:assert/strict";
import { EditQueue } from "../app/renderer/src/focus/editQueue.ts";
const store = () => {
  let text = null;
  return {
    getItem: () => text,
    setItem: (_, v) => {
      text = v;
    },
  };
};
test("outbox persists intent identity, waits for sync, retries failure, and isolates Base", async () => {
  const s = store();
  let q = new EditQueue(s);
  q.add({
    id: "one",
    sourceKey: "base",
    kind: "task",
    payload: { id: "one" },
    state: "pending",
  });
  q = new EditQueue(s);
  let calls = 0;
  await q.drain("other", async () => calls++);
  await q.drain(
    "base",
    async () => calls++,
    () => false
  );
  assert.equal(calls, 0);
  await q.drain("base", async () => {
    calls++;
    throw Error("offline");
  });
  assert.equal(q.entries[0].state, "failed");
  await q.drain("base", async () => calls++);
  assert.equal(calls, 1);
  q.retry("base");
  await q.drain("base", async (e) => {
    assert.equal(e.id, "one");
    calls++;
  });
  assert.equal(q.entries.length, 0);
  assert.equal(new EditQueue(s).entries.length, 0);
});
test("corrupt storage and failed persistence never acknowledge new edits", () => {
  const q = new EditQueue({
    getItem: () => "broken",
    setItem: () => {
      throw Error("must not write");
    },
  });
  assert.ok(q.storageError);
  assert.throws(() => q.add({ id: "x" }));
  const full = new EditQueue({
    getItem: () => null,
    setItem: () => {
      throw Error("full");
    },
  });
  assert.throws(() => full.add({ id: "x" }), /空间/);
  assert.equal(full.entries.length, 0);
});

test("postponed sender keeps pending intent; resumed normal sender retires once", async () => {
  const s=store(),q=new EditQueue(s);
  q.add({id:'deferred',sourceKey:'base',kind:'task',state:'pending',payload:{id:'deferred',sourceKey:'base',title:'Synthetic',count:1,day:0}});
  let calls=0;
  await q.drain('base',async()=>{calls++;return false});
  assert.equal(calls,1);assert.equal(q.entries[0].state,'pending');
  assert.equal(new EditQueue(s).entries[0].id,'deferred');
  await q.drain('base',async()=>{calls++});
  assert.equal(calls,2);assert.equal(q.entries.length,0);
});

test("discard only one failed edit after verified local backup; records and other intents remain", () => {
  const data=new Map(),s={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},q=new EditQueue(s);
  const record={id:'record',task:{id:'p1'},acceptedSeconds:1500},before=JSON.stringify(record);
  const item={id:'bad-edit',sourceKey:'base',kind:'edit',state:'failed',error:'offline',payload:{id:'bad-edit',sourceKey:'base',before:record,after:{...record,acceptedSeconds:1800}}};
  q.add(item);q.add({id:'other',sourceKey:'base',kind:'task',state:'pending',payload:{id:'other',sourceKey:'base',title:'Synthetic',count:1,day:0}});
  assert.throws(()=>q.discardFailedEdit('other-source','bad-edit'));
  assert.throws(()=>q.discardFailedEdit('base','other'));
  q.running=true;assert.throws(()=>q.discardFailedEdit('base','bad-edit'));q.running=false;
  q.discardFailedEdit('base','bad-edit');
  assert.deepEqual(q.entries.map(e=>e.id),['other']);assert.equal(JSON.stringify(record),before);
  assert.deepEqual(JSON.parse(s.getItem('pomatez-discarded-edit-v1:bad-edit')).entry,item);
  assert.deepEqual(new EditQueue(s).entries.map(e=>e.id),['other']);
});

test("unverified discard backup leaves failed edit pending and does not touch outbox", () => {
  const data=new Map(),s={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(!k.startsWith('pomatez-discarded'))data.set(k,v)}},q=new EditQueue(s);
  q.add({id:'bad-edit',sourceKey:'base',kind:'edit',state:'failed',payload:{before:{id:'record'},after:{id:'record'}}});
  const raw=s.getItem('pomatez-quick-edit-outbox-v1');assert.throws(()=>q.discardFailedEdit('base','bad-edit'),/恢复副本/);
  assert.equal(q.entries.length,1);assert.equal(s.getItem('pomatez-quick-edit-outbox-v1'),raw);
});

test("failed color intent shares safe discard but pending color remains protected", () => {
  const data=new Map(),s={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},q=new EditQueue(s);
  const record={id:'record',task:{id:'p1'},acceptedSeconds:1500,colorOverride:'research'},raw=JSON.stringify(record);
  const item={id:'color-edit',sourceKey:'base',kind:'color',state:'pending',payload:{before:record,after:{...record,colorOverride:'study'}}};
  q.add(item);assert.throws(()=>q.discardFailedEdit('base','color-edit'));
  q.entries[0].state='failed';q.discardFailedEdit('base','color-edit');
  assert.equal(q.entries.length,0);assert.equal(JSON.stringify(record),raw);
  assert.deepEqual(JSON.parse(s.getItem('pomatez-discarded-edit-v1:color-edit')).entry,item);
});
