// Minutes relative to the wake day's midnight keep 23:30 and 00:30 adjacent.
export function sleepMinute(day, timestamp) {
  if (!timestamp) return null;
  const n = (Date.parse(timestamp) - Date.parse(day + 'T00:00:00+08:00')) / 60000;
  return Number.isFinite(n) ? n : null;
}
export function clockMinute(text, bedtime = false) {
  if (!/^\d{2}:\d{2}$/.test(text || '')) return null;
  const [h, m] = text.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  const n = h * 60 + m;
  return bedtime && n >= 720 ? n - 1440 : n;
}
export function sleepClock(minutes) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—';
  const n = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
}
export function sleepPlot(rows, goals = {}) {
  const points = rows.map(r => ({ ...r, bed: sleepMinute(r.day, r.bedtimeAt), wake: sleepMinute(r.day, r.wakeAt) }));
  const bedGoal = clockMinute(goals.bedtime || '23:30', true), wakeGoal = clockMinute(goals.wakeBy || '08:00');
  const values = points.flatMap(p => [p.bed, p.wake]).concat([bedGoal, wakeGoal]).filter(n => n !== null);
  const min = Math.floor(Math.min(-120, ...values) / 120) * 120;
  const max = Math.ceil(Math.max(600, ...values) / 120) * 120;
  const ticks = [];
  for (let n = min; n <= max; n += (max - min > 1080 ? 240 : 120)) ticks.push(n);
  return { points, min, max, ticks, bedGoal, wakeGoal };
}
export function sleepSegments(points, key) {
  const segments = []; let current = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i][key] === null) { if (current.length) segments.push(current); current = []; }
    else current.push({ index: i, value: points[i][key] });
  }
  if (current.length) segments.push(current);
  return segments;
}
