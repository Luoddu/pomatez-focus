// Mainland China official leave schedule, not an inferred lunar calendar.
// 国办发明电〔2025〕7号, government republication, 2025-11-04:
// https://www.beijing.gov.cn/fuwu/bmfw/sy/jrts/202511/t20251104_4258838.html
export const HOLIDAY_YEAR = 2026;
const leave = [
  ["元旦", "01-01", "01-03"],
  ["春节", "02-15", "02-23"],
  ["清明节", "04-04", "04-06"],
  ["劳动节", "05-01", "05-05"],
  ["端午节", "06-19", "06-21"],
  ["中秋节", "09-25", "09-27"],
  ["国庆节", "10-01", "10-07"],
];
const work = ["01-04", "02-14", "02-28", "05-09", "09-20", "10-10"];
export function beijingDate(at) {
  return new Date(at + 8 * 3600000).toISOString().slice(0, 10);
}
export function holidayDay(date) {
  const key = typeof date === "string" ? date : beijingDate(date);
  if (!/^2026-\d{2}-\d{2}$/.test(key)) return null;
  const md = key.slice(5);
  if (work.includes(md)) return { name: "调休上班", rest: false };
  const found = leave.find(
    ([, start, end]) => md >= start && md <= end
  );
  return found ? { name: found[0], rest: true } : null;
}
export function holidayMessage(day, count) {
  if (!day) return "";
  if (!day.rest) return "调休工作日，按自己的节奏安排。";
  return count > 0
    ? `${day.name}里也照顾了一点自己的目标，收获值得珍惜；记得给休息留位置。`
    : `${day.name}，安心休息就是今天的好安排。`;
}
export function timeZoneKind(slot) {
  return slot < 16 || slot >= 47
    ? "rest"
    : slot < 19
    ? "morning"
    : "day";
}
// Actual active segments, capped to accepted time. Pauses never earn morning credit.
export function routineSummary(records) {
  let morningSeconds = 0,
    restSeconds = 0;
  const mornings = new Set();
  const holidayCounts = new Map();
  for (const r of records.filter((r) => r.status === "saved")) {
    const holiday = holidayDay(r.startedAt);
    if (holiday?.rest) {
      const day = beijingDate(r.startedAt);
      holidayCounts.set(
        day,
        (holidayCounts.get(day) || 0) + (r.completedCount || 0)
      );
    }
    const start = r.startedAt,
      end = r.endedAt ?? start + r.elapsedSeconds * 1000;
    const segments = (r.segments || [{ start, end }])
      .map((s) => ({
        start: Math.max(start, s.start),
        end: Math.min(end, s.end),
      }))
      .filter(
        (s) =>
          Number.isFinite(s.start) &&
          Number.isFinite(s.end) &&
          s.end > s.start
      );
    const total = segments.reduce(
      (n, s) => n + (s.end - s.start) / 1000,
      0
    );
    const weight =
      total > 0
        ? Math.min(
            1,
            Math.max(0, r.acceptedSeconds ?? r.elapsedSeconds) / total
          )
        : 0;
    for (const s of segments) {
      let cursor = s.start;
      while (cursor < s.end) {
        const shifted = new Date(cursor + 8 * 3600000);
        const midnight =
          Date.UTC(
            shifted.getUTCFullYear(),
            shifted.getUTCMonth(),
            shifted.getUTCDate()
          ) -
          8 * 3600000;
        const next = Math.min(s.end, midnight + 86400000);
        const segmentStart = cursor;
        const overlap = (lo, hi) =>
          (Math.max(
            0,
            Math.min(next, midnight + hi * 60000) -
              Math.max(segmentStart, midnight + lo * 60000)
          ) /
            1000) *
          weight;
        const early = overlap(480, 570);
        morningSeconds += early;
        if (early > 0) mornings.add(beijingDate(cursor));
        restSeconds += overlap(0, 480) + overlap(1410, 1440);
        cursor = next;
      }
    }
  }
  return {
    morningSeconds,
    morningDays: mornings.size,
    restSeconds,
    holidayCounts,
  };
}
export function companionGreeting(now, todayCount, morningSeconds = 0) {
  const d = new Date(now + 8 * 3600000);
  const minute = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (minute < 480 || minute >= 1410)
    return {
      kind: "rest",
      text: "田里交给我。现在是休息时间，随手记下想法，安心去睡吧。",
    };
  const holiday = holidayDay(now);
  if (holiday?.rest)
    return {
      kind: "holiday",
      text: holidayMessage(holiday, todayCount),
    };
  if (minute >= 480 && minute < 570)
    return {
      kind: "morning",
      text:
        morningSeconds > 0
          ? "今天的早晨已经有了收获，稳稳地往前走就好。"
          : "早上好，昨晚睡得怎么样？先种一颗小番茄，让今天轻轻开始。",
    };
  if (minute >= 1320)
    return {
      kind: "evening",
      text: "今天的努力已经记下了。慢慢收尾，给睡眠留足时间。",
    };
  return {
    kind: "day",
    text:
      todayCount > 0
        ? "收获已经在田里了。歇一会儿，再按自己的节奏来。"
        : "准备好时，选一件小事种下今天的第一颗番茄。也可以先和我说说想法。",
  };
}
