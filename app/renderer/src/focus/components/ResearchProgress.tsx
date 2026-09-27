import React from "react";
import type { FocusSession } from "../session";
import {
  researchGoal,
  researchWeeks,
  loadResearchGoals,
} from "../research";
import { durationText } from "./shared";

export default function ResearchProgress({
  records,
  now,
  onTrend,
}: {
  records: FocusSession[];
  now: number;
  onTrend: () => void;
}) {
  const weeks = researchWeeks(records, now);
  const goals = loadResearchGoals();
  const current = weeks[weeks.length - 1];
  const goal = researchGoal(now, goals);
  const max = Math.max(
    goal,
    ...weeks.map((w) => Math.max(w.count, researchGoal(w.start, goals)))
  );
  const met = current.count >= goal;
  return (
    <section
      className="card research-progress"
      aria-label="科研持续投入"
    >
      <div className="research-heading">
        <strong>科研 · 持续生长</strong>
        <button className="btn-text" onClick={onTrend}>
          查看科研时长趋势
        </button>
      </div>
      <div className="research-metrics">
        <span>
          本周{" "}
          <b>
            {current.count}/{goal}
          </b>{" "}
          个红番茄
        </span>
        <span>
          投入 <b>{current.days}</b> 天
        </span>
        <span>{durationText(current.seconds)}</span>
      </div>
      <p>
        {met
          ? "本周科研目标已达成，每一次投入都在积累。"
          : current.count > 0
          ? `本周已积累 ${current.count} 个科研番茄，距离目标还有 ${
              goal - current.count
            } 个。按自己的节奏继续。`
          : "从一个科研番茄开始，让持续投入慢慢看得见。"}
      </p>
      <div
        className="research-weeks"
        role="list"
        aria-label="最近八周科研番茄"
      >
        {weeks.map((w, i) => {
          const target = researchGoal(w.start, goals),
            achieved = w.count >= target;
          return (
            <div
              key={w.key}
              className={`research-week${achieved ? " achieved" : ""}`}
              role="listitem"
              aria-label={`${w.key} 周：${w.count} 个科研番茄，投入 ${
                w.days
              } 天，目标 ${target}${i === 7 ? "，本周进行中" : ""}`}
            >
              <span className="research-week-count">
                {w.hasRecords ? w.count : "—"}
                {achieved ? " ✓" : ""}
              </span>
              <div className="research-week-track">
                <div
                  className="research-week-bar"
                  style={{ height: `${(w.count / max) * 100}%` }}
                />
                <i
                  className="research-week-target"
                  style={{ bottom: `${(target / max) * 100}%` }}
                />
              </div>
              <small>
                {i === 7 ? "本周" : w.key.slice(5).replace("-", "/")}
              </small>
            </div>
          );
        })}
      </div>
      <small className="research-note">
        最近 8 周 · 北京时间周一开始 · 横线为该周目标 · — 为无记录 ·
        本周尚未结束
      </small>
    </section>
  );
}
