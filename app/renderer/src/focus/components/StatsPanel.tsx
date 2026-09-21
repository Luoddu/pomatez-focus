import React, { useMemo, useState } from "react";
import { FocusSession } from "../session";
import {
  RANGE_LABELS,
  RangeKey,
  barBuckets,
  currentStreak,
  halfHourMatrix,
  inRange,
  rangeOf,
  summarize,
  topTasks,
} from "../stats";
import { QUADRANT_TONES, QuadrantKey } from "../week";
import { WindowControls, durationText } from "./shared";

const WEEK_CHARS = "一二三四五六日";
const HOUR_MARKS = [0, 6, 12, 18, 24];

// 热力格分档（番茄数，半小时内可能因跨格分摊出小数）：
// 0 / <0.5 / <1 / <2 / <4 / ≥4，与月历同一番茄红色系
const heatTier = (v: number) =>
  v <= 0 ? 0 : v < 0.5 ? 1 : v < 1 ? 2 : v < 2 ? 3 : v < 4 ? 4 : 5;
const countText = (v: number) =>
  v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1);
const slotLabel = (col: number) =>
  `${String(Math.floor(col / 2)).padStart(2, "0")}:${col % 2 ? "30" : "00"}`;

const BAR_TITLE: Record<RangeKey, string> = {
  week: "每日收获",
  month: "每日收获",
  quarter: "每周收获",
  year: "每月收获",
};

