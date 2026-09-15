import React, { useEffect, useMemo, useRef, useState } from "react";
import { FocusSession } from "../session";
import { beijingWeekStart } from "../week";
import {
  WEEK_GOAL_DEFAULT,
  goalMet,
  weekKeyOf,
} from "../weekgoal";
import { LogoIcon } from "./shared";

const GOLD_TONE = "#e8a917";

// 番茄月历：GitHub 贡献图式转置（列=周、行=周一~周日），当前周固定最右列，
// 超出右栏宽度时横向滚动，默认停在最新一周。
// 数据来自 saved 记录，按 startedAt 本地日期聚合番茄数与专注分钟。
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MIN_WEEKS = 16;

type DayStat = { count: number; seconds: number };

const dayStart = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());
const mondayOf = (day: Date) => {
  const d = dayStart(day);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
// 番茄红色系分档：0/1/2-3/4-5/6-8/9+，不走线性插值
const tier = (count: number) =>
  count <= 0
    ? 0
    : count === 1
    ? 1
    : count <= 3
    ? 2
    : count <= 5
    ? 3
    : count <= 8
    ? 4
    : 5;

export default function HeatmapCalendar({
  records,
  goals = {},
}: {
  records: FocusSession[];
  goals?: Record<string, number>;
}) {
  const [tip, setTip] = useState<{
    text: string;
    x: number;
    y: number;
    flip: boolean;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { weeks, byDay, byWeek, todayTs } = useMemo(() => {
    const byDay = new Map<string, DayStat>();
    const byWeek = new Map<string, number>();
    let earliest: number | null = null;
    for (const r of records) {
      if (r.status !== "saved") continue;
      const d = dayStart(new Date(r.startedAt));
      const key = dayKey(d);
      const stat = byDay.get(key) || { count: 0, seconds: 0 };
      stat.count += r.completedCount || 0;
      stat.seconds += r.acceptedSeconds || r.elapsedSeconds || 0;
      byDay.set(key, stat);
      // 周聚合用与农场相同的北京时间周口径，目标判定跨组件一致
      const wk = weekKeyOf(r.startedAt);
      byWeek.set(wk, (byWeek.get(wk) || 0) + (r.completedCount || 0));
      if (earliest === null || d.getTime() < earliest)
        earliest = d.getTime();
    }
    const today = dayStart(new Date());
    const lastMonday = mondayOf(today);
    const firstMonday = earliest
      ? mondayOf(new Date(earliest))
      : new Date(lastMonday);
    // 至少展示 MIN_WEEKS 周，不足向前补
    const earliestMonday =
      firstMonday.getTime() <
      lastMonday.getTime() - (MIN_WEEKS - 1) * 7 * 86400000
        ? firstMonday
        : new Date(
            lastMonday.getTime() - (MIN_WEEKS - 1) * 7 * 86400000
          );
    const weeks: { key: string; label: string; days: Date[] }[] = [];
    const cursor = new Date(earliestMonday);
    let lastLabelMonth = -1;
    while (cursor <= lastMonday) {
      const monday = new Date(cursor);
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      // 列首月份标签：本周含某月 1 日优先显示新月，否则沿用周一所在月
      const firstOfMonth = days.find((d) => d.getDate() === 1);
      const labelMonth = (firstOfMonth || monday).getMonth();
      const label =
        labelMonth !== lastLabelMonth ? `${labelMonth + 1}月` : "";
      lastLabelMonth = labelMonth;
      weeks.push({ key: dayKey(monday), label, days });
    }
    return { weeks, byDay, byWeek, todayTs: today.getTime() };
  }, [records]);
  // 默认停在最新（最右）一周；新记录到来也回到最右
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);
  const showTip = (
    e: React.MouseEvent<HTMLElement>,
    day: Date,
    stat?: DayStat
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const date = `${day.getMonth() + 1}月${day.getDate()}日`;
    const text =
      stat && stat.count > 0
        ? `${date} · ${stat.count} 个番茄 · ${Math.round(
            stat.seconds / 60
          )} 分钟`
        : `${date} · 暂无收获`;
    setTip({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top,
      flip: rect.right + 100 > window.innerWidth,
    });
  };
  return (
    <div className="card heatmap">
      <div
        className="hm-scroll"
        ref={scrollRef}
        onScroll={() => setTip(null)}
      >
        <div
          className="hm-grid"
          style={{
            gridTemplateColumns: `var(--hm-dow-w, 16px) repeat(${weeks.length}, var(--hm-cell, 13px))`,
          }}
        >
          <span className="hm-corner" />
          {weeks.map((week) => (
            <span className="hm-month" key={week.key}>
              {week.label}
            </span>
          ))}
          {WEEKDAYS.map((_, dow) => (
            <React.Fragment key={dow}>
              <span className="hm-dow">
                {dow % 2 === 0 ? WEEKDAYS[dow] : ""}
              </span>
              {weeks.map((week) => {
                const day = week.days[dow];
                const stat = byDay.get(dayKey(day));
                const count = stat?.count || 0;
                const future = day.getTime() > todayTs;
                const wk = weekKeyOf(week.days[0].getTime());
                const met = goalMet(
                  byWeek.get(wk) || 0,
                  goals[wk] ?? WEEK_GOAL_DEFAULT
                );
                return (
                  <span
                    key={dayKey(day)}
                    className={`hm-cell hm-t${
                      future ? 0 : tier(count)
                    }${future ? " future" : ""}${
                      day.getTime() === todayTs ? " today" : ""
                    }${met && !future ? " hm-goal-met" : ""}`}
                    data-count={future ? "" : count}
                    onMouseEnter={
                      future ? undefined : (e) => showTip(e, day, stat)
                    }
                    onMouseLeave={() => setTip(null)}
                  >
                    {!future && count > 0 ? count : ""}
                  </span>
                );
              })}
            </React.Fragment>
          ))}
          <span className="hm-corner" />
          {weeks.map((week) => {
            const wk = weekKeyOf(week.days[0].getTime());
            const met = goalMet(
              byWeek.get(wk) || 0,
              goals[wk] ?? WEEK_GOAL_DEFAULT
            );
            return (
              <span className="hm-badge-slot" key={`badge-${week.key}`}>
                {met && (
                  <span
                    className="hm-badge"
                    title={`本周目标已达成（${byWeek.get(wk)} 个）`}
                  >
                    <LogoIcon size={12} tone={GOLD_TONE} />
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
      {tip && (
        <div
          className={`heatmap-tip${tip.flip ? " flip" : ""}`}
          role="tooltip"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
