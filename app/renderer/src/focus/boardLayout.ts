import type { FocusTask, FocusQuadrant } from "./session";

export const BOARD_LAYOUT_KEY = "pomatez-board-layout-v1";
type Store = Pick<Storage, "getItem" | "setItem">;
export type BoardLayout = {
  version: 1;
  scope: string;
  order: string[];
  quadrants: { key: string; quadrant: FocusQuadrant }[];
};
const validKey = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 500;
const quadrants = ["iu", "inu", "uni", "unu"];
export const boardGroupKey = (t: FocusTask) => t.taskId || t.id;
const belongs = (t: FocusTask, scope: string) =>
  scope === "local" ? t.source === "local" : t.source === "feishu" && t.sourceKey === scope;
const storageKey = (scope: string) => {
  if (!validKey(scope)) throw Error("任务来源无效");
  return `${BOARD_LAYOUT_KEY}:${encodeURIComponent(scope)}`;
};
function validate(v: any, scope: string): BoardLayout {
  if (!v || v.version !== 1 || v.scope !== scope || !Array.isArray(v.order) ||
    v.order.length > 10000 || !v.order.every(validKey) || new Set(v.order).size !== v.order.length ||
    !Array.isArray(v.quadrants) || v.quadrants.length > 10000 ||
    v.quadrants.some((x: any) => !x || !validKey(x.key) || !quadrants.includes(x.quadrant)) ||
    new Set(v.quadrants.map((x: any) => x.key)).size !== v.quadrants.length)
    throw Error("看板安排格式无效");
  return { version: 1, scope, order: [...v.order],
    quadrants: v.quadrants.map((x: any) => ({ key: x.key, quadrant: x.quadrant })) };
}
export function readBoardLayout(store: Store, scope: string | null): BoardLayout | null {
  if (!scope) return null;
  try {
    const raw = store.getItem(storageKey(scope));
    return raw ? validate(JSON.parse(raw), scope) : null;
  } catch { return null; }
}
export function saveBoardLayout(store: Store, layout: BoardLayout): void {
  const clean = validate(layout, layout.scope), key = storageKey(clean.scope);
  const raw = JSON.stringify(clean);
  store.setItem(key, raw);
  if (store.getItem(key) !== raw) throw Error("看板安排未能保存，请重试");
}
// Arrangement metadata never owns plan rows, completion credit or timer records.
export function projectBoardLayout(rows: FocusTask[], layout: BoardLayout | null): FocusTask[] {
  const changes = new Map(layout?.quadrants.map(x => [x.key, x.quadrant]) || []);
  const groups = new Map<string, FocusTask[]>();
  for (const row of rows) {
    const key = boardGroupKey(row);
    const quadrant = layout && belongs(row, layout.scope) ? changes.get(key) : undefined;
    const group = groups.get(key) || [];
    group.push(quadrant && quadrant !== row.quadrant ? { ...row, quadrant } : row);
    groups.set(key, group);
  }
  const ranks = new Map(layout?.order.map((key, i) => [key, i]) || []);
  return Array.from(groups.entries()).sort(([a, at], [b, bt]) => {
    const ar = layout && at.every(t => belongs(t, layout.scope)) ? ranks.get(a) : undefined;
    const br = layout && bt.every(t => belongs(t, layout.scope)) ? ranks.get(b) : undefined;
    if (ar !== undefined || br !== undefined) return (ar ?? Infinity) - (br ?? Infinity);
    return Number(bt.some(t => t.projectType === "research")) -
      Number(at.some(t => t.projectType === "research"));
  }).flatMap(([, tasks]) => tasks);
}
export function moveBoardGroup(rows: FocusTask[], layout: BoardLayout | null,
  scope: string, key: string, quadrant: FocusQuadrant,
  target?: string, after = false): BoardLayout {
  storageKey(scope);
  if (!quadrants.includes(quadrant) || (layout && layout.scope !== scope)) throw Error("任务来源或象限已变化");
  const projected = projectBoardLayout(rows, layout);
  const group = projected.filter(t => boardGroupKey(t) === key);
  if (!group.length || group.some(t => !belongs(t, scope) || (t.kind === "pending" && !t.quickTask) || t.kind === "free"))
    throw Error("任务不存在或尚未同步，请刷新后再拖动");
  if (target === key) return layout || { version: 1, scope, order: [], quadrants: [] };
  if (target && !projected.some(t => boardGroupKey(t) === target && belongs(t, scope) && (t.quadrant || "unu") === quadrant))
    throw Error("目标任务已变化，请重新拖动");
  const order = Array.from(new Set(projected.filter(t => belongs(t, scope)).map(boardGroupKey))).filter(k => k !== key);
  let position = target ? order.indexOf(target) + Number(after) : -1;
  if (!target) {
    const groupQuadrants = new Map(projected.map(t => [boardGroupKey(t), t.quadrant || "unu"]));
    const last = order.reduce((last, k, i) => groupQuadrants.get(k) === quadrant ? i : last, -1);
    position = last < 0 ? order.length : last + 1;
  }
  order.splice(position, 0, key);
  const changes = (layout?.quadrants || []).filter(x => x.key !== key);
  changes.push({ key, quadrant });
  // Preserve preferences for temporarily absent stable tasks; bound persisted metadata.
  const present = new Set(order);
  const absent = (layout?.order || []).filter(k => !present.has(k));
  return validate({ version: 1, scope, order: [...order, ...absent], quadrants: changes }, scope);
}
export function rebindBoardGroup(layout: BoardLayout | null, before: string, after: string): BoardLayout | null {
  if (!layout || before === after || (!layout.order.includes(before) && !layout.quadrants.some(q => q.key === before))) return null;
  const moved = layout.quadrants.find(q => q.key === before);
  return validate({ ...layout, order: Array.from(new Set(layout.order.map(k => k === before ? after : k))),
    quadrants: [...layout.quadrants.filter(q => q.key !== before && (!moved || q.key !== after)),
      ...(moved ? [{ ...moved, key: after }] : [])] }, layout.scope);
}
