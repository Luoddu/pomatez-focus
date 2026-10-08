import React from "react";
import { journeyRoad } from "../journey.js";

export default function FarmProgress({ total }: { total: number }) {
  const { reached, next } = journeyRoad(total);
  const progress = Math.max(
    0,
    Math.min(100, ((total - reached) / (next - reached)) * 100)
  );
  return (
    <div
      className="farm-total-progress stat-totalbar"
      title={`累计 ${total} 个番茄 · 每25个番茄一面小旗`}
      aria-label={`累计${total}个番茄，每25个番茄一面小旗`}
    >
      <span className="stb-from">{reached}</span>
      <div className="stb-main">
        <div className="stb-track" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
          <span
            className={`stb-current${
              progress < 5
                ? " at-start"
                : progress > 95
                ? " at-end"
                : ""
            }`}
            style={{ left: `${progress}%` }}
          >
            {total}
          </span>
          {[25, 50, 75, 100].map((offset) => (
            <span
              key={offset}
              className={`ms-flag${
                total >= reached + offset ? " raised" : ""
              }`}
              style={{ left: `${offset}%` }}
              title={`${reached + offset}个番茄`}
            >
              <svg viewBox="0 0 14 20" width="10" height="15">
                <path
                  d="M2 19V1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M3 2l9 3-9 3z" fill="currentColor" />
              </svg>
            </span>
          ))}
        </div>
      </div>
      <span className="stb-to">{next}</span>
    </div>
  );
}
