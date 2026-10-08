import React, { useEffect, useMemo, useRef } from "react";
import { FocusSession } from "../session";
import { halfHourMatrix } from "../stats";

const timeLabel = (slot: number) =>
  `${String(Math.floor(slot / 2)).padStart(2, "0")}:${
    slot % 2 ? "30" : "00"
  }`;
const tier = (v: number) =>
  v <= 0 ? 0 : v < 0.5 ? 1 : v < 1 ? 2 : v < 2 ? 3 : v < 4 ? 4 : 5;

// 与统计页共用 saved 番茄的半小时分摊口径；只显示本地今天。
export default function TodayTimeHeatmap({
  records,
}: {
  records: FocusSession[];
}) {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  ).getTime();
  const matrix = useMemo(
    () =>
      halfHourMatrix(
        records.filter((r) => r.status === "saved"),
        { start, end }
      ),
    [records, start, end]
  );
  const slots = matrix.rows[(now.getDay() + 6) % 7];
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTop = el.scrollHeight - el.clientHeight;
  }, [start]);
  return (
    <div className="today-heatmap" aria-label="今日半小时专注热力">
      <span className="today-heatmap-title">今日</span>
      <div
        className="today-heatmap-viewport"
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label="今日时段，默认8至24点，滚轮查看凌晨"
      >
        <div className="today-heatmap-body">
          <div className="today-heatmap-labels" aria-hidden="true">
            {[0, 4, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((hour) => (
              <span key={hour} style={{ top: `${(hour / 24) * 100}%` }}>
                {hour}
              </span>
            ))}
          </div>
          <div className="today-heatmap-slots">
            {slots.map((value, slot) => {
              const count = Number(value.toFixed(2));
              const detail = `${timeLabel(slot)}–${timeLabel(
                slot + 1
              )} · ${count} 个番茄`;
              return (
                <span
                  key={slot}
                  className={`today-heatmap-cell hm-t${tier(value)}`}
                  data-slot={slot}
                  data-count={value}
                  title={detail}
                  aria-label={detail}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
