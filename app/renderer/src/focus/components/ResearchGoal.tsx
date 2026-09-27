import React, { useEffect, useRef, useState } from "react";
import type { FocusSession } from "../session";
import {
  loadResearchGoals,
  researchGoal,
  researchWeeks,
  saveResearchGoal,
} from "../research";
import { goalProgressRatio } from "../weekgoal";

export default function ResearchGoal({
  records,
}: {
  records: FocusSession[];
}) {
  const [goals, setGoals] = useState(loadResearchGoals);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    const dismiss = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, []);
  const count = researchWeeks(records, now, 1)[0].count;
  const goal = researchGoal(now, goals);
  const show = () => {
    setInput(String(goal));
    setError("");
    setOpen(true);
  };
  const save = () => {
    try {
      setGoals(saveResearchGoal(Date.now(), Number(input)));
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <span
      ref={root}
      className="weekgoal research-weekgoal"
      onMouseEnter={show}
      onMouseLeave={() => {
        if (!root.current?.contains(document.activeElement))
          setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className={`weekgoal-chip research-goal${
          count >= goal ? " met" : ""
        }`}
        aria-label="设置科研周目标"
        aria-expanded={open}
        onClick={show}
      >
        <span
          className="wg-fill"
          style={{ width: `${goalProgressRatio(count, goal) * 100}%` }}
        />
        <span className="wg-text">
          科研 {count}/<b>{goal}</b>
          {count >= goal ? " ✓" : ""}
        </span>
      </button>
      {open && (
        <div
          className="weekgoal-pop"
          role="dialog"
          aria-label="科研本周目标"
        >
          <div className="weekgoal-row">
            <input
              type="number"
              min={1}
              max={350}
              step={1}
              aria-label="科研本周目标数"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />
            <button
              type="button"
              className="btn-small outline"
              onClick={save}
            >
              保存
            </button>
          </div>
          {error ? (
            <div className="weekgoal-error" role="alert">
              {error}
            </div>
          ) : (
            <div className="weekgoal-hint">
              仅本周生效，其他周默认
              40。只统计科研红番茄，总周目标不变。
            </div>
          )}
        </div>
      )}
    </span>
  );
}
