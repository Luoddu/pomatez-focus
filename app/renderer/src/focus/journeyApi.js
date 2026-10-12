import { journeyDay, journeyKey, journeyMetadata, readJourney, writeJourney, reconcileJourney, locked, moveSlot, taskRef, resolveTask, validateJourney, REST_LABELS } from './journey.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function fail(code, message) { const e = Error(message); e.code = code; throw e; }
function shape(v, keys) { if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k))) fail('INVALID','未知字段或结构'); }
const stableTaskId = r => `${r.source}:${encodeURIComponent(r.sourceKey || '')}:${encodeURIComponent(r.key)}`;
export function validateJourneyRequest(r) {
  shape(r,['protocol','requestId','op','day','expectedRevision','operations']);
  if (r.protocol !== 1 || !uuid.test(r.requestId || '') || !['read','write'].includes(r.op) || typeof r.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.day) || r.day < '2000-01-01' || r.day > '2100-12-31' || !Number.isFinite(new Date(r.day+'T12:00:00Z').getTime()) || new Date(r.day+'T12:00:00Z').toISOString().slice(0,10) !== r.day) fail('INVALID','协议、日期或请求ID无效');
  if (r.op === 'read') { if ('operations' in r || 'expectedRevision' in r) fail('INVALID','读取不能携带写入字段'); return r; }
  if (!uuid.test(r.expectedRevision || '') || !Array.isArray(r.operations) || !r.operations.length || r.operations.length > 100) fail('INVALID','写入需版本和1–100项操作');
  for (const o of r.operations) {
    if (o?.type === 'assign') { shape(o,['type','slotId','taskId']); if (typeof o.slotId !== 'string' || !(o.taskId === null || typeof o.taskId === 'string')) fail('INVALID','任务操作无效'); }
    else if (o?.type === 'move') { shape(o,['type','slotId','stageId','beforeSlotId']); if (typeof o.slotId !== 'string' || typeof o.stageId !== 'string' || !(o.beforeSlotId === null || typeof o.beforeSlotId === 'string')) fail('INVALID','顺序操作无效'); }
    else if (o?.type === 'stage') { shape(o,['type','stageId','time','restActions']); if (typeof o.stageId !== 'string' || !('time' in o || 'restActions' in o)) fail('INVALID','阶段操作无效'); }
    else if (o?.type === 'end') { shape(o,['type','hour']); if (!('hour' in o)) fail('INVALID','结束参考时间缺失'); }
    else fail('INVALID','未知操作');
  }
  return r;
}
async function digest(value) { const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))); return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
export function createJourneyApi(storage, getContext, notify = () => {}) {
  let queue = Promise.resolve();
  const context = () => { const c=getContext(); if (!c?.ready || !c.scope) fail('NOT_READY','旅程/任务尚未就绪'); return c; };
  const catalog = c => c.tasks.flatMap(t => { try { const ref=taskRef(t); return resolveTask(ref,c.tasks,c.scope) ? [{id:stableTaskId(ref),title:ref.title,ref}] : []; } catch (_) { return []; } });
  const result = (plan,c,replayed=false,appliedRevision=null) => ({protocol:1,day:plan.day,scope:c.scope,revision:journeyMetadata(storage,c.scope,plan.day).revision,appliedRevision,replayed,journey:plan,tasks:catalog(c).map(({id,title})=>({id,title})),lockedSlotIds:plan.stages.flatMap(s=>s.slots).filter(p=>locked(plan,p,c.records,c.active)).map(p=>p.id)});
  const run = async request => {
    const r=validateJourneyRequest(request), c=context(), key=journeyKey(c.scope,r.day), raw=storage.getItem(key), today=journeyDay();
    if (r.op === 'write' && r.day < today) fail('READ_ONLY','过去旅程仅可读取');
    if (!raw && r.day < today) fail('NOT_FOUND','该日期尚无旅程');
    const fingerprint=JSON.stringify([c.records,c.active,c.restLog]);
    let plan=reconcileJourney(readJourney(storage,c.scope,r.day),c.records,c.active);
    if (r.op === 'read') {
      // Persist default IDs and legacy metadata once; all subsequent reads retain them.
      plan=writeJourney(storage,plan);
      const back=readJourney(storage,c.scope,r.day);
      if(JSON.stringify(back)!==JSON.stringify(plan) || !journeyMetadata(storage,c.scope,r.day).revision) fail('SAVE_FAILED','旅程初始化回读未确认');
      notify(back); return result(back,c);
    }
    const hash=await digest(r), latest=context();
    if(journeyDay()!==today) fail('CONFLICT','日期已变化，请重新读取');
    if (latest.scope !== c.scope || storage.getItem(key) !== raw || JSON.stringify([latest.records,latest.active,latest.restLog]) !== fingerprint) fail('CONFLICT','读取期间状态已变化，请重新读取');
    const meta=journeyMetadata(storage,c.scope,r.day), receipt=meta.receipts.find(v=>v.id===r.requestId);
    if (receipt) { if (receipt.hash !== hash) fail('ID_REUSED','请求ID已用于其他内容'); return result(plan,latest,true,receipt.revision); }
    if (!raw || meta.revision !== r.expectedRevision) fail('CONFLICT','安排已更新，请重新读取后决定');
    if (meta.receipts.length >= 256) fail('LIMIT','该日期已达256次接口写入上限，未删除去重回执');
    for (const o of r.operations) {
      const slots=plan.stages.flatMap(s=>s.slots), p=slots.find(v=>v.id===o.slotId), s=plan.stages.find(v=>v.id===o.stageId);
      if (o.type === 'assign' || o.type === 'move') {
        if (!p) fail('NOT_FOUND','槽位ID不存在');
        if (locked(plan,p,latest.records,latest.active)) fail('LOCKED','已完成或正在计时的槽位不能调整');
      }
      if (o.type === 'assign') {
        const task=o.taskId===null ? null : catalog(latest).find(t=>t.id===o.taskId);
        if (o.taskId!==null && !task) fail('TASK_UNAVAILABLE','任务ID不在当前可用任务中');
        p.task=task?.ref || null;
      } else if (o.type === 'move') {
        if (!s || (o.beforeSlotId !== null && !s.slots.some(v=>v.id===o.beforeSlotId))) fail('NOT_FOUND','目标阶段或锚点不存在');
        plan=moveSlot(plan,o.slotId,o.stageId,o.beforeSlotId,latest.records,latest.active);
      } else if (o.type === 'stage') {
        if (!s) fail('NOT_FOUND','阶段ID不存在');
        if ('time' in o) s.time=o.time;
        if ('restActions' in o) {
          const used = plan.resting===s.id || plan.passed.includes(s.id) || plan.passedActions.some(k=>k.startsWith(s.id+':')) || latest.restLog?.events.some(e=>e.presetKey?.startsWith(s.id+':'));
          if (used && JSON.stringify(o.restActions)!==JSON.stringify(s.restActions)) fail('LOCKED','已触发的休息节点保留实际记录');
          s.restActions=o.restActions;
          s.rest=Array.isArray(o.restActions)?o.restActions.map(k=>REST_LABELS[k]||'').join(' / ')||'休息':'休息';
        }
      } else plan.endHour=o.hour;
    }
    plan=validateJourney(plan,c.scope,r.day);
    writeJourney(storage,plan,{id:r.requestId,hash});
    const back=readJourney(storage,c.scope,r.day), saved=journeyMetadata(storage,c.scope,r.day);
    if (JSON.stringify(back)!==JSON.stringify(plan) || !saved.receipts.some(v=>v.id===r.requestId&&v.hash===hash)) fail('SAVE_FAILED','保存回读未确认');
    notify(back); return result(back,latest,false,saved.revision);
  };
  return request => { const pending=queue.then(()=>run(request)).catch(e=>({error:{code:e.code||'SAVE_FAILED',message:e.message||'旅程操作失败'}})); queue=pending.then(()=>{}); return pending; };
}
