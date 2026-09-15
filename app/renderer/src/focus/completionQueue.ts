import type { FocusTask } from "./session";

type Entry = {
  sourceKey: string;
  planId: string;
  task: FocusTask;
  state: "pending" | "failed" | "done";
  error?: string;
};
type Store = Pick<Storage, "getItem" | "setItem">;
const KEY = "pomatez-completion-queue-v1";

// Persist intent before projecting completion. Only the existing idempotent
// completeToday API writes Feishu; this queue never creates focus records.
export class CompletionQueue {
  entries: Entry[] = [];
  running = false;
  storageError = "";
  private listeners = new Set<() => void>();
  constructor(private storage: Store) {
    try {
      const raw = storage.getItem(KEY);
      if (raw) {
        const entries = JSON.parse(raw);
        if (
          !Array.isArray(entries) ||
          entries.some(
            (e) =>
              !e ||
              typeof e.sourceKey !== "string" ||
              typeof e.planId !== "string" ||
              !e.task ||
              typeof e.task.id !== "string" ||
              !["pending", "failed", "done"].includes(e.state)
          )
        )
          throw Error();
        this.entries = entries;
      }
    } catch {
      this.storageError =
        "无法读取待同步标记，已停止处理，请保留本机数据。";
    }
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }
  private save(next: Entry[]) {
    try {
      this.storage.setItem(KEY, JSON.stringify(next));
    } catch {
      this.storageError =
        "无法保存待同步标记，请检查本机存储；本次操作未接受。";
      this.emit();
      throw Error(this.storageError);
    }
    this.entries = next;
    this.emit();
  }
  enqueue(task: FocusTask, sourceKey: string) {
    if (this.storageError) throw Error(this.storageError);
    if (!sourceKey || (task.sourceKey && task.sourceKey !== sourceKey))
      throw Error("任务来源已改变，请刷新后重试。");
    const planId = task.planId || task.id;
    if (
      this.entries.some(
        (e) => e.sourceKey === sourceKey && e.planId === planId
      )
    )
      return;
    this.save([
      ...this.entries,
      { sourceKey, planId, task, state: "pending" },
    ]);
  }
  retry(sourceKey: string) {
    if (this.storageError) throw Error(this.storageError);
    this.save(
      this.entries.map((e) =>
        e.sourceKey === sourceKey && e.state === "failed"
          ? { ...e, state: "pending", error: undefined }
          : e
      )
    );
  }
  // Only retire acknowledged entries when a fresh authoritative read no longer
  // contains their pending rows. Pending/failed intent survives every refresh.
  reconcile(sourceKey: string, rows: FocusTask[]) {
    if (this.storageError) return;
    const ids = new Set(
      rows.filter((t) => t.kind !== "done").map((t) => t.planId || t.id)
    );
    const next = this.entries.filter(
      (e) =>
        e.sourceKey !== sourceKey ||
        e.state !== "done" ||
        ids.has(e.planId)
    );
    if (next.length !== this.entries.length) this.save(next);
  }
  project(rows: FocusTask[], sourceKey: string | null) {
    const entries = this.entries.filter(
      (e) => e.sourceKey === sourceKey
    );
    const hidden = new Set(entries.map((e) => e.planId));
    const counts = new Map<string, number>();
    rows.forEach((t) => {
      if (t.kind !== "done" && hidden.has(t.planId || t.id))
        counts.set(
          t.taskId || t.id,
          (counts.get(t.taskId || t.id) || 0) + 1
        );
    });
    return rows.map((t) => ({
      ...t,
      doneToday:
        (t.doneToday || 0) + (counts.get(t.taskId || t.id) || 0),
      ...(hidden.has(t.planId || t.id)
        ? { kind: "done" as const }
        : {}),
    }));
  }
  async drain(
    sourceKey: string,
    send: (planId: string) => Promise<unknown>,
    ready = () => true
  ) {
    if (this.running || this.storageError) return;
    this.running = true;
    this.emit();
    try {
      while (ready()) {
        const entry = this.entries.find(
          (e) => e.sourceKey === sourceKey && e.state === "pending"
        );
        if (!entry) break;
        let error: string | undefined;
        try {
          await send(entry.planId);
        } catch (e: any) {
          error = e.message || "同步失败，请重试";
        }
        this.save(
          this.entries.map((e) =>
            e === entry
              ? {
                  ...e,
                  state: error ? "failed" : "done",
                  error,
                }
              : e
          )
        );
      }
    } finally {
      this.running = false;
      this.emit();
    }
  }
}
