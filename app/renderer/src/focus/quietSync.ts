// Scheduling metadata only. Existing queues remain the owners of every write.
export const QUIET_SYNC_KEY = "pomatez-quiet-sync-v1";
export const QUIET_SYNC_MS = 5 * 60 * 1000;
export type LocalMutation = { key: string; source: string; value: string };
type Stamp = { source: string; changedAt: number; generation: number };
type Store = Pick<Storage, "getItem" | "setItem">;
export class QuietSync {
  private stamps: Stamp[] = [];
  private seen: Map<string, string> | null = null;
  private forced = new Map<string, number>();
  private listeners = new Set<() => void>();
  private store: Store;
  error = "";
  constructor(store: Store) {
    this.store=store;
    try {
      const raw = store.getItem(QUIET_SYNC_KEY);
      if (raw === null) return;
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 16 ||
        data.entries.some((s: Stamp) => !s || typeof s.source !== "string" || !s.source || s.source.length > 1000 ||
          !Number.isSafeInteger(s.changedAt) || s.changedAt < 0 || !Number.isSafeInteger(s.generation) || s.generation < 1) ||
        new Set(data.entries.map((s: Stamp) => s.source)).size !== data.entries.length) throw Error();
      this.stamps = data.entries;
    } catch { this.error = "自动同步计时无法读取；改动保留本机，请手动同步"; }
  }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(fn => fn()); }
  observe(changes: LocalMutation[], now = Date.now()) {
    const first = this.seen === null, previous = this.seen || new Map<string, string>();
    const changed = new Set(changes.filter(c => previous.get(c.key) !== c.value &&
      (!first || !this.stamps.some(s => s.source === c.source))).map(c => c.source));
    this.seen = new Map(changes.map(c => [c.key, c.value]));
    if (!changed.size) return;
    this.postpone(changed,now);
  }
  touch(source:string, now=Date.now()) { this.postpone(new Set([source]),now); }
  private postpone(changed:Set<string>,now:number) {
    for (const source of Array.from(changed)) this.forced.delete(source);
    if (this.error) { this.emit(); return; }
    const stamps = this.stamps.filter(s => !changed.has(s.source));
    for (const source of Array.from(changed)) {
      const old = this.stamps.find(s => s.source === source);
      stamps.push({ source, changedAt: now, generation: (old?.generation || 0) + 1 });
    }
    const entries = stamps.sort((a,b) => b.changedAt-a.changedAt).slice(0,16);
    try {
      const raw = JSON.stringify({ version: 1, entries });
      this.store.setItem(QUIET_SYNC_KEY, raw);
      if (this.store.getItem(QUIET_SYNC_KEY) !== raw) throw Error();
      this.stamps = entries;
    } catch { this.error = "自动同步计时未保存；改动保留本机，请手动同步"; }
    this.emit();
  }
  flush(source: string) {
    this.forced.set(source, this.stamps.find(s => s.source === source)?.generation || 0);
    this.emit();
  }
  allowed(source: string, now = Date.now()) {
    const stamp = this.stamps.find(s => s.source === source);
    return this.forced.get(source) === (stamp?.generation || 0) ||
      (!this.error && !!stamp && now >= stamp.changedAt + QUIET_SYNC_MS);
  }
  remaining(source: string, now = Date.now()) {
    if (this.allowed(source, now)) return 0;
    const stamp = this.stamps.find(s => s.source === source);
    return this.error || !stamp ? null : Math.max(0, stamp.changedAt + QUIET_SYNC_MS - now);
  }
}
