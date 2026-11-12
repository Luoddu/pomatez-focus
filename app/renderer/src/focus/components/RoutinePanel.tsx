import React from "react";
import type { FocusSession } from "../session";
import {
  beijingDate,
  holidayDay,
  holidayMessage,
  routineSummary,
  HOLIDAY_YEAR,
} from "../wellbeing.js";
import type { RangeInfo } from "../stats";
export default function RoutinePanel({
  records,
  range,
  now,
}: {
  records: FocusSession[];
  range: RangeInfo;
  now: number;
}) {
  const routine = routineSummary(records);
  const days: {
    date: string;
    holiday: { name: string; rest: boolean };
    count: number;
  }[] = [];
  for (
    let at = range.start;
    at < range.end && at <= now;
    at += 86400000
  ) {
    const date = beijingDate(at),
      holiday = holidayDay(date);
    if (holiday)
      days.push({
        date,
        holiday,
        count: routine.holidayCounts.get(date) || 0,
      });
  }
  return (
    <section className="card routine-panel" aria-label="晨间与休息节奏">
      <div>
        <strong>作息时段</strong>
        <span>晨间 08:00–09:30 · 休息时段 23:30–08:00</span>
      </div>
      <div className="routine-metrics">
        <span>
          晨间专注 <b>{Math.round(routine.morningSeconds / 60)} 分钟</b>{" "}
          · {routine.morningDays} 天
        </span>
        <span className="routine-rest">
          休息时段记录 {Math.round(routine.restSeconds / 60)} 分钟
        </span>
      </div>
      {days.length > 0 && (
        <div className="routine-holidays" aria-label="区间节假日">
          {days.map((d) => (
            <span
              key={d.date}
              className={d.holiday.rest ? "rest-day" : "makeup-day"}
              title={holidayMessage(d.holiday, d.count)}
            >
              {d.date.slice(5)} {d.holiday.name}
              {d.holiday.rest
                ? d.count > 0
                  ? ` · 收获 ${d.count}`
                  : " · 休息日"
                : ""}
            </span>
          ))}
        </div>
      )}
      <small>
        按北京时间及实际专注分段计算，暂停不计入。节假日按中国大陆{" "}
        {HOLIDAY_YEAR} 年官方放假调休安排；其他年份暂不推算。
      </small>
    </section>
  );
}
