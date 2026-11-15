// Derive daily chart values from recorded intervals. Empty buckets are not proof
// that an unmonitored computer was unused. No independent persistent counter.
/** @param {any} usage @param {number|null} [offsetMinutes] */
export function dailyUsage(usage, offsetMinutes = null) {
  if (!usage || !Number.isFinite(usage.start) || !Number.isFinite(usage.end) || usage.end < usage.start) return [];
  const fixed=Number.isFinite(offsetMinutes),offset=fixed?offsetMinutes*60000:0;
  const key = ms => { if(fixed)return new Date(ms+offset).toISOString().slice(0,10);const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const first = new Date(usage.start); first.setHours(0,0,0,0);
  const rows = [], byDay = new Map();
  for (let start=fixed?Math.floor((usage.start+offset)/86400000)*86400000-offset:first.getTime(); start<=usage.end && rows.length<366;) {
    const next=new Date(start);next.setDate(next.getDate()+1);
    const end=fixed?start+86400000:next.getTime(), row={day:key(start),start,end,bilibili:0,xiaohongshu:0,totalSeconds:0,hasRecords:false,coverage:'unknown'};
    if (Number.isFinite(usage.coverageStart) && usage.coverageStart<=Math.min(end,usage.end)) row.coverage='partial';
    rows.push(row);byDay.set(row.day,row);start=end;
  }
  const intervals=(usage.sessions||[]).filter(s=>['bilibili','xiaohongshu'].includes(s.site)&&Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.end>s.start)
    .map(s=>({...s,start:Math.max(usage.start,s.start),end:Math.min(usage.end,s.end)})).filter(s=>s.end>s.start);
  const points=intervals.flatMap((s,id)=>[{t:s.start,id,add:true},{t:s.end,id,add:false}]).sort((a,b)=>a.t-b.t||Number(a.add)-Number(b.add));
  const active=new Map();let previous=usage.start;
  for(let i=0;i<points.length;) {
    const time=points[i].t;
    if(time>previous&&active.size) {
      const winner=[...active.values()].sort((a,b)=>b.start-a.start||a.site.localeCompare(b.site))[0];
      let t=previous;
      while(t<time){const row=byDay.get(key(t));if(!row)break;const e=Math.min(time,row.end);const seconds=(e-t)/1000;row[winner.site]+=seconds;row.totalSeconds+=seconds;row.hasRecords=true;row.coverage='partial';t=e;}
    }
    while(i<points.length&&points[i].t===time){const p=points[i++];if(p.add)active.set(p.id,intervals[p.id]);else active.delete(p.id);}previous=time;
  }
  return rows;
}

// Selected-day detail must use the same clipped intervals as its daily bar.
/** @returns {Array<{start:number,end:number,site:string}>} */
export function dailySessions(sessions, selected) {
  return (sessions||[]).filter(s=>!selected||(s.start<selected.end&&s.end>selected.start))
    .map(s=>selected?{...s,start:Math.max(s.start,selected.start),end:Math.min(s.end,selected.end)}:s);
}
