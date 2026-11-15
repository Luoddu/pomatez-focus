import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY = 86400000, OFFSET = 8 * 3600000;
export const sleepGoals = { timeZone: 'UTC+08:00', bedtime: '23:30', wakeFrom: '07:40', wakeBy: '08:00' };
type Entry = { day: string; revision: string; bedtimeAt: string | null; wakeAt: string | null; updatedAt: string };
type Store = { version: 1; entries: Record<string, Entry>; receipts: Record<string, { hash: string; day: string; revision: string }> };
class SleepError extends Error { constructor(readonly code: string, message: string) { super(message); Object.setPrototypeOf(this, SleepError.prototype); } }
function fail(code: string, message: string): never { throw new SleepError(code, message); }
function object(v: any) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function fields(v: any, allowed: string[]) { if (!object(v) || Object.keys(v).some(k => !allowed.includes(k))) fail('INVALID', '未知字段或无效对象'); }
export function sleepDay(ms: number) { return new Date(ms + OFFSET).toISOString().slice(0, 10); }
function midnight(day: any): number {
  if (typeof day !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(day)) fail('INVALID', '日期须为2000–2099年YYYY-MM-DD');
  const ms = Date.parse(day + 'T00:00:00+08:00');
  if (!Number.isFinite(ms) || sleepDay(ms) !== day) fail('INVALID', '日期不存在');
  return ms;
}
function timestamp(value: any): string {
  if (typeof value !== 'string' || !/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?(?:Z|\+08:00)$/.test(value)) fail('INVALID', '时间须带Z或+08:00时区和秒');
  midnight(value.slice(0, 10));
  if (+value.slice(11, 13) > 23 || +value.slice(14, 16) > 59 || +value.slice(17, 19) > 59) fail('INVALID', '时分秒无效');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail('INVALID', '时间无效');
  return new Date(ms).toISOString();
}
function canonical(v: any): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (object(v)) return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function validateEntry(e: any, day: string) {
  fields(e, ['day','revision','bedtimeAt','wakeAt','updatedAt']);
  const start = midnight(day);
  if (e.day !== day || !ID.test(e.revision)) fail('INVALID', '记录标识无效');
  timestamp(e.updatedAt);
  const bed = e.bedtimeAt === null ? null : Date.parse(timestamp(e.bedtimeAt));
  const wake = e.wakeAt === null ? null : Date.parse(timestamp(e.wakeAt));
  if (bed !== null && (bed < start - DAY / 2 || bed >= start + DAY / 2)) fail('INVALID', '就寝时间须在起床日前一天中午至当天中午之间');
  if (wake !== null && (wake < start || wake >= start + DAY)) fail('INVALID', '起床时间须在归档日当天');
  if (bed !== null && wake !== null && (wake <= bed || wake - bed > DAY)) fail('INVALID', '起床须晚于就寝，打卡间隔不能超过24小时');
}
function minutes(value: string) { const [h,m] = value.split(':').map(Number); return h * 60 + m; }
function validGoals(value: any) {
  fields(value, ['timeZone','bedtime','wakeFrom','wakeBy']);
  for (const key of ['bedtime','wakeFrom','wakeBy']) if (typeof value[key] !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value[key])) fail('INVALID','目标须为HH:MM');
  if (value.timeZone !== 'UTC+08:00' || minutes(value.wakeFrom) > minutes(value.wakeBy)) fail('INVALID','起床目标范围无效');
  return value as typeof sleepGoals;
}
function bedMinutes(value: string) { const m = minutes(value); return m >= 720 ? m - 1440 : m; }
function project(e: Entry | undefined, day: string, goals = sleepGoals) {
  const start = midnight(day), bed = e?.bedtimeAt ? Date.parse(e.bedtimeAt) : null, wake = e?.wakeAt ? Date.parse(e.wakeAt) : null;
  return { day, revision: e?.revision || null, bedtimeAt: e?.bedtimeAt || null, wakeAt: e?.wakeAt || null,
    updatedAt: e?.updatedAt || null, complete: bed !== null && wake !== null,
    reportedRestMinutes: bed !== null && wake !== null ? Math.round((wake - bed) / 60000) : null,
    bedtimeOnTarget: bed === null ? null : bed <= start + bedMinutes(goals.bedtime) * 60000,
    wakeOnTarget: wake === null ? null : wake >= start + minutes(goals.wakeFrom) * 60000 && wake <= start + minutes(goals.wakeBy) * 60000 };
}
export class SleepStore {
  readonly file: string;
  constructor(directory: string, private now = Date.now) { this.file = path.join(directory, 'sleep-checkins-v1.json'); }
  private goals() {
    const file = path.join(path.dirname(this.file), 'sleep-goals-v1.json');
    if (!fs.existsSync(file)) return {...sleepGoals};
    try { const stat=fs.lstatSync(file); if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096) throw Error(); return validGoals(JSON.parse(fs.readFileSync(file,'utf8'))); }
    catch (_) { return fail('CORRUPT','作息目标无法校验，原文件已保留'); }
  }
  private saveGoals(value: typeof sleepGoals) {
    const file=path.join(path.dirname(this.file),'sleep-goals-v1.json'), temp=file+'.'+crypto.randomUUID()+'.tmp';
    try { const parent=fs.lstatSync(path.dirname(file)); if(!parent.isDirectory()||parent.isSymbolicLink()) throw Error();
      const fd=fs.openSync(temp,'wx',0o600); try { fs.writeFileSync(fd,JSON.stringify(value),'utf8'); fs.fsyncSync(fd); } finally {fs.closeSync(fd);} fs.renameSync(temp,file);
    } catch (_) { fail('SAVE_FAILED','作息目标未保存，请重试'); } finally {if(fs.existsSync(temp)) fs.unlinkSync(temp);}
  }
  private load(): Store {
    if (!fs.existsSync(this.file)) return { version: 1, entries: {}, receipts: {} };
    try {
      const stat = fs.lstatSync(this.file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024) throw Error('Invalid file');
      const s = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      fields(s, ['version','entries','receipts']);
      if (s.version !== 1 || !object(s.entries) || !object(s.receipts)) throw Error('Invalid schema');
      for (const [day, e] of Object.entries(s.entries)) validateEntry(e, day);
      for (const [id, r] of Object.entries(s.receipts) as [string, any][]) {
        fields(r, ['hash','day','revision']);
        if (!ID.test(id) || !/^[a-f0-9]{64}$/.test(r.hash) || !s.entries[r.day] || !ID.test(r.revision)) throw Error('Invalid receipt');
      }
      return s;
    } catch (_) { return fail('CORRUPT', '睡眠记录无法校验，原文件已保留，请勿覆盖'); }
  }
  private save(s: Store) {
    const bytes = JSON.stringify(s);
    if (Buffer.byteLength(bytes) > 16 * 1024 * 1024) fail('LIMIT', '睡眠存储达到上限，原记录保留');
    const temp = this.file + '.' + crypto.randomUUID() + '.tmp';
    try {
      const parent = fs.lstatSync(path.dirname(this.file));
      if (!parent.isDirectory() || parent.isSymbolicLink()) throw Error('Invalid profile');
      const fd = fs.openSync(temp, 'wx', 0o600);
      try { fs.writeFileSync(fd, bytes, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(temp, this.file);
    } catch (_) { fail('SAVE_FAILED', '未能保存，请保留原requestId重试'); }
    finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  handle(q: any): any {
    try { return this.run(q); }
    catch (e: any) { return { requestId: q?.requestId || null, error: { code: e.code || 'INTERNAL', message: e instanceof SleepError ? e.message : '睡眠接口处理失败' } }; }
  }
  private run(q: any) {
    if (!object(q) || q.protocol !== 1 || q.scope !== 'sleep' || typeof q.requestId !== 'string' || !ID.test(q.requestId)) fail('INVALID', '接口版本、scope或requestId无效');
    const now = this.now(), s = this.load(), goals = this.goals();
    const base = { protocol: 1, scope: 'sleep', requestId: q.requestId, goals, measure: 'self-reported-rest-window' };
    if(q.op==='goals') {fields(q,['protocol','scope','requestId','op']);return base;}
    if(q.op==='set_goals') {
      fields(q,['protocol','scope','requestId','op','bedtime','wakeBy','wakeFrom']);
      if(typeof q.bedtime!=='string'||typeof q.wakeBy!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(q.wakeBy)) fail('INVALID','目标须为HH:MM');
      const next=validGoals({...goals,bedtime:q.bedtime,wakeBy:q.wakeBy,wakeFrom:q.wakeFrom ?? (minutes(q.wakeBy)<minutes(goals.wakeFrom)?q.wakeBy:goals.wakeFrom)});
      this.saveGoals(next);return {...base,goals:next};
    }
    if (q.op === 'read') {
      fields(q, ['protocol','scope','requestId','op','day']);
      const day = q.day === undefined ? sleepDay(now) : q.day; midnight(day);
      return { ...base, entry: project(s.entries[day], day, goals) };
    }
    if (q.op === 'stats') {
      fields(q, ['protocol','scope','requestId','op','through','days']);
      const through = q.through === undefined ? sleepDay(now) : q.through, end = midnight(through), count = q.days === undefined ? 30 : q.days;
      if (!Number.isInteger(count) || count < 1 || count > 366 || end > midnight(sleepDay(now))) fail('INVALID', '统计限过去1–366天');
      const rows = Array.from({length: count}, (_, i) => { const day = sleepDay(end - (count - 1 - i) * DAY); return project(s.entries[day], day, goals); });
      const beds=rows.filter(r=>r.bedtimeAt!==null).map(r=>(Date.parse(r.bedtimeAt!)-midnight(r.day))/60000);
      const wakes=rows.filter(r=>r.wakeAt!==null).map(r=>(Date.parse(r.wakeAt!)-midnight(r.day))/60000);
      const mean=(values:number[])=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
      const completed = rows.filter(r => r.complete);
      const streak = (key: 'bedtimeOnTarget' | 'wakeOnTarget') => {
        let best = 0, run = 0;
        for (const r of rows) { run = r[key] === true ? run + 1 : 0; best = Math.max(best, run); }
        let index = rows.length - 1;
        // Today's wake check-in is pending until 08:00; it must not erase yesterday's streak at midnight.
        if (key === 'wakeOnTarget' && end === midnight(sleepDay(now)) && now < end + minutes(goals.wakeBy) * 60000 && rows[index][key] === null) index--;
        let current = 0; while (index >= 0 && rows[index--][key] === true) current++;
        return { current, bestInRange: best };
      };
      return { ...base, through, days: count, rows, summary: { completeNights: completed.length, missingOrPartialNights: count - completed.length,
        meanBedtimeMinutes:mean(beds),meanWakeMinutes:mean(wakes),bedtimeSamples:beds.length,wakeSamples:wakes.length,
        meanReportedRestMinutes: completed.length ? Math.round(completed.reduce((a,r) => a + r.reportedRestMinutes!, 0) / completed.length) : null,
        bedtimeTargetDays: rows.filter(r => r.bedtimeOnTarget === true).length, wakeTargetDays: rows.filter(r => r.wakeOnTarget === true).length,
        bedtimeStreak: streak('bedtimeOnTarget'), wakeStreak: streak('wakeOnTarget') } };
    }
    if (!['check_in','correct'].includes(q.op)) fail('INVALID', '不支持的睡眠操作');
    fields(q, q.op === 'check_in' ? ['protocol','scope','requestId','op','kind','at','expectedRevision'] : ['protocol','scope','requestId','op','day','bedtimeAt','wakeAt','expectedRevision']);
    const hash = crypto.createHash('sha256').update(canonical(q)).digest('hex'), receipt = s.receipts[q.requestId];
    if (receipt) {
      if (receipt.hash !== hash) fail('ID_REUSED', '同一requestId不可用于不同内容');
      return { ...base, replayed: true, appliedRevision: receipt.revision, entry: project(s.entries[receipt.day], receipt.day, goals) };
    }
    let day: string, patch: any;
    if (q.op === 'check_in') {
      if (!['bedtime','wake'].includes(q.kind)) fail('INVALID', 'kind须为bedtime或wake');
      const at = timestamp(q.at === undefined ? new Date(now).toISOString() : q.at), ms = Date.parse(at);
      day = sleepDay(q.kind === 'bedtime' ? ms + DAY / 2 : ms);
      patch = { [q.kind === 'bedtime' ? 'bedtimeAt' : 'wakeAt']: at };
    } else {
      day = q.day; midnight(day); patch = {};
      for (const key of ['bedtimeAt','wakeAt']) if (Object.prototype.hasOwnProperty.call(q, key)) patch[key] = q[key] === null ? null : timestamp(q[key]);
      if (!Object.keys(patch).length) fail('INVALID', '更正至少指定一个打卡时间');
    }
    for (const at of Object.values(patch)) if (at !== null && Date.parse(at as string) > now) fail('INVALID', '不能把未来计划记作已经发生');
    const old = s.entries[day];
    if (q.expectedRevision !== (old?.revision || null)) fail('CONFLICT', '先read归档日，使用当前revision；新记录传null');
    if (q.op === 'check_in' && old && Object.keys(patch).some(key => (old as any)[key] !== null)) fail('ALREADY_RECORDED', '已有该项打卡，需要更正请使用correct');
    if (Object.keys(s.receipts).length >= 20000) fail('LIMIT', '回执上限已达，不丢弃去重记录');
    const next: Entry = { day, revision: crypto.randomUUID(), bedtimeAt: old?.bedtimeAt || null, wakeAt: old?.wakeAt || null, ...patch, updatedAt: new Date(now).toISOString() };
    validateEntry(next, day);
    s.entries[day] = next; s.receipts[q.requestId] = { hash, day, revision: next.revision }; this.save(s);
    return { ...base, replayed: false, appliedRevision: next.revision, entry: project(next, day, goals) };
  }
}
