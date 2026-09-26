import React from "react";
import type { FocusTrendPoint } from "../stats";

const minutesText = (minutes: number | null) => {
  if (minutes == null) return "—";
  return minutes < 60
    ? `${minutes} 分钟`
    : `${(minutes / 60).toFixed(1)} 小时`;
};

const curvePath = (points: { x: number; y: number }[]) =>
  points.reduce(
    (path, point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `${path} C ${(points[index - 1].x + point.x) / 2} ${
            points[index - 1].y
          }, ${(points[index - 1].x + point.x) / 2} ${point.y}, ${
            point.x
          } ${point.y}`,
    ""
  );

export default function StatsTrendChart({
  points,
  tone,
  baselineTone,
  categoryLabel = "全部",
  filters,
}: {
  points: FocusTrendPoint[];
  tone?: string;
  baselineTone?: string;
  categoryLabel?: string;
  filters?: React.ReactNode;
}) {
  const latest = points[points.length - 1];
  const max = Math.max(
    30,
    ...points.flatMap((point) =>
      [point.seven, point.twentyEight].filter(
        (value): value is number => value !== null
      )
    )
  );
  const coords = (key: "seven" | "twentyEight") =>
    points
      .map((point, index) =>
        point[key] === null
          ? null
          : {
              x: 44 + (index * 610) / Math.max(1, points.length - 1),
              y: 168 - ((point[key] || 0) / max) * 122,
            }
      )
      .filter(
        (point): point is { x: number; y: number } => point !== null
      );
  const recent = coords("seven");
  const baseline = coords("twentyEight");
  const delta =
    latest?.seven != null &&
    latest.twentyEight != null &&
    latest.twentyEight > 0
      ? Math.round(
          ((latest.seven - latest.twentyEight) / latest.twentyEight) *
            100
        )
      : null;
  const ticks = [0, 9, 18, 27];
  return (
    <section
      className="stats-trend"
      aria-label="专注趋势"
      style={
        {
          "--trend-tone": tone,
          "--trend-baseline": baselineTone,
        } as React.CSSProperties
      }
    >
      <div className="stats-trend-heading">
        <div>
          <span className="stats-trend-eyebrow">专注节奏</span>
          <h3>专注趋势</h3>
          <p>{categoryLabel} · 已保存专注时长 · 日历日均</p>
        </div>
        <div className="stats-trend-comparison">
          <div>
            <span>近 7 天</span>
            <strong>{minutesText(latest?.seven ?? null)}</strong>
          </div>
          <div>
            <span>近 28 天</span>
            <strong>{minutesText(latest?.twentyEight ?? null)}</strong>
          </div>
          {delta !== null && (
            <em className={delta >= 0 ? "up" : "down"}>
              {delta > 0 ? "+" : ""}
              {delta}%
            </em>
          )}
        </div>
      </div>
      {filters}
      <div
        className="stats-trend-plot"
        role="img"
        aria-label={`近 7 天日均 ${minutesText(
          latest?.seven ?? null
        )}，近 28 天日均 ${minutesText(latest?.twentyEight ?? null)}`}
      >
        {recent.length === 0 && (
          <p className="stats-trend-insufficient">
            记录满 7 天后显示趋势
          </p>
        )}
        <svg
          viewBox="0 0 700 208"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="stats-trend-fill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={tone || "#e87970"}
                stopOpacity=".2"
              />
              <stop
                offset="100%"
                stopColor={tone || "#e87970"}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {[46, 107, 168].map((y) => (
            <line
              key={y}
              className="trend-gridline"
              x1="44"
              x2="654"
              y1={y}
              y2={y}
            />
          ))}
          <text className="trend-axis" x="4" y="50">
            {Math.round(max)} 分
          </text>
          <text className="trend-axis" x="24" y="172">
            0
          </text>
          {recent.length > 1 && (
            <path
              d={`${curvePath(recent)} L ${
                recent[recent.length - 1].x
              } 168 L ${recent[0].x} 168 Z`}
              fill="url(#stats-trend-fill)"
            />
          )}
          {baseline.length > 1 && (
            <path
              className="trend-average-path"
              d={curvePath(baseline)}
            />
          )}
          {recent.length > 1 && (
            <path className="trend-actual-path" d={curvePath(recent)} />
          )}
          {recent.map((point, index) => (
            <circle
              key={index}
              className={
                index === recent.length - 1
                  ? "trend-dot latest"
                  : "trend-dot"
              }
              cx={point.x}
              cy={point.y}
              r={index === recent.length - 1 ? 5 : 2.6}
            />
          ))}
          {ticks.map((index) => (
            <text
              key={index}
              className="trend-axis trend-date"
              x={44 + (index * 610) / 27}
              y="199"
              textAnchor={
                index === 0 ? "start" : index === 27 ? "end" : "middle"
              }
            >
              {points[index]?.label}
            </text>
          ))}
        </svg>
      </div>
      <div className="stats-trend-legend">
        <span>
          <i className="trend-key actual" />近 7 天日均
        </span>
        <span>
          <i className="trend-key average" />近 28 天日均
        </span>
      </div>
    </section>
  );
}
