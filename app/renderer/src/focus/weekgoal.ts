// 周目标覆盖：键 = 北京时间周一日期（yyyy-mm-dd），未设置的周默认 60。
// 独立存储键，不碰既有 pomatez-focus-v1 / pomatez-focus-sound-v1。
// 纯函数 + localStorage 薄封装，node --test 可直接断言。
import { beijingWeekStart } from "./week";

export const WEEK_GOAL_DEFAULT = 60;
export const WEEK_GOAL_MIN = 1;
export const WEEK_GOAL_MAX = 350; // 单任务日上限 50 × 7 天
const STORAGE_KEY = "pomatez-focus-weekgoal-v1";
const BEIJING_OFFSET_MS = 8 * 3600000;

// 任意时刻 → 所在北京周的周一日期键（与农场「本周已收」同一周口径）
export function weekKeyOf(now: number): string {
  const start = beijingWeekStart(now);
  const shifted = new Date(start + BEIJING_OFFSET_MS);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(
    shifted.getUTCDate()
  )}`;
}

// 读取全部覆盖；损坏内容、非对象、越界值一律按无覆盖处理
export function loadWeekGoals(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed))
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(key) &&
        isValidGoal(value as number)
      )
        out[key] = value as number;
    return out;
  } catch {
    return {};
  }
}

// 某周目标：有覆盖用覆盖，否则默认 60
export function weekGoal(
  now: number,
  goals = loadWeekGoals()
): number {
  return goals[weekKeyOf(now)] ?? WEEK_GOAL_DEFAULT;
}

export function isValidGoal(value: any): boolean {
  return (
    Number.isInteger(value) &&
    value >= WEEK_GOAL_MIN &&
    value <= WEEK_GOAL_MAX
  );
}

// 仅写入该周键，其他周覆盖原样保留；返回完整覆盖表供 state 更新
export function saveWeekGoal(
  now: number,
  goal: number
): Record<string, number> {
  if (!isValidGoal(goal))
    throw new Error(
      `周目标必须是 ${WEEK_GOAL_MIN}–${WEEK_GOAL_MAX} 的整数`
    );
  const goals = { ...loadWeekGoals(), [weekKeyOf(now)]: goal };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch {
    /* 私密模式等写入失败时按当次内存态处理 */
  }
  return goals;
}

// 达成判定：有收获且累计 ≥ 目标（当前周与历史周同口径）
export function goalMet(count: number, goal: number): boolean {
  return count > 0 && count >= goal;
}

// chip 进度条比例：0–1，越界收敛；无有效目标按 0
export function goalProgressRatio(total: number, goal: number): number {
  if (!Number.isFinite(goal) || goal <= 0 || total <= 0) return 0;
  return Math.min(1, total / goal);
}

// 进度填充色：淡番茄红 → 饱满红（不透明度随比例加深，文字始终可读）
export function goalFill(ratio: number): string {
  const r = Math.min(1, Math.max(0, ratio));
  const alpha = Math.round((0.1 + 0.3 * r) * 100) / 100;
  return `rgba(194, 47, 31, ${alpha})`;
}