export default function StatsPanel({
  records,
  onClose,
  pinned,
  settingsOpen,
  onToggleSettings,
  onToggleCompact,
  onTogglePin,
}: {
  records: FocusSession[];
  onClose: () => void;
  pinned: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onToggleCompact: () => void;
  onTogglePin: () => void;
}) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [now, setNow] = useState(() => Date.now());
  const range = useMemo(() => rangeOf(rangeKey, now), [rangeKey, now]);
  const scoped = useMemo(() => inRange(records, range), [records, range]);
  const summary = useMemo(() => summarize(scoped), [scoped]);
  // 连续天数是全历史口径（不只是当前区间），切换区间不跳动
  const streak = useMemo(
    () => currentStreak(records, now),
    [records, now]
  );
  const buckets = useMemo(
    () => barBuckets(scoped, range, now),
    [scoped, range, now]
  );
  const heat = useMemo(() => halfHourMatrix(scoped, range), [scoped, range]);
  const tops = useMemo(() => topTasks(scoped), [scoped]);
  const barMax = Math.max(1, ...buckets.map((b) => b.count));
  const topMax = Math.max(1, ...tops.map((t) => t.count));
  // 黄金时段：热力矩阵里最高的一格
  const golden = useMemo(() => {
    let best: { row: number; col: number; value: number } | null = null;
    heat.rows.forEach((cols, row) =>
      cols.forEach((value, col) => {
        if (value > 0 && (!best || value > best.value))
          best = { row, col, value };
      })
    );
    return best as { row: number; col: number; value: number } | null;
  }, [heat]);
  const switchRange = (key: RangeKey) => {
    setNow(Date.now());
    setRangeKey(key);
  };
  return (
    <main className="content stats-page">
      <div className="side-title">
        专注统计
        <div className="stats-tabs" role="tablist" aria-label="统计区间">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={rangeKey === key}
              className={`stats-tab${rangeKey === key ? " selected" : ""}`}
              onClick={() => switchRange(key)}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
        <span className="stats-range-label">{range.label}</span>
        <span className="side-title-actions">
          <button className="btn-text" onClick={onClose}>
            返回
          </button>
        </span>
        <WindowControls
          pinned={pinned}
          settingsOpen={settingsOpen}
          onToggleSettings={onToggleSettings}
          onToggleCompact={onToggleCompact}
          onTogglePin={onTogglePin}
        />
      </div>
      <div className="stats-summary">
        <div className="card stat">
          <strong>{summary.count}</strong>
          <span>番茄</span>
        </div>
        <div className="card stat">
          <strong className="long">{durationText(summary.seconds)}</strong>
          <span>专注时长</span>
        </div>
        <div className="card stat">
          <strong>{summary.activeDays}</strong>
          <span>活跃天数</span>
        </div>
        <div className="card stat">
          <strong>{summary.avgCount}</strong>
          <span>日均番茄</span>
        </div>
        <div className="card stat">
          <strong data-tier={streak >= 7 ? "mid" : undefined}>
            {streak} 天
          </strong>
          <span>🔥 连续收获</span>
        </div>
      </div>
      {summary.count === 0 ? (
        <div className="card stats-empty">
          这个区间还没有收获 · 种一颗 25 分钟的番茄，下周再来看 🍅
        </div>
      ) : (
        <div className="stats-grid">
          <section className="card stats-card">
            <h3>🍅 {BAR_TITLE[rangeKey]}</h3>
            <div
              className={`bars${buckets.length > 14 ? " dense" : ""}`}
              role="img"
              aria-label={`${BAR_TITLE[rangeKey]}柱状图`}
            >
              {buckets.map((b, i) => (
                <div className="bar-col" key={i}>
                  {buckets.length <= 14 && b.count > 0 && (
                    <span className="bar-val">{b.count}</span>
                  )}
                  <div
                    className={`bar${b.isToday ? " today" : ""}${
                      b.count === barMax && b.count > 0 ? " max" : ""
                    }`}
                    style={{
                      height: `${(b.count / barMax) * 100}%`,
                    }}
                    title={`${b.label} · ${b.count} 个番茄 · ${durationText(
                      b.seconds
                    )}`}
                  />
                  <span className="bar-label">{b.label}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="card stats-card">
            <h3>⏰ 时段热力 · 每半小时</h3>
            <div className="sh-grid">
              <span className="sh-dow" />
              {Array.from({ length: 48 }, (_, col) => (
                <span className="sh-hour" key={col}>
                  {col % 12 === 0 ? col / 2 : ""}
                </span>
              ))}
              {heat.rows.map((cols, row) => (
                <React.Fragment key={row}>
                  <span className="sh-dow">{WEEK_CHARS[row]}</span>
                  {cols.map((value, col) => (
                    <span
                      key={col}
                      className={`sh-cell hm-t${heatTier(value)}`}
                      title={
                        value > 0
                          ? `周${WEEK_CHARS[row]} ${slotLabel(col)}–${slotLabel(
                              col + 1
                            )} · ${countText(value)} 个番茄`
                          : `周${WEEK_CHARS[row]} ${slotLabel(col)}–${slotLabel(
                              col + 1
                            )} · 暂无收获`
                        }
                      />
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="sh-legend">
              <span>少</span>
              {[1, 2, 3, 4, 5].map((t) => (
                <i key={t} className={`sh-cell hm-t${t}`} />
              ))}
              <span>多</span>
              <em>横轴 0–24 点，每格半小时</em>
            </div>
          </section>
          <section className="card stats-card">
            <h3>🏅 任务排行</h3>
            <ul className="top-list">
              {tops.map((t, i) => (
                <li key={t.name}>
                  <span className="top-rank">{i + 1}</span>
                  <i
                    className="top-dot"
                    style={{
                      background:
                        QUADRANT_TONES[
                          (t.quadrant as QuadrantKey) || "free"
                        ] || QUADRANT_TONES.free,
                    }}
                  />
                  <span className="top-name" title={t.name}>
                    {t.name}
                  </span>
                  <span className="top-bar">
                    <i style={{ width: `${(t.count / topMax) * 100}%` }} />
                  </span>
                  <span className="top-count">{t.count} 个</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card stats-card">
            <h3>✨ 高光时刻</h3>
            <ul className="glory-list">
              <li>
                <span className="glory-label">最佳一天</span>
                <strong>
                  {summary.bestDay
                    ? `${
                        new Date(summary.bestDay.date).getMonth() + 1
                      }.${new Date(summary.bestDay.date).getDate()} · ${
                        summary.bestDay.count
                      } 个番茄`
                    : "—"}
                </strong>
              </li>
              <li>
                <span className="glory-label">黄金时段</span>
                <strong>
                  {golden
                    ? `周${WEEK_CHARS[golden.row]} ${slotLabel(golden.col)}`
                    : "—"}
                </strong>
              </li>
              <li>
                <span className="glory-label">连续收获</span>
                <strong>{streak > 0 ? `${streak} 天 🔥` : "—"}</strong>
              </li>
              <li>
                <span className="glory-label">平均每活跃日</span>
                <strong>
                  {summary.activeDays
                    ? `${summary.avgCount} 个 · ${durationText(
                        Math.round(summary.seconds / summary.activeDays)
                      )}`
                    : "—"}
                </strong>
              </li>
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
