import { historyRecord } from "./history";
import { PLAN_FIELDS, textValue } from "./plan";
export const MOVE_FIELD = "专注任务迁移";
export type MoveStep = {
  rowId: string;
  identity: string;
  before: any;
  after: any;
};
export type RecordMove = {
  version: 1;
  before: any;
  after: any;
  steps: MoveStep[];
  warning: string;
};
export function readMove(
  raw: any,
  key: string,
  completedField: string
): RecordMove | null {
  const text = textValue(raw);
  if (!text) return null;
  let m: RecordMove;
  try {
    m = JSON.parse(text);
  } catch {
    throw Error("任务迁移明细无法读取，未覆盖");
  }
  const allowed = new Set([
    ...PLAN_FIELDS.map((f) => f.field_name),
    "跨端专注记录",
    completedField,
  ]);
  if (
    text.length > 70000 ||
    m.version !== 1 ||
    !Array.isArray(m.steps) ||
    !m.steps.length ||
    m.steps.length > 201 ||
    m.steps.some(
      (s) =>
        !/^[A-Za-z0-9_-]{1,160}$/.test(s.rowId) ||
        typeof s.identity !== "string" ||
        !s.before ||
        !s.after ||
        Object.keys(s.before).some((k) => !allowed.has(k)) ||
        Object.keys(s.after).some((k) => !allowed.has(k))
    ) ||
    new Set(m.steps.map((s) => s.rowId)).size !== m.steps.length
  )
    throw Error("任务迁移明细格式不符");
  m.before = historyRecord(m.before, key);
  m.after = historyRecord(m.after, key);
  if (
    m.before.id !== m.after.id ||
    m.after.revision !== (m.before.revision || 0) + 1
  )
    throw Error("任务迁移版本不符");
  return m;
}
// Ownership and lineage are computed on the server, not supplied by the form.
export function sameEdit(a: any, b: any) {
  const clean = (r: any) => {
    const { completionOwnedPlanIds, previousTasks, ...rest } = r;
    return rest;
  };
  return JSON.stringify(clean(a)) === JSON.stringify(clean(b));
}
