import test from "node:test";
import assert from "node:assert/strict";
import { DAILY_REFRESH_KEY, readRefresh, writeRefresh, refreshDue, refreshAttempt, nextRefreshDelay, refreshLabel } from "../app/renderer/src/focus/dailyRefresh.ts";
const clock=(d,h,m)=>new Date(2026,9,d,h,m).getTime();
const memory=()=>{const values=new Map();return { getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v) };};
test("08:30 due, persisted attempt prevents same-day replay but early manual permits scheduled run",()=>{
  assert.equal(refreshDue(clock(10,8,29),null),false);
  assert.equal(refreshDue(clock(10,8,30),null),true);
  const stamp={source:"A",attemptedAt:clock(10,8,30),completedAt:0};
  assert.equal(refreshDue(clock(10,9,0),stamp),false);
  assert.equal(refreshDue(clock(11,9,0),stamp),true);
  assert.equal(refreshDue(clock(10,8,30),{...stamp,attemptedAt:clock(10,8,20)}),true);
  assert.equal(refreshDue(clock(10,8,31),{...stamp,attemptedAt:clock(10,8,29),completedAt:clock(10,8,31)}),false);
  assert.equal(refreshDue(clock(10,9,0),{...stamp,attemptedAt:clock(10,9,30)}),false);
  assert.equal(nextRefreshDelay(clock(10,8,29)),60000);
  assert.equal(nextRefreshDelay(clock(10,8,30)),86400000);
});
test("success label uses actual completion, excludes other days and future clock",()=>{
  const stamp={source:"A",attemptedAt:clock(10,8,30),completedAt:clock(10,8,33)};
  assert.equal(refreshLabel(stamp,clock(10,9,0)),"10.10 周六 08:33已刷新");
  assert.equal(refreshLabel(stamp,clock(11,9,0)),"");
  assert.equal(refreshLabel(stamp,clock(10,8,31)),"");
  assert.equal(refreshLabel({...stamp,completedAt:0},clock(10,9,0)),"");
});
test("source-separated bounded metadata survives reload; corruption and false receipts rejected",()=>{
  const s=memory(); for(let i=0;i<18;i++)writeRefresh(s,{source:`source-${i}`,attemptedAt:clock(10,8,30)+i,completedAt:clock(10,8,30)+i});
  assert.equal(JSON.parse(s.getItem(DAILY_REFRESH_KEY)).entries.length,16);
  assert.equal(readRefresh(s,"source-0"),null);
  assert.equal(readRefresh(s,"source-17").completedAt,clock(10,8,30)+17);
  const raw="{broken";s.setItem(DAILY_REFRESH_KEY,raw);
  assert.throws(()=>writeRefresh(s,{source:"A",attemptedAt:0,completedAt:0}));assert.equal(s.getItem(DAILY_REFRESH_KEY),raw);
  assert.throws(()=>writeRefresh({getItem:()=>null,setItem:()=>{}},{source:"A",attemptedAt:0,completedAt:0}),/未保存/);
  s.setItem(DAILY_REFRESH_KEY,"");
  assert.throws(()=>readRefresh(s,"A"));
  assert.throws(()=>writeRefresh(s,{source:"A",attemptedAt:0,completedAt:0}));
  assert.equal(s.getItem(DAILY_REFRESH_KEY),"");
  assert.equal(readRefresh(memory(),"A"),null);
});
test("manual success after clock rollback preserves same-day auto-attempt while displaying actual manual time",()=>{
  const s=memory(),first={source:"A",attemptedAt:clock(10,9,0),completedAt:clock(10,9,0)};
  writeRefresh(s,first);
  const attempt=refreshAttempt("A",readRefresh(s,"A"),clock(10,8,20));
  writeRefresh(s,{...attempt,completedAt:clock(10,8,20)});
  const restored=readRefresh(s,"A");
  assert.equal(refreshLabel(restored,clock(10,8,20)),"10.10 周六 08:20已刷新");
  assert.equal(refreshDue(clock(10,8,30),restored),false);
  assert.equal(refreshDue(clock(11,8,30),restored),true);
  const next=refreshAttempt("A",restored,clock(11,8,30));assert.equal(next.attemptedAt,clock(11,8,30));
});
