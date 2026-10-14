import type { FocusSession } from "./session";
import { effectiveCount, TomatoWeights } from "./weights.js";
import { inRange, summarize } from "./stats";

// Same saved-record/start-date convention as the calendar; no demo overlay.
export function dailyRestProgress(
  records: FocusSession[],
  now: number,
  weights?: TomatoWeights
) {
  const date = new Date(now);
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1
  ).getTime();
  return {
    day: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`,
    completedCount: summarize(inRange(records, { start, end })).count,
    ...(weights ? { effectiveCount: effectiveCount(inRange(records, { start, end }), weights) } : {}),
  };
}
