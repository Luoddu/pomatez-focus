// P0-POMO-060: transport-injected, append-only preference versions.
// No Electron, credentials, profile access, clocks, background work or network.
export const PREFERENCES_TABLE = "农场偏好";
export const PREFERENCE_FIELDS = ["偏好ID", "设置项", "版本内容"].map(
  (field_name) => ({ field_name, type: 1 })
);
export const PREFERENCE_KEYS = [
  "weights", "weekGoals", "researchGoals", "timer", "rest", "browser",
] as const;
export type PreferenceKey = typeof PREFERENCE_KEYS[number];
export const WEIGHT_KEYS = [
  "research", "delivery", "longterm", "software", "personal", "misc", "unclassified",
] as const;
export type PreferenceValues = {
  weights: Record<typeof WEIGHT_KEYS[number], number>;
  weekGoals: Record<string, number>;
  researchGoals: Record<string, number>;
  timer: { focusMinutes: number; restMinutes: number };
  rest: { quotaMinutes: number; supervise: boolean; pomodoroGoal: number; reminderMinutes: number };
  browser: { mode: "mirror" | "pause" | "cooldown" | "quota"; cooldownMinutes: number; autoRaise: boolean };
};
export type PreferenceEntry<K extends PreferenceKey = PreferenceKey> = {
  version: 1; id: string; key: K; parents: string[];
  value: PreferenceValues[K]; at: number;
};
export type PreferencesResult = { entries: PreferenceEntry[] };
export interface PreferencesSource {
  root(): string;
  findTable(name: string, required?: boolean): Promise<{ table_id: string; name?: string } | null | undefined>;
  list(path: string): Promise<unknown[]>;
  call(method: "POST", path: string, body: unknown): Promise<unknown>;
}
export const PREFERENCE_LIMITS = Object.freeze({
  rows: 10000, bytes: 4 * 1024 * 1024, entryBytes: 64 * 1024,
  parents: 64, goalWeeks: 512, fields: 256,
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message: string): never { throw Error(message); }
const bytes = (text: string) => Buffer.byteLength(text, "utf8");
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    return fail("偏好必须是普通对象");
  const obj = value as Record<string, unknown>;
  for (const key of Reflect.ownKeys(obj)) {
    if (typeof key !== "string" || ["__proto__", "constructor", "prototype"].includes(key) ||
        !Object.getOwnPropertyDescriptor(obj, key)?.enumerable ||
        !Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(obj, key), "value"))
      fail("偏好包含非法字段");
  }
  return obj;
}
function fields(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  const obj = object(value), keys = Object.keys(obj);
  if (keys.length !== allowed.length || keys.some(key => !allowed.includes(key)))
    fail("偏好字段不匹配或含未知字段");
  return obj;
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    return fail("偏好数值超出允许范围");
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") return fail("偏好开关必须为布尔值");
  return value;
}
function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) return fail("偏好ID必须为UUIDv4");
  return value.toLowerCase();
}
function keyOf(value: unknown): PreferenceKey {
  if (typeof value !== "string" || !(PREFERENCE_KEYS as readonly string[]).includes(value))
    return fail("未知偏好设置项");
  return value as PreferenceKey;
}
/** Strict complete snapshots, not patches. Unknown fields are rejected, never stripped. */
export function validatePreferenceValue<K extends PreferenceKey>(key: K, value: unknown): PreferenceValues[K] {
  keyOf(key);
  let result: PreferenceValues[PreferenceKey];
  if (key === "weights") {
    const obj = fields(value, WEIGHT_KEYS), out = {} as PreferenceValues["weights"];
    for (const category of WEIGHT_KEYS) {
      const rate = obj[category];
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 1 ||
          Math.abs(rate * 100 - Math.round(rate * 100)) > 1e-7)
        fail("番茄比例须为0–1，最多两位小数");
      out[category] = Math.round((rate as number) * 100) / 100;
    }
    result = out;
  } else if (key === "weekGoals" || key === "researchGoals") {
    const obj = object(value), keys = Object.keys(obj).sort();
    if (keys.length > PREFERENCE_LIMITS.goalWeeks) fail("周目标数量超过上限");
    const out: Record<string, number> = {};
    for (const week of keys) {
      // Match weekgoal.ts's accepted yyyy-mm-dd keys and 1–350 integer bounds.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) fail("周目标键无效");
      out[week] = integer(obj[week], 1, 350);
    }
    result = out;
  } else if (key === "timer") {
    const obj = fields(value, ["focusMinutes", "restMinutes"]);
    result = { focusMinutes: integer(obj.focusMinutes, 1, 180), restMinutes: integer(obj.restMinutes, 1, 60) };
  } else if (key === "rest") {
    const obj = fields(value, ["quotaMinutes", "supervise", "pomodoroGoal", "reminderMinutes"]);
    // Exact activitywatch.ts validSettings bounds, with all fields explicit.
    const quotaMinutes = integer(obj.quotaMinutes, 5, 480);
    if (quotaMinutes % 5) fail("科学休息额度须按5分钟调整");
    result = { quotaMinutes, supervise: boolean(obj.supervise),
      pomodoroGoal: integer(obj.pomodoroGoal, 0, 60), reminderMinutes: (()=>{const m=obj.reminderMinutes as number,s=Math.round(m*60);if(typeof m!=="number"||!Number.isFinite(m)||s<5||s>3600||Math.abs(m*60-s)>1e-7)fail("提醒间隔须为5–3600整秒");return s/60;})() };
  } else {
    const obj = fields(value, ["mode", "cooldownMinutes", "autoRaise"]);
    // Exact browserControl.ts validBrowserPolicy bounds.
    if (!["mirror", "pause", "cooldown", "quota"].includes(obj.mode as string)) fail("浏览器策略无效");
    result = { mode: obj.mode as PreferenceValues["browser"]["mode"],
      cooldownMinutes: integer(obj.cooldownMinutes, 1, 30), autoRaise: boolean(obj.autoRaise) };
  }
  return result as PreferenceValues[K];
}
export function validatePreferenceEntry(value: unknown): PreferenceEntry {
  const obj = fields(value, ["version", "id", "key", "parents", "value", "at"]);
  if (obj.version !== 1) fail("不支持此偏好版本");
  const id = uuid(obj.id), key = keyOf(obj.key);
  if (!Array.isArray(obj.parents) || obj.parents.length > PREFERENCE_LIMITS.parents)
    fail("偏好父版本列表无效或超过上限");
  const parents = Array.from(obj.parents as unknown[], uuid).sort();
  if (new Set(parents).size !== parents.length || parents.includes(id)) fail("偏好父版本重复或引用自身");
  if (typeof obj.at !== "number" || !Number.isFinite(obj.at) || Math.abs(obj.at) > 8640000000000000)
    fail("偏好时间戳无效");
  const entry: PreferenceEntry = { version: 1, id, key, parents,
    value: validatePreferenceValue(key, obj.value), at: obj.at as number };
  if (bytes(JSON.stringify(entry)) > PREFERENCE_LIMITS.entryBytes) fail("偏好版本内容超过上限");
  return entry;
}
function validateEntries(values: readonly unknown[]): PreferenceEntry[] {
  if (values.length > PREFERENCE_LIMITS.rows) fail("偏好记录数量超过上限");
  const entries = values.map(validatePreferenceEntry);
  if (entries.reduce((n, entry) => n + bytes(JSON.stringify(entry)), 0) > PREFERENCE_LIMITS.bytes)
    fail("偏好记录内容超过总上限");
  const ids = new Map<string, PreferenceEntry>();
  for (const entry of entries) {
    if (ids.has(entry.id)) fail("偏好存在重复ID，未自动合并");
    ids.set(entry.id, entry);
  }
  const children = new Map<string, string[]>(), indegree = new Map<string, number>();
  for (const entry of entries) {
    indegree.set(entry.id, entry.parents.length);
    for (const parent of entry.parents) {
      if (!ids.has(parent) || ids.get(parent)!.key !== entry.key) fail("偏好父版本缺失或设置项不匹配");
      const list = children.get(parent) || [];
      list.push(entry.id); children.set(parent, list);
    }
  }
  // Iterative topological check: no recursion/stack growth on a long version chain.
  const queue = entries.filter(entry => !entry.parents.length).map(entry => entry.id);
  for (let index = 0; index < queue.length; index++) {
    for (const child of children.get(queue[index]) || []) {
      const remaining = indegree.get(child)! - 1;
      indegree.set(child, remaining); if (!remaining) queue.push(child);
    }
  }
  if (queue.length !== entries.length) fail("偏好版本存在环");
  return entries;
}
function heads(entries: PreferenceEntry[], key: PreferenceKey): PreferenceEntry[] {
  const consumed = new Set(entries.filter(entry => entry.key === key).flatMap(entry => entry.parents));
  return entries.filter(entry => entry.key === key && !consumed.has(entry.id))
    .sort((left, right) => left.id.localeCompare(right.id));
}
/** Returns every head entry, sorted by ID; never picks a timestamp-based winner. */
export function preferenceHeads(entries: readonly PreferenceEntry[], key: PreferenceKey): PreferenceEntry[] {
  keyOf(key);
  return heads(validateEntries(entries), key);
}
function text(value: unknown): string {
  if (typeof value === "string") {
    if (bytes(value) > PREFERENCE_LIMITS.entryBytes) fail("偏好文本字段超过上限");
    return value;
  }
  if (Array.isArray(value) && value.length <= PREFERENCE_LIMITS.entryBytes) {
    let total = 0;
    return value.map(part => {
      const obj = object(part);
      if (typeof obj.text !== "string" || Object.keys(obj).some(key => !["text", "type"].includes(key)) ||
          (obj.type !== undefined && obj.type !== "text")) fail("偏好文本字段格式无效");
      total += bytes(obj.text);
      if (total > PREFERENCE_LIMITS.entryBytes) fail("偏好文本字段超过上限");
      return obj.text;
    }).join("");
  }
  return fail("偏好文本字段格式无效");
}
function same(left: PreferenceEntry, right: PreferenceEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
export class PrefsRepository {
  private readonly creationAttempts = new Set<string>();
  constructor(private readonly source: PreferencesSource,
    private readonly options: { allowCreate?: boolean; beforeCreate?: (root: string) => void } = {}) {}
  private origin(): string {
    const root = this.source.root();
    if (!/^bitable\/v1\/apps\/[A-Za-z0-9_-]{1,128}$/.test(root)) fail("偏好来源路径无效");
    return root;
  }
  private bound(root: string): void {
    if (this.source.root() !== root) fail("偏好来源已切换，操作已停止");
  }
  private async schema(root: string, create: boolean): Promise<string | null> {
    let table = await this.source.findTable(PREFERENCES_TABLE, false);
    this.bound(root);
    if (!table && create) {
      if (this.options.allowCreate !== true) fail("偏好同步未获准创建专用表");
      if (this.creationAttempts.has(root)) fail("偏好表创建结果待确认，请先只读核对");
      this.options.beforeCreate?.(root);
      this.creationAttempts.add(root);
      try {
        await this.source.call("POST", `${root}/tables`, {
          table: { name: PREFERENCES_TABLE, default_view_name: "偏好版本", fields: PREFERENCE_FIELDS.map(field => ({ ...field })) },
        });
      } catch (error) {
        this.bound(root);
        table = await this.source.findTable(PREFERENCES_TABLE, false);
        this.bound(root);
        if (!table) throw error; // Never replay table POST after a lost response.
      }
      if (!table) table = await this.source.findTable(PREFERENCES_TABLE, false);
      this.bound(root);
      if (!table) fail("偏好表创建尚未回读确认");
    }
    if (!table) return null;
    if (typeof table.table_id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(table.table_id) ||
        (table.name !== undefined && table.name !== PREFERENCES_TABLE)) fail("偏好表标识无效");
    const path = `${root}/tables/${table.table_id}`;
    const actual = await this.source.list(`${path}/fields`);
    this.bound(root);
    if (!Array.isArray(actual) || actual.length > PREFERENCE_LIMITS.fields) fail("偏好表字段响应无效或过大");
    const names = new Set<string>();
    for (const raw of actual) {
      const field = object(raw);
      if (typeof field.field_name !== "string" || names.has(field.field_name)) fail("偏好表字段重复或格式无效");
      names.add(field.field_name);
    }
    for (const expected of PREFERENCE_FIELDS) {
      const matches = actual.filter(raw => (raw as any).field_name === expected.field_name);
      if (matches.length !== 1 || (matches[0] as any).type !== expected.type)
        fail("农场偏好字段不匹配，未修改现有字段");
    }
    return path;
  }
  private async snapshot(root: string, create = false): Promise<PreferencesResult & { path: string | null }> {
    const path = await this.schema(root, create);
    if (!path) return { entries: [], path: null };
    const rows = await this.source.list(`${path}/records`);
    this.bound(root);
    if (!Array.isArray(rows) || rows.length > PREFERENCE_LIMITS.rows) fail("偏好记录数量超过上限或响应无效");
    let totalBytes = 0;
    const recordIds = new Set<string>();
    const entries = rows.map(row => {
      const record = object(row);
      if (typeof record.record_id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(record.record_id) || recordIds.has(record.record_id))
        fail("偏好行标识缺失、重复或无效");
      recordIds.add(record.record_id);
      const f = object(record.fields);
      const raw = text(f["版本内容"]);
      totalBytes += bytes(raw);
      if (bytes(raw) > PREFERENCE_LIMITS.entryBytes || totalBytes > PREFERENCE_LIMITS.bytes)
        fail("偏好记录内容超过上限");
      let decoded: unknown;
      try { decoded = JSON.parse(raw); } catch (_) { return fail("偏好版本JSON损坏"); }
      const entry = validatePreferenceEntry(decoded);
      if (uuid(text(f["偏好ID"])) !== entry.id || text(f["设置项"]) !== entry.key)
        fail("偏好行标识与版本内容不一致");
      return entry;
    });
    return { path, entries: validateEntries(entries) };
  }
  async read(): Promise<PreferencesResult> {
    const { entries } = await this.snapshot(this.origin());
    return { entries };
  }
  private existing(entries: PreferenceEntry[], input: PreferenceEntry): boolean {
    const found = entries.find(entry => entry.id === input.id);
    if (found && !same(found, input)) fail("同一偏好ID存在不同内容，未覆盖");
    return !!found;
  }
  private current(entries: PreferenceEntry[], input: PreferenceEntry): void {
    validateEntries([...entries, input]);
    const ids = heads(entries, input.key).map(entry => entry.id).sort();
    if (JSON.stringify(ids) !== JSON.stringify(input.parents)) fail("偏好父版本已过期或未包含全部分支，请先同步");
  }
  async save(value: unknown): Promise<PreferencesResult> {
    const input = validatePreferenceEntry(value); // Before even reading transport.
    const root = this.origin();
    let snapshot = await this.snapshot(root);
    if (this.existing(snapshot.entries, input)) return { entries: snapshot.entries };
    this.current(snapshot.entries, input);
    if (!snapshot.path) snapshot = await this.snapshot(root, true);
    // Recheck right before the record POST, including a concurrent first save.
    snapshot = await this.snapshot(root);
    if (!snapshot.path) fail("偏好表尚未就绪");
    if (this.existing(snapshot.entries, input)) return { entries: snapshot.entries };
    this.current(snapshot.entries, input);
    if (snapshot.entries.length >= PREFERENCE_LIMITS.rows ||
        snapshot.entries.reduce((n, entry) => n + bytes(JSON.stringify(entry)), bytes(JSON.stringify(input))) > PREFERENCE_LIMITS.bytes)
      fail("偏好追加会超过本版上限");
    this.bound(root);
    let writeError: unknown;
    try {
      await this.source.call("POST", `${snapshot.path}/records?client_token=${input.id}`, {
        fields: { "偏好ID": input.id, "设置项": input.key, "版本内容": JSON.stringify(input) },
      });
    } catch (error) { writeError = error; }
    // Even successful responses require readback. Failed responses are only read,
    // never automatically replayed. A caller retry must reuse the entire entry.
    let actual: PreferencesResult & { path: string | null };
    try { actual = await this.snapshot(root); }
    catch (error) { throw writeError || error; }
    if (!this.existing(actual.entries, input)) {
      if (writeError) throw writeError;
      fail("偏好追加尚未回读确认，本机待提交版本应保留");
    }
    // There is no remote CAS: simultaneous validated saves may create siblings.
    // Return all valid versions so the renderer can explicitly resolve them.
    return { entries: actual.entries };
  }
}
