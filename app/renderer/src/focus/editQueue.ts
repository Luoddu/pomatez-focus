import type { FocusSession, FocusQuadrant, FocusTask } from "./session";

export type QuickTask = {
  id: string;
  sourceKey: string;
  title: string;
  quadrant: FocusQuadrant;
  count: number;
  day: number;
};
export type PendingEdit = {
  id: string;
  sourceKey: string;
  before: FocusSession;
  after: FocusSession;
};
export type OutboxItem = {
  id: string;
  sourceKey: string;
  kind: "task" | "edit";
  payload: QuickTask | PendingEdit;
  state: "pending" | "failed";
  error?: string;
  taskRows?: FocusTask[];
};
const KEY = "pomatez-quick-edit-outbox-v1";
export class EditQueue {
  entries: OutboxItem[] = [];
  running = false;
  storageError = "";
  private listeners = new Set<() => void>();
  private store: Pick<Storage, "getItem" | "setItem">;
  constructor(store: Pick<Storage, "getItem" | "setItem">) {
    this.store = store;
    try {
      const raw = store.getItem(KEY);
      const rows = raw ? JSON.parse(raw) : [];
      if (
        !Array.isArray(rows) ||
        rows.some(
          (r) =>
            !r.id ||
            !r.sourceKey ||
            !r.payload ||
            (r.kind === "edit" &&
              (!r.payload.before?.id ||
                r.payload.before.id !== r.payload.after?.id)) ||
            !["task", "edit"].includes(r.kind) ||
            !["pending", "failed"].includes(r.state)
        )
      )
        throw Error();
      this.entries = rows;
    } catch {
      this.storageError = "待同步修改无法读取，请先导出本机数据";
    }
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private save(entries: OutboxItem[]) {
    if (this.storageError) throw Error(this.storageError);
    try {
      this.store.setItem(KEY, JSON.stringify(entries));
    } catch {
      throw Error("无法保存待同步修改，请检查本机存储空间");
    }
    this.entries = entries;
    this.listeners.forEach((fn) => fn());
  }
  add(item: OutboxItem) {
    if (
      this.entries.some(
        (e) =>
          e.id === item.id ||
          (e.kind === "edit" &&
            item.kind === "edit" &&
            (e.payload as PendingEdit).before.id ===
              (item.payload as PendingEdit).before.id)
      )
    )
      throw Error("这条记录已有待同步修改，请先同步或重试");
    this.save([...this.entries, item]);
  }
  retry(sourceKey: string) {
    this.save(
      this.entries.map((e) =>
        e.sourceKey === sourceKey
          ? { ...e, state: "pending", error: undefined }
          : e
      )
    );
  }
  resolveTask(
    id: string,
    rows: FocusTask[],
    bind: (task: FocusTask) => FocusTask
  ) {
    const item = this.entries.find(
      (e) => e.id === id && e.kind === "task"
    );
    if (!item) throw Error("新增任务队列不存在");
    const q = item.payload as QuickTask;
    // Persist identity mapping and dependent edits together, before retiring intent.
    this.save(
      this.entries.map((e) => {
        if (e.id === id) return { ...e, taskRows: rows };
        if (e.kind !== "edit" || e.sourceKey !== q.sourceKey) return e;
        const p = e.payload as PendingEdit;
        return {
          ...e,
          payload: {
            ...p,
            before: { ...p.before, task: bind(p.before.task) },
            after: { ...p.after, task: bind(p.after.task) },
          },
        };
      })
    );
  }
  async drain(
    sourceKey: string,
    send: (e: OutboxItem) => Promise<void>,
    ready = () => true
  ) {
    if (this.running || this.storageError) return;
    this.running = true;
    try {
      while (ready()) {
        const e = this.entries.find(
          (e) => e.sourceKey === sourceKey && e.state === "pending"
        );
        if (!e) break;
        try {
          await send(e);
          this.save(this.entries.filter((x) => x.id !== e.id));
        } catch (error: any) {
          this.save(
            this.entries.map((x) =>
              x.id === e.id
                ? {
                    ...x,
                    state: "failed",
                    error: error.message || "同步失败，可重试",
                  }
                : x
            )
          );
        }
      }
    } finally {
      this.running = false;
      this.listeners.forEach((fn) => fn());
    }
  }
}
