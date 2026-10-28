import type {
  FocusSession,
  FocusQuadrant,
  FocusTask,
  ProjectType,
} from "./session";

export type QuickTask = {
  id: string;
  sourceKey: string;
  title: string;
  quadrant?: FocusQuadrant;
  count: number;
  day: number;
  projectId?: string;
  projectType?: ProjectType;
  // Captured during focus; explicit classification releases this original intent.
  capture?: true;
  // Additional slot for an existing task; stable across retries/restarts.
  append?: {
    taskId: string;
    sequence: number;
    doneToday: number;
    plannedToday: number;
    description?: string;
  };
};
export type PendingEdit = {
  id: string;
  sourceKey: string;
  before: FocusSession;
  after: FocusSession;
};
export type RemovePlan = {
  id: string;
  sourceKey: string;
  task: FocusTask;
  day: number;
};
export type OutboxItem = {
  id: string;
  sourceKey: string;
  kind: "task" | "edit" | "color" | "remove";
  payload: QuickTask | PendingEdit | RemovePlan;
  state: "pending" | "failed";
  error?: string;
  taskRows?: FocusTask[];
};
const KEY = "pomatez-quick-edit-outbox-v1";
export const isCapturedTask = (e: OutboxItem) => e.kind === "task" && (e.payload as QuickTask).capture === true;
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
            (r.kind === "remove" &&
              (!r.payload.task?.id ||
                !Number.isFinite(r.payload.day))) ||
            ((r.kind === "edit" || r.kind === "color") &&
              (!r.payload.before?.id ||
                r.payload.before.id !== r.payload.after?.id)) ||
            !["task", "edit", "color", "remove"].includes(r.kind) ||
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
          ((e.kind === "edit" || e.kind === "color") &&
            (item.kind === "edit" || item.kind === "color") &&
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
  discardFailedEdit(sourceKey: string, id: string) {
    if (this.running || this.storageError) throw Error("正在同步或存储未就绪，请稍后再放弃修改");
    const item = this.entries.find(e => e.id === id && e.sourceKey === sourceKey);
    if (!item || item.kind !== "edit" || item.state !== "failed")
      throw Error("只能放弃当前来源中已失败的记录修改");
    const key = `pomatez-discarded-edit-v1:${item.id}`;
    const existing = this.store.getItem(key);
    if (existing !== null) {
      if (JSON.stringify(JSON.parse(existing).entry) !== JSON.stringify(item))
        throw Error("已有不同恢复副本，保留待同步修改");
    } else {
      const backup = JSON.stringify({version:1,discardedAt:Date.now(),entry:item});
      this.store.setItem(key,backup);
      if (this.store.getItem(key) !== backup) throw Error("恢复副本未保存，保留待同步修改");
    }
    const next = this.entries.filter(e => e.id !== item.id), raw = JSON.stringify(next);
    this.store.setItem(KEY,raw);
    if (this.store.getItem(KEY) !== raw) throw Error("放弃修改尚未确认，请保留本机数据后重试");
    this.entries = next;
    this.listeners.forEach(fn => fn());
  }
  releaseCapture(before: QuickTask, title: string, quadrant: FocusQuadrant, count: number, project?: {id:string;projectType?:ProjectType}, sessions: FocusSession[] = [], today = new Date().setHours(0,0,0,0)) {
    const item=this.entries.find(e=>e.id===before.id&&e.sourceKey===before.sourceKey&&isCapturedTask(e));
    if(!item||item.taskRows||JSON.stringify(item.payload)!==JSON.stringify(before))throw Error("这条事项已改变，请重新打开整理");
    if(!title.trim()||title.trim().length>200||!Number.isInteger(count)||count<1||count>50||!["iu","inu","uni","unu"].includes(quadrant))throw Error("请检查事项名称、象限和番茄数");
    const used=sessions.filter(r=>r.task.quickTask?.id===before.id&&r.task.sourceKey===before.sourceKey);
    if(count<Math.max(0,...used.map(r=>r.task.quickTask!.sequence)))throw Error("番茄数不能少于已经开始的番茄序号");
    // Untouched captures become actionable today; previously used slots retain their accounting day.
    const payload:QuickTask={...before,day:used.length?before.day:today,title:title.trim(),quadrant,count,projectId:project?.id,projectType:project?.projectType};
    delete payload.capture;
    this.save(this.entries.map(e=>e.id===item.id?{...e,payload,state:"pending",error:undefined}:e));
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
        if (e.kind === "task" || e.sourceKey !== q.sourceKey) return e;
        if (e.kind === "remove") {
          const p = e.payload as RemovePlan;
          return { ...e, payload: { ...p, task: bind(p.task) } };
        }
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
    send: (e: OutboxItem) => Promise<void | false>,
    ready = () => true
  ) {
    if (this.running || this.storageError) return;
    this.running = true;
    try {
      while (ready()) {
        const e = this.entries.find(
          (e) => e.sourceKey === sourceKey && e.state === "pending" && !isCapturedTask(e)
        );
        if (!e) break;
        try {
          if (await send(e) === false) break; // postponed, still pending with the same identity
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
