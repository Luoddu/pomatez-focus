// Same-row accounting. The ledger makes a retried session an identity check,
// not another increment. No task titles or credentials belong in this ledger.
export const PLAN_FIELDS = [
  { field_name: "实际分钟", type: 2 },
  { field_name: "专注日期", type: 5 },
  { field_name: "专注时间段", type: 1 },
  { field_name: "专注同步明细", type: 1 },
];
export const FREE_TITLE = "自由番茄";
export const ledgerField = "专注同步明细";
export const textValue = (v: any): string =>
  typeof v === "string"
    ? v
    : Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x : x?.text || "")).join("")
    : v?.text || "";
type Span = { start: number; end: number };
type Entry = {
  id: string;
  start: number;
  end: number;
  seconds: number;
  elapsed: number;
  spans: Span[];
  count: number;
};
type Ledger = { version: 1; target: number; entries: Entry[] };
const uuid = (s: any) =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
export function readLedger(fields: any): Ledger | null {
  const raw = textValue(fields?.[ledgerField]);
  if (!raw) return null;
  let v: any;
  try {
    v = JSON.parse(raw);
  } catch {
    throw Error("原行专注同步明细无法解析，未覆盖");
  }
  if (
    v?.version !== 1 ||
    !Number.isFinite(v.target) ||
    v.target < 60 ||
    v.target > 10800 ||
    !Array.isArray(v.entries) ||
    v.entries.length > 100 ||
    v.entries.some(
      (e: any) =>
        !uuid(e.id) ||
        !Number.isFinite(e.seconds) ||
        e.seconds < 0 ||
        !Number.isFinite(e.start) ||
        !Number.isFinite(e.end) ||
        e.end < e.start ||
        !Number.isFinite(e.elapsed) ||
        e.elapsed < e.seconds - 1 ||
        !Array.isArray(e.spans) ||
        ![0, 1].includes(e.count)
    ) ||
    new Set(v.entries.map((e: any) => e.id)).size !== v.entries.length
  )
    throw Error("原行专注同步明细格式不符，未覆盖");
  return v;
}
const stamp = (t: number) => {
  const d = new Date(t),
    p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(
    d.getDate()
  )} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
export const ledgerSeconds = (l: Ledger | null) =>
  l ? l.entries.reduce((n, e) => n + e.seconds, 0) : 0;
function derived(l: Ledger) {
  return {
    实际分钟: ledgerSeconds(l) / 60,
    专注日期: l.entries.length
      ? Math.max(...l.entries.map((e) => e.start))
      : null,
    专注时间段: l.entries
      .map(
        (e) =>
          `${e.spans
            .map((s) => `${stamp(s.start)} — ${stamp(s.end)}`)
            .join("；")}｜计时 ${(e.elapsed / 60).toFixed(
            2
          )} 分钟，确认 ${(e.seconds / 60).toFixed(2)} 分钟`
      )
      .join("\n"),
    [ledgerField]: JSON.stringify(l),
  };
}
// Explicit correction only: ordinary sync remains immutable and rejects conflicts.
export function correctPlan(
  fields: any,
  before: any,
  after: any,
  completedField: string
) {
  const ledger = readLedger(fields);
  if (!ledger || !fieldsAgree(fields, derived(ledger)))
    throw Error("原表分钟或时间段已被修改，请先核对");
  const entry = ledger.entries.find((e) => e.id === before.id);
  if (!entry) throw Error("原表缺少本条专注明细");
  const matches = (r: any) =>
    entry.start === r.startedAt &&
    entry.end === r.endedAt &&
    entry.seconds === r.acceptedSeconds &&
    entry.elapsed === r.elapsedSeconds;
  if (!matches(before) && !matches(after))
    throw Error("原专注已在其他位置修改，未覆盖");
  entry.start = after.startedAt;
  entry.end = after.endedAt;
  entry.seconds = after.acceptedSeconds;
  entry.elapsed = after.elapsedSeconds;
  entry.spans = after.segments || [
    { start: after.startedAt, end: after.endedAt },
  ];
  const patch: any = derived(ledger);
  if (
    ledgerSeconds(ledger) >= ledger.target ||
    after.completedCount > 0
  )
    patch[completedField] = true;
  else if (
    entry.count === 1 &&
    !ledger.entries.some((e) => e.id !== entry.id && e.count > 0)
  )
    patch[completedField] = false;
  return patch;
}
export function fieldsAgree(actual: any, expected: any) {
  return Object.entries(expected).every(([k, v]) =>
    v == null
      ? actual[k] == null
      : typeof v === "number"
      ? Number.isFinite(Number(actual[k])) &&
        Math.abs(Number(actual[k]) - v) < 0.00001
      : typeof v === "boolean"
      ? (actual[k] === true) === v
      : textValue(actual[k]) === v
  );
}
export function removePlanRecord(fields: any, record: any) {
  // Reuse correction validation, including manual edits to derived columns.
  correctPlan(fields, record, record, "__unused_completion");
  const ledger = readLedger(fields)!;
  ledger.entries = ledger.entries.filter((e) => e.id !== record.id);
  return derived(ledger);
}
export function mergePlan(
  fields: any,
  record: any,
  completedField: string
) {
  if (!uuid(record.id)) throw Error("专注记录标识无效");
  let spans: Span[] = record.segments;
  if (spans == null)
    spans = [{ start: record.startedAt, end: record.endedAt }]; // Old in-flight recovery compatibility.
  if (
    !Array.isArray(spans) ||
    spans.length > 2000 ||
    spans.some(
      (s, i) =>
        !Number.isFinite(s.start) ||
        !Number.isFinite(s.end) ||
        s.start < record.startedAt - 5 ||
        s.end < s.start ||
        s.end > record.endedAt + 5 ||
        (i > 0 && s.start < spans[i - 1].end)
    )
  )
    throw Error("专注时间段无效");
  const existing = readLedger(fields);
  if (existing && !fieldsAgree(fields, derived(existing)))
    throw Error(
      "原行实际分钟或时间段已被修改，请先核对；未覆盖人工修改"
    );
  if (
    !existing &&
    (Number(fields["实际分钟"] || 0) !== 0 ||
      textValue(fields["专注时间段"]) ||
      fields["专注日期"])
  )
    throw Error("原行已有未识别的专注数据，未覆盖");
  const l: Ledger = existing || {
    version: 1,
    target: record.task.goalSeconds || record.plannedSeconds,
    entries: [],
  };
  const old = l.entries.find((e) => e.id === record.id);
  const next: Entry = {
    id: record.id,
    start: record.startedAt,
    end: record.endedAt,
    seconds: record.acceptedSeconds,
    elapsed: record.elapsedSeconds,
    spans,
    count:
      old?.count ??
      (fields[completedField] !== true &&
      ledgerSeconds(l) < l.target &&
      ledgerSeconds(l) + record.acceptedSeconds >= l.target
        ? 1
        : 0),
  };
  if (old && JSON.stringify(old) !== JSON.stringify(next))
    throw Error("同一专注记录的内容不同，未覆盖");
  if (!old) l.entries.push(next);
  if (l.entries.length > 100 || JSON.stringify(l).length > 70000)
    throw Error("此番茄的专注明细已达本版上限，记录仍保留本地");
  const patch: any = derived(l);
  if (fields[completedField] === true || ledgerSeconds(l) >= l.target)
    patch[completedField] = true;
  return { patch, duplicate: !!old, count: next.count };
}
