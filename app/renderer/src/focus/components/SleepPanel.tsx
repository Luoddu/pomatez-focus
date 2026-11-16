import React, { memo, useEffect, useRef, useState } from 'react';
import { sleepClock, sleepMinute, sleepPlot, sleepSegments, sleepHomeRows, sleepGoalMarker } from '../sleepChart.js';
import '../sleep.css';

const bridge = () => (window as any).focusApi;
type SleepStats = { rows: any[]; goals: { bedtime: string; wakeBy: string }; summary: any; through: string };

function SleepPanel({ detailed = false }: { detailed?: boolean }) {
  const [range, setRange] = useState<7 | 30>(7);
  const details = detailed;
  const [dayOffset, setDayOffset] = useState(0);
  const historyRequested = useRef(false);
  const historyReadyRef = useRef(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [data, setData] = useState<{ week: SleepStats; month: SleepStats; tonight: any } | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false), [saving, setSaving] = useState(false);
  const [bedtime, setBedtime] = useState('23:30'), [wakeBy, setWakeBy] = useState('08:00');
  const mounted = useRef(true), request = useRef(0), inFlight = useRef(false), refreshQueued = useRef(false);
  async function refresh() {
    if (inFlight.current) { refreshQueued.current = true; return; }
    if (!bridge()?.sleepRequest) { setLoading(false); setError('请更新农场后查看作息记录'); return; }
    inFlight.current = true; const id = ++request.current;
    try {
      const tomorrow = new Date(Date.now() + 32 * 3600000).toISOString().slice(0, 10);
      const [week, month, next] = await Promise.all([bridge().sleepRequest({ op: 'stats', days: 7 }), details || historyRequested.current ? bridge().sleepRequest({ op: 'stats', days: 30 }) : Promise.resolve(null), bridge().sleepRequest({ op: 'read', day: tomorrow })]);
      if (week.error || month?.error || next.error) throw Error(week.error?.message || month?.error?.message || next.error?.message);
      if (mounted.current && request.current === id) { setData({ week, month: month || week, tonight: next.entry }); setError(''); if (month) { historyReadyRef.current = true; setHistoryReady(true); } }
    } catch (e: any) { if (mounted.current) setError(e.message || '暂未读取到作息记录'); }
    finally {
      inFlight.current = false;
      if (mounted.current) { setLoading(false); if (refreshQueued.current) { refreshQueued.current = false; void refresh(); } }
    }
  }
  useEffect(() => {
    mounted.current = true; void refresh();
    const focus = () => void refresh();
    const interval = window.setInterval(focus, 30000);
    window.addEventListener('focus', focus);
    return () => { mounted.current = false; window.clearInterval(interval); window.removeEventListener('focus', focus); };
    // A single slow refresh loop; no per-second state or persistence reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setDayOffset(0); }, [data?.week.through]);
  function loadHistory() {
    if (!historyReadyRef.current && (!historyRequested.current || !inFlight.current)) { historyRequested.current = true; setError(''); void refresh(); }
  }
  async function saveGoals(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const result = await bridge().sleepRequest({ op: 'set_goals', bedtime, wakeBy });
      if (result.error) throw Error(result.error.message);
      setEditing(false); await refresh();
    } catch (e: any) { setError(e.message || '目标未保存'); }
    finally { setSaving(false); }
  }
  const selected = data && (range === 7 ? data.week : data.month);
  const plot = sleepPlot(details ? selected?.rows || [] : sleepHomeRows(data?.month.rows || [], data?.tonight, Date.now() + dayOffset * 86400000), selected?.goals || {});
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 32 * 3600000).toISOString().slice(0, 10);
  const x = (i: number) => 43 + (i + .5) * (272 / Math.max(1, plot.points.length));
  const y = (value: number) => 20 + (value - plot.min) / (plot.max - plot.min) * 150;
  const hasRecords = plot.points.some((p: any) => p.bed !== null || p.wake !== null);
  const historyPending = !details && dayOffset < 0 && !historyReady;
  return <section className="sleep-section side-section" aria-label="早睡早起">
    <div className="side-title"><span>早睡早起</span></div>
    <div className={`sleep-card${details ? ' sleep-full-stats' : ' sleep-preview'}`}>
      {details && <button className="btn-text sleep-goal-link" onClick={() => {
      if (!editing) { setBedtime(selected?.goals.bedtime || '23:30'); setWakeBy(selected?.goals.wakeBy || '08:00'); }
      setEditing(!editing);
    }}>{editing ? '收起目标' : '设定目标'}</button>}
      <div className="sleep-toolbar">{details ? <div className="sleep-ranges" aria-label="作息日期范围">{([7, 30] as const).map(days => <button key={days} className={range === days ? 'selected' : ''} aria-pressed={range === days} onClick={() => setRange(days)}>{days}天</button>)}</div> : <span className="sleep-preview-period">每日作息</span>}<span className="sleep-legend"><i className="bed"/>就寝 <i className="wake"/>起床</span></div>
      {data?.tonight?.bedtimeAt && <p className="sleep-tonight" role="status">今晚 {sleepClock(sleepMinute(data.tonight.day, data.tonight.bedtimeAt))} 已记 · 待起床</p>}
      {editing && <form className="sleep-goals" onSubmit={saveGoals}>
        <label>就寝目标<input aria-label="就寝目标" type="time" required value={bedtime} onChange={e => setBedtime(e.target.value)}/></label>
        <label>起床目标<input aria-label="起床目标" type="time" required value={wakeBy} onChange={e => setWakeBy(e.target.value)}/></label>
        <button type="submit" className="btn-small" disabled={saving}>{saving ? '保存中…' : '保存目标'}</button>
      </form>}
      {error && <p className="sleep-error" role="alert">{error}</p>}
      {loading && <p className="sleep-empty">正在读取作息…</p>}
      {!loading && <div className="sleep-chart-wrap">
        <svg className="sleep-chart" viewBox="0 0 350 204" role="img" aria-label={details ? `近${range}天就寝与起床时间，虚线为目标，缺失日期留空` : dayOffset === 0 ? '七日作息窗口，今天在倒数第二格，虚线为目标，缺失日期留空' : '历史七日作息窗口，虚线为目标，缺失日期留空'}>
          {plot.ticks.map((tick: number) => <g key={tick}><line className="sleep-gridline" x1="40" x2="320" y1={y(tick)} y2={y(tick)}/><text className="sleep-axis" x="33" y={y(tick) + 3} textAnchor="end">{sleepClock(tick)}</text></g>)}
          {[['bed', plot.bedGoal], ['wake', plot.wakeGoal]].map(([name, value]) => <g key={name as string}><line className={`sleep-target ${name}`} x1="40" x2="320" y1={y(value as number)} y2={y(value as number)}/><text className={`sleep-target-label ${name}`} x="320" y={y(value as number) - 4} textAnchor="end">{sleepClock(value)} 目标</text></g>)}
          {plot.points.map((p: any, i: number) => <g key={p.day}>
            <title>{p.day} 就寝 {sleepClock(p.bed)} · 起床 {sleepClock(p.wake)}</title>
            {p.bed !== null && p.wake !== null && <rect className="sleep-window" x={x(i) - (range === 7 ? 9 : 2.8)} y={y(p.bed)} width={range === 7 ? 18 : 5.6} height={Math.max(1, y(p.wake) - y(p.bed))} rx={range === 7 ? 7 : 2}/>}
            {(range === 7 || i % 5 === 0 || i === plot.points.length - 1) && <text className={`sleep-axis${!details && p.day === today ? ' sleep-today' : ''}`} x={x(i)} y="190" textAnchor="middle">{!details && p.day === today ? '今天' : !details && p.day === tomorrow ? '明天' : p.day.slice(5).replace('-', '/')}</text>}
          </g>)}
          {(['bed', 'wake'] as const).map(key => <g key={key}>{sleepSegments(plot.points, key).map((segment: any[], i: number) => <polyline key={i} className={`sleep-trend ${key}`} points={segment.map(p => `${x(p.index)},${y(p.value)}`).join(' ')}/>)}{plot.points.map((p: any, i: number) => {
            const marker = sleepGoalMarker(p[key], key === 'bed' ? plot.bedGoal : plot.wakeGoal);
            if (!marker) return null;
            const label = `${p.day} ${key === 'bed' ? '就寝' : '起床'} ${sleepClock(p[key])} · ${marker === 'check' ? '提前或晚不超过20分钟' : marker === 'late' ? '晚超过20分钟、不超过50分钟' : '晚超过50分钟'}`;
            return <g key={p.day} className={`sleep-point ${key} sleep-marker-${marker}`} transform={`translate(${x(i)} ${y(p[key])}) scale(${range === 7 ? 1.1 : .65})`} role="img" aria-label={label}>
              <title>{label}</title><circle className="sleep-marker-bg" r="7"/>
              {marker === 'check' ? <path className="sleep-marker-tick" d="M -5 0 L -1 4 L 6 -5"/> : marker === 'late' ? <circle className="sleep-marker-ring" r="5.5"/> : <text className="sleep-marker-alert" textAnchor="middle" y="6">!</text>}
            </g>;
          })}</g>)}
        </svg>
        {historyPending ? <p className="sleep-empty-overlay" role="status">{error ? '历史记录未读取成功' : '正在读取历史记录…'}<br/><small>{error ? '再次拖动可重试' : '日期窗口已选定'}</small></p> : !hasRecords && <p className="sleep-empty-overlay">暂无打卡记录<br/><small>微信说“晚安”或“我起床了”</small></p>}
      </div>}
      {!details && !loading && <input className="sleep-history-slider" type="range" min="-24" max="0" step="1" value={dayOffset}
        aria-label="滑动查看作息日期" aria-valuetext={`${plot.points[0]?.day} 至 ${plot.points[6]?.day}`}
        title="左右拖动查看最近30天，最右侧回到今天" onPointerDown={loadHistory} onFocus={loadHistory}
        onChange={e => { loadHistory(); setDayOffset(Number(e.target.value)); }}/>}
      {details && <div className="sleep-averages" aria-label="平均就寝起床时间">
        <span/><span>平均就寝</span><span>平均起床</span>
        {(['week', 'month'] as const).map((key, i) => <React.Fragment key={key}><span className="sleep-average-period">近{i === 0 ? 7 : 30}天</span><strong>{sleepClock(data?.[key].summary.meanBedtimeMinutes)}<small>{data?.[key].summary.bedtimeSamples || 0} 次</small></strong><strong>{sleepClock(data?.[key].summary.meanWakeMinutes)}<small>{data?.[key].summary.wakeSamples || 0} 次</small></strong></React.Fragment>)}
      </div>}
      {details && <p className="sleep-footnote">北京时间 · 按起床日归档 · 自报作息</p>}
    </div>
  </section>;
}
export default memo(SleepPanel);
