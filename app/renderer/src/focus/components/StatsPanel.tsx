import React, { useMemo, useState } from "react";
import { FocusSession } from "../session";
import {
  RANGE_LABELS,
  RangeKey,
  barBuckets,
  currentStreak,
  daypartSplit,
  halfHourMatrix,
  hourlyRows,
  inRange,
  isCurrentRange,
  rangeOf,
  shiftRange,
  summarize,
} from "../stats";
import {
  QUADRANT_KEYS,
  QUADRANT_TONES,
  QuadrantKey,
  barTone,
  quadrantCounts,
} from "../week";
import { renderShareCardPng, shareCardModel } from "../shareCard";
import { WindowControls, durationText } from "./shared";

const WEEK_CHARS = "一二三四五六日";

// 热力格分档（番茄数，跨格分摊可能带小数）：0 / <0.5 / <1 / <2 / <4 / ≥4，
// 与月历同一番茄红色系
const heatTier = (v: number) =>
  v <= 0 ? 0 : v < 0.5 ? 1 : v < 1 ? 2 : v < 2 ? 3 : v < 4 ? 4 : 5;
const countText = (v: number) =>
  v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1);
const slotLabel = (col: number) =>
  `${String(Math.floor(col / 2)).padStart(2, "0")}:${col % 2 ? "30" : "00"}`;

