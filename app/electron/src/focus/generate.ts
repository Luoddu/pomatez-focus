// Today-pomodoro generation, ported from
// integrations/feishu/Invoke-FeishuTodayPomodoroGeneration.ps1 (schema_version 4).
// Pure functions only; the Feishu class wires them to the Bitable API.
import { createHash } from "crypto";
import { textValue } from "./plan";

export const PREFERRED_COUNT_FIELD = "今日计划番茄数";
export const LEGACY_COUNT_FIELD = "今日番茄数";
export const MAX_PER_TASK = 50;
export const DAILY_CAPACITY = 10;
export const BATCH_SIZE = 500;

export type FieldResolution = {
  name: string;
  field: any;
  resolution: "preferred" | "legacy" | "missing";
};
export function resolveTodayCountField(
  fields: any[],
  preferred = PREFERRED_COUNT_FIELD,
  legacy = LEGACY_COUNT_FIELD
): FieldResolution {
  const p = fields.filter((f) => f.field_name === preferred);
  const l = fields.filter((f) => f.field_name === legacy);
  if (p.length > 1)
    throw new Error(`任务表有多个「${preferred}」字段，请到飞书检查后重试`);
  if (l.length > 1)
    throw new Error(`任务表有多个「${legacy}」字段，请到飞书检查后重试`);
  if (p.length === 1 && l.length === 1)
    throw new Error(
      `任务表同时存在「${preferred}」和「${legacy}」，请到飞书只保留一个`
    );
  if (p.length === 1)
    return { name: preferred, field: p[0], resolution: "preferred" };
  if (l.length === 1)
    return { name: legacy, field: l[0], resolution: "legacy" };
  return { name: preferred, field: null, resolution: "missing" };
}

export type IntegerState = { present: boolean; valid: boolean; value: number };
export function integerFieldState(value: any): IntegerState {
  if (value == null || String(value).trim() === "")
    return { present: false, valid: true, value: 0 };
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return { present: true, valid: false, value: 0 };
  const rounded = Math.round(n);
  return { present: true, valid: Math.abs(n - rounded) < 1e-7, value: rounded };
}

// Local midnight (ms) of a timestamp-like value, or null when unparsable.
export function localDayOf(value: any): number | null {
  if (value == null || String(value).trim() === "") return null;
  const ms = Number(value);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
export function dayStart(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}
export function dateKeyOf(dayMs: number): string {
  const d = new Date(dayMs),
    p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function pomodoroSequence(text: string): number {
  const m = /^(?:番茄\s*)?([1-9][0-9]*)$/.exec((text || "").trim());
  return m ? Number(m[1]) : 0;
}

export type TaskPlan = { recordId: string; count: number };
// 计划日=当天且番茄数为 1..max 整数的任务进入计划；非法值计数隔离，交由调用方报错
export function collectTaskPlans(
  records: any[],
  countField: string,
  dayMs: number,
  max = MAX_PER_TASK
): { plans: TaskPlan[]; invalid: number } {
  const plans: TaskPlan[] = [];
  let invalid = 0;
  for (const r of records) {
    if (localDayOf(r.fields?.["计划日"]) !== dayMs) continue;
    const state = integerFieldState(r.fields?.[countField]);
    if (!state.present || state.value === 0) continue;
    if (!state.valid || state.value < 0 || state.value > max) {
      invalid++;
      continue;
    }
    plans.push({ recordId: String(r.record_id), count: state.value });
  }
  return { plans, invalid };
}

export type ExistingScan = {
  keyCounts: Map<string, number>;
  blocked: Set<string>;
  todayCount: number;
  unlinked: number;
  multiLinked: number;
  orphanLinked: number;
  unkeyed: number;
  duplicateGroups: number;
};
// 幂等键 任务recordId|yyyy-MM-dd|序号；多关联/无序号/重复键的任务整块隔离
export function scanExisting(
  records: any[],
  opts: {
    dayMs: number;
    dateKey: string;
    dateField: string;
    taskField: string;
    seqField: string;
    knownTaskIds: Set<string>;
    candidateTaskIds: Set<string>;
    linkIds: (value: any) => string[];
  }
): ExistingScan {
  const keyCounts = new Map<string, number>();
  const blocked = new Set<string>();
  let todayCount = 0,
    unlinked = 0,
    multiLinked = 0,
    orphanLinked = 0,
    unkeyed = 0;
  for (const r of records) {
    if (localDayOf(r.fields?.[opts.dateField]) !== opts.dayMs) continue;
    todayCount++;
    const ids = opts.linkIds(r.fields?.[opts.taskField]);
    if (ids.length === 0) {
      unlinked++;
      continue;
    }
    if (ids.length !== 1) {
      multiLinked++;
      for (const id of ids)
        if (opts.candidateTaskIds.has(id)) blocked.add(id);
      continue;
    }
    const taskId = ids[0];
    if (!opts.knownTaskIds.has(taskId)) {
      orphanLinked++;
      continue;
    }
    const sequence = pomodoroSequence(textValue(r.fields?.[opts.seqField]));
    if (sequence <= 0) {
      unkeyed++;
      if (opts.candidateTaskIds.has(taskId)) blocked.add(taskId);
      continue;
    }
    const key = `${taskId}|${opts.dateKey}|${sequence}`;
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  }
  let duplicateGroups = 0;
  keyCounts.forEach((n, key) => {
    if (n > 1) {
      duplicateGroups++;
      const taskId = key.split("|")[0];
      if (opts.candidateTaskIds.has(taskId)) blocked.add(taskId);
    }
  });
  return {
    keyCounts,
    blocked,
    todayCount,
    unlinked,
    multiLinked,
    orphanLinked,
    unkeyed,
    duplicateGroups,
  };
}

export type PlanSpec = { taskRecordId: string; sequence: number; key: string };
export type PomodoroPlan = {
  specs: PlanSpec[];
  desired: number;
  alreadyPresent: number;
  excess: number;
};
export function pomodoroPlan(
  taskPlans: TaskPlan[],
  existingKeyCounts: Map<string, number>,
  blockedTaskIds: Set<string>,
  dateKey: string
): PomodoroPlan {
  const specs: PlanSpec[] = [];
  let desired = 0,
    alreadyPresent = 0,
    excess = 0;
  for (const task of taskPlans) {
    desired += task.count;
    if (blockedTaskIds.has(task.recordId)) continue;
    for (let sequence = 1; sequence <= task.count; sequence++) {
      const key = `${task.recordId}|${dateKey}|${sequence}`;
      if (existingKeyCounts.has(key)) {
        alreadyPresent++;
        continue;
      }
      specs.push({ taskRecordId: task.recordId, sequence, key });
    }
    const prefix = `${task.recordId}|${dateKey}|`;
    existingKeyCounts.forEach((_n, key) => {
      if (
        key.startsWith(prefix) &&
        Number(key.slice(prefix.length)) > task.count
      )
        excess++;
    });
  }
  return { specs, desired, alreadyPresent, excess };
}

// 与 ps1 New-DeterministicClientToken 同思路：sha256 → UUID 形，重试不产生重复
export function clientToken(identity: string): string {
  const h = createHash("sha256").update(identity, "utf8").digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(
    17,
    20
  )}-${h.slice(20, 32)}`;
}
