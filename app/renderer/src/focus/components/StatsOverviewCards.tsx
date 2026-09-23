import React, { useMemo } from "react";
import type { FocusSession } from "../session";
import {
  annualHeatmap,
  BarBucket,
  inRange,
  RangeInfo,
  summarize,
} from "../stats";
import { durationText } from "./shared";

const dateText = (ms: number) => {
  const date = new Date(ms);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};
const timeText = (ms: number) => {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
};
const heatLevel = (seconds: number) =>
  seconds <= 0
    ? 0
    : seconds < 3600
    ? 1
    : seconds < 10800
    ? 2
    : seconds < 18000
    ? 3
    : 4;

function MetricBars({
  title,
  buckets,
  metric,
  now,
}: {
  title: string;
  buckets: BarBucket[];
  metric: "count" | "seconds";
  now: number;
}) {
  const values = buckets.filter((bucket) => bucket.start <= now);
  const max = Math.max(1, ...values.map((bucket) => bucket[metric]));
  return (
    <section className="card stats-insight-card">
      <div className="stats-insight-heading">
        <h3>{title}</h3>
        <span>{metric === "count" ? "番茄数" : "实际专注时长"}</span>
      </div>
      {values.some((bucket) => bucket[metric] > 0) ? (
        <div
          className="stats-metric-bars"
          role="img"
          aria-label={title}
        >
          {values.map((bucket, index) => (
            <div
              className="stats-metric-col"
              key={`${bucket.start}-${index}`}
            >
              <span
                className={`stats-metric-bar ${metric}`}
                style={{
                  height: `${Math.max(
                    2,
                    (bucket[metric] / max) * 130
                  )}px`,
                }}
                title={`${bucket.label} · ${
                  bucket.count
                } 个番茄 · ${durationText(bucket.seconds)}`}
              />
              <small>
                {values.length <= 14 || index % 5 === 0
                  ? bucket.label
                  : ""}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <p className="stats-insight-empty">所选区间暂无记录</p>
      )}
    </section>
  );
}

export default function StatsOverviewCards({
  records,
  scoped,
  buckets,
  range,
  now,
}: {
  records: FocusSession[];
  scoped: FocusSession[];
  buckets: BarBucket[];
  range: RangeInfo;
  now: number;
}) {
  const year = new Date(Math.min(now, range.end - 1)).getFullYear();
  const cells = useMemo(
    () => annualHeatmap(records, year),
    [records, year]
  );
  const allSummary = useMemo(
    () =>
      summarize(records.filter((record) => record.status === "saved")),
    [records]
  );
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const todayStartMs = todayStart.getTime();
  const todayEndMs = todayEnd.getTime();
  const todaySummary = useMemo(
    () =>
      summarize(
        inRange(records, { start: todayStartMs, end: todayEndMs })
      ),
    [records, todayStartMs, todayEndMs]
  );
  const recent = useMemo(
    () =>
      scoped
        .filter(
          (record) =>
            record.status === "saved" &&
            ((record.acceptedSeconds || 0) > 0 ||
              (record.completedCount || 0) > 0)
        )
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 10),
    [scoped]
  );
  return (
    <div className="stats-insights-wrap">
      <section
        className="card stats-overview-strip"
        aria-label="专注总览"
      >
        <div>
          <strong>{todaySummary.count}</strong>
          <span>今日番茄</span>
        </div>
        <div>
          <strong>{allSummary.count}</strong>
          <span>总番茄</span>
        </div>
        <div>
          <strong>{durationText(todaySummary.seconds)}</strong>
          <span>今日专注时长</span>
        </div>
        <div>
          <strong>{durationText(allSummary.seconds)}</strong>
          <span>总专注时长</span>
        </div>
      </section>
      <div className="stats-insights">
        <section className="card stats-insight-card stats-timeline-card">
          <div className="stats-insight-heading">
            <h3>专注时间线</h3>
            <span>所选区间 · 最近 {recent.length} 条</span>
          </div>
          {recent.length ? (
            <ol className="stats-timeline">
              {recent.map((record) => (
                <li key={record.id}>
                  <span
                    className="stats-timeline-dot"
                    aria-hidden="true"
                  />
                  <time
                    dateTime={new Date(record.startedAt).toISOString()}
                  >
                    {dateText(record.startedAt)} ·{" "}
                    {timeText(record.startedAt)}
                    {record.endedAt &&
                      `–${
                        dateText(record.endedAt) ===
                        dateText(record.startedAt)
                          ? ""
                          : `${dateText(record.endedAt)} `
                      }${timeText(record.endedAt)}`}
                  </time>
                  <strong>
                    {record.acceptedSeconds
                      ? durationText(record.acceptedSeconds)
                      : "时长未记录"}
                  </strong>
                  {(record.completedCount || 0) > 0 && (
                    <small>{record.completedCount} 个番茄</small>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="stats-insight-empty">所选区间暂无记录</p>
          )}
        </section>
        <section className="card stats-insight-card stats-annual-card">
          <div className="stats-insight-heading">
            <h3>年度专注热力图</h3>
            <span>{year} 年 · 按实际时长</span>
          </div>
          <div className="stats-annual-scroll">
            <div
              className="stats-annual-months"
              aria-hidden="true"
              style={{ width: `${(cells.length / 7) * 15 - 3}px` }}
            >
              {Array.from({ length: 12 }, (_, month) => (
                <span key={month}>{month + 1}月</span>
              ))}
            </div>
            <div
              className="stats-annual-grid"
              role="img"
              aria-label={`${year} 年每日专注时长热力图`}
            >
              {cells.map((cell) => (
                <span
                  key={cell.date}
                  className={`stats-annual-cell level-${heatLevel(
                    cell.seconds
                  )}${cell.inYear ? "" : " outside"}`}
                  title={
                    cell.inYear
                      ? `${dateText(cell.date)} · ${
                          cell.count
                        } 个番茄 · ${durationText(cell.seconds)}`
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
          <div className="stats-annual-legend">
            <span>少</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i
                key={level}
                className={`stats-annual-cell level-${level}`}
              />
            ))}
            <span>多</span>
          </div>
        </section>
        <MetricBars
          title="番茄趋势"
          buckets={buckets}
          metric="count"
          now={now}
        />
        <MetricBars
          title="专注时长趋势"
          buckets={buckets}
          metric="seconds"
          now={now}
        />
      </div>
    </div>
  );
}