// 象限名（只展示象限，不展示任何任务名——统计页可被截图分享，隐私安全）
const QUAD_LABELS: Record<QuadrantKey, string> = {
  iu: "重要且紧急",
  inu: "重要不紧急",
  uni: "紧急不重要",
  unu: "不紧急不重要",
  free: "自由番茄",
};

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
  // anchor：区间内的任意一天；翻页只动 anchor，tab 切换重置回今天
  const [anchor, setAnchor] = useState(() => Date.now());
  const now = Date.now();
  const range = useMemo(() => rangeOf(rangeKey, anchor), [rangeKey, anchor]);
  const current = isCurrentRange(range, now);
  const scoped = useMemo(() => inRange(records, range), [records, range]);
  const summary = useMemo(() => summarize(scoped), [scoped]);
  // 连续天数是全历史口径（不只是当前区间），切换区间不跳动
  const streak = useMemo(() => currentStreak(records, now), [records, now]);
  const buckets = useMemo(
    () => barBuckets(scoped, range, now),
    [scoped, range, now]
  );
  const heat = useMemo(() => halfHourMatrix(scoped, range), [scoped, range]);
  // 展示层按小时合并（格子更方正）；时段偏好复用同一矩阵汇总
  const hours = useMemo(() => hourlyRows(heat), [heat]);
  const dayparts = useMemo(() => daypartSplit(heat), [heat]);
  // 象限分布：只统计投入番茄数，不出现任务名
  const quads = useMemo(() => quadrantCounts(scoped), [scoped]);
  const quadTotal = Math.max(
    1,
    QUADRANT_KEYS.reduce((a, k) => a + quads[k], 0)
  );
  const quadMax = Math.max(1, ...QUADRANT_KEYS.map((k) => quads[k]));
  const partMax = Math.max(1, ...dayparts.map((d) => d.count));
  const barMax = Math.max(1, ...buckets.map((b) => b.count));
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
    setAnchor(Date.now());
    setRangeKey(key);
  };
  // 分享卡片：离屏渲染当前区间的成就图 PNG 并导出；
  // 测试钩子 __SHARE_CARD_HOOK__ 置位时只记录 dataURL 长度，不触发下载
  const onShare = () => {
    const model = shareCardModel(records, range, now);
    const dataUrl = renderShareCardPng(model);
    if ((window as any).__SHARE_CARD_HOOK__) {
      (window as any).__shareCardPng = dataUrl;
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `番茄农场-${RANGE_LABELS[rangeKey]}-${range.label.replace(/[\\/:*?"<>|]/g, "")}.png`;
    a.click();
  };
  // 「现在」标记：仅当前周视图，在今天这列的当前小时格上描边
  const nowSlot = (() => {
    if (!current || range.key !== "week") return null;
    const d = new Date(now);
    return { row: (d.getDay() + 6) % 7, col: Math.min(23, d.getHours()) };
  })();
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
        <span className="stats-pager">
          <button
            className="ghost-btn stats-nav"
            aria-label="上一区间"
            title={`上一${RANGE_LABELS[rangeKey]}`}
            onClick={() => setAnchor(shiftRange(range, -1).start + 1)}
          >
            ‹
          </button>
          <button
            className="stats-range-label"
            title={current ? "当前区间" : "点击回到当前区间"}
            onClick={() => setAnchor(Date.now())}
          >
            {range.label}
            {!current && <em>回到本{RANGE_LABELS[rangeKey]}</em>}
          </button>
          <button
            className="ghost-btn stats-nav"
            aria-label="下一区间"
            title={`下一${RANGE_LABELS[rangeKey]}`}
            disabled={current}
            onClick={() => setAnchor(shiftRange(range, 1).start + 1)}
          >
            ›
          </button>
        </span>
        <span className="side-title-actions">
          <button
            className="btn-text share-btn"
            title="导出当前区间的成就图（不含任何任务名）"
            onClick={onShare}
          >
            📸 分享
          </button>
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
              {buckets.map((b, i) => {
                const tone = barTone(b.count);
                return (
                  <div className="bar-col" key={i}>
                    {buckets.length <= 14 && b.count > 0 && (
                      <span className="bar-val">{b.count}</span>
                    )}
                    <div
                      className={`bar${b.isToday ? " today" : ""}`}
                      style={{
                        height: `${(b.count / barMax) * 100}%`,
                        background: `linear-gradient(180deg, ${tone.top}, ${tone.bottom})`,
                        boxShadow: tone.glow || undefined,
                      }}
                      title={`${b.label} · ${b.count} 个番茄 · ${durationText(
                        b.seconds
                      )}`}
                    />
                    <span className="bar-label">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card stats-card">
            <h3>⏰ 时段热力</h3>
            <div className="sh-grid">
              <span className="sh-corner" />
              {WEEK_CHARS.split("").map((w) => (
                <span className="sh-weekday" key={w}>
                  {w}
                </span>
              ))}
              {Array.from({ length: 24 }, (_, col) => (
                <React.Fragment key={col}>
                  {col % 2 === 0 ? (
                    <span className="sh-hour">{col}</span>
                  ) : (
                    <span className="sh-hour" />
                  )}
                  {hours.map((cols, row) => {
                    const value = cols[col];
                    return (
                      <span
                        key={row}
                        className={`sh-cell hm-t${heatTier(value)}${
                          nowSlot && nowSlot.row === row && nowSlot.col === col
                            ? " now"
                            : ""
                        }`}
                        title={
                          value > 0
                            ? `周${WEEK_CHARS[row]} ${String(col).padStart(
                                2,
                                "0"
                              )}:00–${String(col + 1).padStart(
                                2,
                                "0"
                              )}:00 · ${countText(value)} 个番茄`
                            : `周${WEEK_CHARS[row]} ${String(col).padStart(
                                2,
                                "0"
                              )}:00–${String(col + 1).padStart(2, "0")}:00 · 暂无收获`
                        }
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <div className="sh-legend">
              <span>少</span>
              {[1, 2, 3, 4, 5].map((t) => (
                <i key={t} className={`sh-cell hm-t${t}`} />
              ))}
              <span>多</span>
              <em>纵轴 0–24 点 · 每格 1 小时</em>
            </div>
          </section>
          <div className="stats-trio">
            <section className="card stats-card">
              <h3>🧭 象限分布</h3>
              <ul className="dist-list">
                {QUADRANT_KEYS.map((k) => (
                  <li key={k}>
                    <i
                      className="dist-dot"
                      style={{ background: QUADRANT_TONES[k] }}
                    />
                    <span className="dist-name">{QUAD_LABELS[k]}</span>
                    <span className="dist-bar">
                      <i
                        style={{
                          width: `${(quads[k] / quadMax) * 100}%`,
                          background: QUADRANT_TONES[k],
                        }}
                      />
                    </span>
                    <span className="dist-count">
                      {quads[k]} 个 · {Math.round((quads[k] / quadTotal) * 100)}
                      %
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card stats-card">
              <h3>🕰️ 时段偏好</h3>
              <ul className="dist-list">
                {dayparts.map((d) => (
                  <li key={d.key}>
                    <i className="dist-icon">{d.icon}</i>
                    <span className="dist-name">
                      {d.label} <small>{d.hours}</small>
                    </span>
                    <span className="dist-bar">
                      <i
                        style={{ width: `${(d.count / partMax) * 100}%` }}
                      />
                    </span>
                    <span className="dist-count">
                      {countText(d.count)} 个
                    </span>
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
        </div>
      )}
    </main>
  );
}
