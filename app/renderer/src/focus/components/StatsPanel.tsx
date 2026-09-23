import React, { useMemo, useState } from "react";
import { FocusSession } from "../session";
import {
  RANGE_LABELS,
  RangeKey,
  barBuckets,
  currentStreak,
  focusDurationTrend,
  halfHourMatrix,
  inRange,
  isCurrentRange,
  rangeOf,
  shiftRange,
  summarize,
} from "../stats";
import { barTone } from "../week";
import { renderShareCardPng, shareCardModel } from "../shareCard";
import { WindowControls, durationText } from "./shared";
import StatsTrendChart from "./StatsTrendChart";

const WEEK_CHARS = "一二三四五六日";

// 热力格分档（番茄数，跨格分摊可能带小数）：0 / <0.5 / <1 / <2 / <4 / ≥4，
// 与月历同一番茄红色系
const heatTier = (v: number) =>
  v <= 0 ? 0 : v < 0.5 ? 1 : v < 1 ? 2 : v < 2 ? 3 : v < 4 ? 4 : 5;
const countText = (v: number) =>
  v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1);
const slotLabel = (col: number) =>
  `${String(Math.floor(col / 2)).padStart(2, "0")}:${
    col % 2 ? "30" : "00"
  }`;

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
  const range = useMemo(
    () => rangeOf(rangeKey, anchor),
    [rangeKey, anchor]
  );
  const current = isCurrentRange(range, now);
  const scoped = useMemo(
    () => inRange(records, range),
    [records, range]
  );
  const summary = useMemo(() => summarize(scoped), [scoped]);
  // 趋势随区间翻页锚定该区间末日；当前区间锚定今天。
  const trendAnchor = Math.min(now, range.end - 1);
  // 连续天数是全历史口径（不只是当前区间），切换区间不跳动
  const streak = useMemo(
    () => currentStreak(records, now),
    [records, now]
  );
  const buckets = useMemo(
    () => barBuckets(scoped, range, now),
    [scoped, range, now]
  );
  const trendPoints = useMemo(
    () => focusDurationTrend(records, trendAnchor),
    [records, trendAnchor]
  );
  const heat = useMemo(
    () => halfHourMatrix(scoped, range),
    [scoped, range]
  );
  const barMax = Math.max(1, ...buckets.map((b) => b.count));
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
    a.download = `番茄农场-${
      RANGE_LABELS[rangeKey]
    }-${range.label.replace(/[\\/:*?"<>|]/g, "")}.png`;
    a.click();
  };
  // 「现在」标记：仅当前周视图，在今天这列的当前半小时格上描边
  const nowSlot = (() => {
    if (!current || range.key !== "week") return null;
    const d = new Date(now);
    return {
      row: (d.getDay() + 6) % 7,
      col: Math.min(
        47,
        d.getHours() * 2 + (d.getMinutes() >= 30 ? 1 : 0)
      ),
    };
  })();
  return (
    <main className="content stats-page">
      <div className="side-title">
        专注统计
        <div
          className="stats-tabs"
          role="tablist"
          aria-label="统计区间"
        >
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={rangeKey === key}
              className={`stats-tab${
                rangeKey === key ? " selected" : ""
              }`}
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
            分享
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
      {summary.count === 0 && summary.seconds === 0 ? (
        <div className="card stats-empty">所选区间暂无专注记录</div>
      ) : (
        <>
          <StatsTrendChart points={trendPoints} />
          <div className="stats-grid">
            <div className="stats-col">
              <section className="card stats-card stats-summary">
                <h3>区间合计</h3>
                <div className="stats-summary-metrics">
                  <div className="st-row">
                    <span className="st-label">番茄</span>
                    <div className="st-value">
                      <strong>{summary.count}</strong>
                    </div>
                  </div>
                  <div className="st-row">
                    <span className="st-label">专注时长</span>
                    <div className="st-value">
                      <strong className="long">
                        {durationText(summary.seconds)}
                      </strong>
                    </div>
                  </div>
                  <div className="st-row">
                    <span className="st-label">活跃天数</span>
                    <div className="st-value">
                      <strong>{summary.activeDays}</strong>
                    </div>
                  </div>
                  <div className="st-row">
                    <span className="st-label">日均番茄</span>
                    <div className="st-value">
                      <strong>{summary.avgCount}</strong>
                    </div>
                  </div>
                  <div className="st-row streak">
                    <span className="st-label">连续收获</span>
                    <div className="st-value">
                      <strong
                        data-tier={streak >= 7 ? "mid" : undefined}
                      >
                        {streak} 天
                      </strong>
                    </div>
                  </div>
                </div>
              </section>
              <section className="card stats-card stats-bars">
                <h3>{BAR_TITLE[rangeKey]}</h3>
                <div
                  className={`bars${
                    buckets.length > 14 ? " dense" : ""
                  }`}
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
                          title={`${b.label} · ${
                            b.count
                          } 个番茄 · ${durationText(b.seconds)}`}
                        />
                        <span className="bar-label">{b.label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <section className="card stats-card stats-heat">
              <h3>时段热力</h3>
              <div className="sh-grid">
                <span className="sh-corner" />
                {WEEK_CHARS.split("").map((w) => (
                  <span className="sh-weekday" key={w}>
                    {w}
                  </span>
                ))}
                {Array.from({ length: 48 }, (_, col) => (
                  <React.Fragment key={col}>
                    {col % 4 === 0 ? (
                      <span className="sh-hour">{col / 2}</span>
                    ) : (
                      <span className="sh-hour" />
                    )}
                    {heat.rows.map((cols, row) => {
                      const value = cols[col];
                      const tip = `周${WEEK_CHARS[row]} ${slotLabel(
                        col
                      )}–${slotLabel(col + 1)}`;
                      return (
                        <span
                          key={row}
                          className={`sh-cell hm-t${heatTier(value)}${
                            nowSlot &&
                            nowSlot.row === row &&
                            nowSlot.col === col
                              ? " now"
                              : ""
                          }`}
                          title={
                            value > 0
                              ? `${tip} · ${countText(value)} 个番茄`
                              : `${tip} · 暂无收获`
                          }
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
