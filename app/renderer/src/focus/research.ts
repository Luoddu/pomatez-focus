import type { FocusSession } from "./session";
import { recordCategory } from "./classification.js";
import { beijingWeekStart } from "./week";
import { loadWeekGoals, saveWeekGoal, weekKeyOf } from "./weekgoal";

export const RESEARCH_GOAL_DEFAULT = 40;
const KEY = "pomatez-focus-research-weekgoal-v1";
const DAY = 86400000;
export const loadResearchGoals = () => loadWeekGoals(KEY);
export const saveResearchGoal = (now: number, goal: number) =>
  saveWeekGoal(now, goal, KEY);
export const researchGoal = (
  now: number,
  goals = loadResearchGoals()
) => goals[weekKeyOf(now)] ?? RESEARCH_GOAL_DEFAULT;

// Category overrides are authoritative; never infer research from titles/quadrants.
export function researchWeeks(
  records: FocusSession[],
  now: number,
  length = 8
) {
  const current = beijingWeekStart(now);
  return Array.from({ length }, (_, i) => {
    const start = current - (length - i - 1) * 7 * DAY;
    const saved = records.filter(
      (r) =>
        r.status === "saved" &&
        r.startedAt >= start &&
        r.startedAt < start + 7 * DAY &&
        r.startedAt <= now
    );
    const research = saved.filter(
      (r) => recordCategory(r) === "research"
    );
    const count = research.reduce(
      (n, r) => n + (r.completedCount || 0),
      0
    );
    const seconds = research.reduce(
      (n, r) => n + (r.acceptedSeconds || 0),
      0
    );
    const days = new Set(
      research
        .filter(
          (r) =>
            (r.acceptedSeconds || 0) > 0 || (r.completedCount || 0) > 0
        )
        .map((r) => Math.floor((r.startedAt + 8 * 3600000) / DAY))
    ).size;
    return {
      start,
      key: weekKeyOf(start),
      count,
      seconds,
      days,
      hasRecords: saved.length > 0,
    };
  });
}

export function researchFirst<
  T extends { tasks: { projectType?: string }[] }
>(groups: T[]): T[] {
  return groups
    .slice()
    .sort(
      (a, b) =>
        Number(b.tasks.some((t) => t.projectType === "research")) -
        Number(a.tasks.some((t) => t.projectType === "research"))
    );
}
