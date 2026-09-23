import React from "react";
import type { RangeKey } from "../stats";

type Point = { label: string; count: number; average: number };

// 控制点都落在相邻两点的高度上，不会把平滑曲线画出原始数据的范围。
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
  rangeKey,
  current,
}: {
  points: Point[];
  rangeKey: RangeKey;
  current: boolean;
}) {
  const period =
    rangeKey === "quarter" ? "周" : rangeKey === "year" ? "月" : "日";
  const max = Math.max(1, ...points.map((point) => point.count));
  const position = (value: number, index: number) => ({
    x: 36 + (index * 628) / Math.max(1, points.length - 1),
    y: 172 - (value / max) * 124,
  });
  const actual = points.map((point, index) =>
    position(point.count, index)
  );
  const average = points.map((point, index) =>
    position(point.average, index)
  );
  const area = actual.length
    ? `${curvePath(actual)} L ${actual[actual.length - 1].x} 172 L ${
        actual[0].x
      } 172 Z`
    : "";
  const tickIndexes = [
    0,
    Math.floor((points.length - 1) / 2),
    points.length - 1,
  ].filter((index, offset, all) => all.indexOf(index) === offset);
  return (
    <section className="stats-trend" aria-label="收获走势">
      <div className="stats-trend-heading">
        <div>
          <span className="stats-trend-eyebrow">专注节奏</span>
          <h3>收获走势</h3>
          <p>
            {current ? "本期截至现在" : "所选区间"} · 每{period}番茄数
          </p>
        </div>
        <div className="stats-trend-legend">
          <span>
            <i className="trend-key actual" />
            实际收获
          </span>
          <span>
            <i className="trend-key average" />近 3 {period}移动平均
          </span>
        </div>
      </div>
      <div
        className="stats-trend-plot"
        role="img"
        aria-label={`收获曲线，${points
          .map((p) => `${p.label} ${p.count} 个`)
          .join("，")}`}
      >
        <svg
          viewBox="0 0 700 204"
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
              <stop offset="0%" stopColor="#ee8178" stopOpacity=".22" />
              <stop offset="100%" stopColor="#ee8178" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="stats-trend-stroke"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#ed8c82" />
              <stop offset="100%" stopColor="#dc514f" />
            </linearGradient>
          </defs>
          {[48, 110, 172].map((y) => (
            <line
              key={y}
              className="trend-gridline"
              x1="36"
              x2="664"
              y1={y}
              y2={y}
            />
          ))}
          <text className="trend-axis" x="4" y="52">
            {max}
          </text>
          <text className="trend-axis" x="16" y="176">
            0
          </text>
          {area && <path d={area} fill="url(#stats-trend-fill)" />}
          {average.length > 1 && (
            <path
              className="trend-average-path"
              d={curvePath(average)}
            />
          )}
          {actual.length > 1 && (
            <path className="trend-actual-path" d={curvePath(actual)} />
          )}
          {actual.map((point, index) => (
            <circle
              key={index}
              className={
                index === actual.length - 1
                  ? "trend-dot latest"
                  : "trend-dot"
              }
              cx={point.x}
              cy={point.y}
              r={index === actual.length - 1 ? 5.5 : 3.5}
            />
          ))}
          {tickIndexes.map((index) => (
            <text
              key={index}
              className="trend-axis trend-date"
              x={actual[index]?.x || 36}
              y="198"
              textAnchor={
                index === 0
                  ? "start"
                  : index === points.length - 1
                  ? "end"
                  : "middle"
              }
            >
              {points[index]?.label}
            </text>
          ))}
        </svg>
      </div>
      <p className="stats-trend-note">
        曲线仅依据已保存记录；移动平均是平滑参考，不是预测。
      </p>
    </section>
  );
}
