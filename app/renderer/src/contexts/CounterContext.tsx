// Adapted from Pomatez's CounterProvider: one elapsed-time loop owns focus and break timing.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { mergeCloudRecords } from "focus/cloud";
import { bindQuickSessions } from "focus/quickTasks";
import type { QuickTask } from "focus/editQueue";
import { playTimeUp, playRestEnd } from "focus/sound";
import {
  FocusSession,
  FocusTask,
  advanceSession,
  confirmSession,
  restoreSession,
  reassignActiveSession,
  returnFromReview,
  timeParts,
  upsertRecord,
} from "focus/session";

const STORAGE_KEY = "pomatez-focus-v1";
type Data = { active: FocusSession | null; records: FocusSession[] };
type CounterProps = {
  count: number;
  duration: number;
  shouldFullscreen: boolean;
  timerType?: any;
  active: FocusSession | null;
  records: FocusSession[];
  mergeCloud: (records: FocusSession[], sourceKey: string) => void;
  getSnapshot: () => Data;
  bindQuick: (q: QuickTask, rows: FocusTask[]) => void;
  notice: string;
  noticeSeq: number;
  error: string;
  blocked: boolean;
  restSeconds: number;
  begin: (task: FocusTask, minutes: number) => void;
  changeTask: (task: FocusTask) => boolean;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  confirm: (seconds: number, completed: number) => void;
  discard: () => void;
  returnToTiming: () => void;
  markSynced: (
    id: string,
    receipt?: {
      completedCount?: number;
      planId?: string;
      completionOwnedPlanIds?: string[];
    }
  ) => void;
  startBreak: () => void;
  addManual: (record: FocusSession) => void;
  resetTimerAction: () => void;
};
const CounterContext = React.createContext<CounterProps>(
  {} as CounterProps
);
const CounterProvider: React.FC = ({ children }) => {
  const [data, setData] = useState<Data>({ active: null, records: [] });
  const dataRef = useRef(data);
  const [noticeText, setNoticeText] = useState("");
  // 相同文案的连续通知也要重新触发（React 同值 setState 会跳过重渲染）
  const [noticeSeq, setNoticeSeq] = useState(0);
  const setNotice = useCallback((text: string) => {
    setNoticeText(text);
    setNoticeSeq((n) => n + 1);
  }, []);
  const [error, setError] = useState("");
  const fatal = useRef(false);
  const lastTick = useRef(performance.now());
  const lastSave = useRef(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const restRef = useRef(0);
  const notified = useRef(false);
  const publish = useCallback((next: Data, save = true) => {
    if (save) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    dataRef.current = next;
    setData(next);
  }, []);
  const fail = useCallback((e: any) => {
    fatal.current = true;
    setError(
      e?.message || "无法保存记录，已暂停计时。请导出数据后重试。"
    );
    if (dataRef.current.active) {
      const next = {
        ...dataRef.current,
        active: {
          ...dataRef.current.active,
          status: "paused" as const,
        },
      };
      dataRef.current = next;
      setData(next);
    }
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          !Array.isArray(parsed.records) ||
          parsed.records.some(
            (r: any) =>
              !r.id ||
              r.status !== "saved" ||
              !Number.isFinite(r.acceptedSeconds)
          )
        )
          throw new Error(
            "本地记录格式异常，请先导出数据，暂不覆盖原始记录。"
          );
        const active = restoreSession(parsed.active);
        publish({ active, records: parsed.records });
        if (active)
          setNotice(
            "已恢复未结束的专注并暂停；关闭期间不计时，可继续或结束确认。"
          );
      }
    } catch (e) {
      fail(e);
    }
  }, [publish, fail, setNotice]);
  const settle = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, (now - lastTick.current) / 1000);
    lastTick.current = now;
    const current = dataRef.current;
    if (
      !current.active ||
      current.active.status !== "active" ||
      fatal.current
    )
      return current;
    // A long event-loop/system suspension is not silently treated as focused work.
    if (delta > 5) {
      const next = {
        ...current,
        active: {
          ...current.active,
          status: "paused" as const,
          recovered: true,
        },
      };
      publish(next);
      setNotice("检测到休眠或计时中断，已暂停；缺失时段未自动计入。");
      return next;
    }
    const active = advanceSession(current.active, delta);
    if (
      active.elapsedSeconds >= active.plannedSeconds &&
      !notified.current
    ) {
      notified.current = true;
      setNotice(
        "本轮时间已到，正在记录额外时间；结束时由你确认是否计入。"
      );
      playTimeUp();
      (window as any).focusApi?.remind().catch(() => {});
    }
    const next = { ...current, active };
    const save = now - lastSave.current >= 1000;
    if (save) lastSave.current = now;
    publish(next, save);
    return next;
  }, [publish, setNotice]);
  useEffect(() => {
    const tick = setInterval(() => {
      try {
        const before = lastTick.current;
        settle();
        if (restRef.current > 0) {
          restRef.current = Math.max(
            0,
            restRef.current - (performance.now() - before) / 1000
          );
          setRestSeconds(restRef.current);
          if (restRef.current === 0) {
            setNotice("休息结束，可以选择下一个番茄。");
            playRestEnd();
          }
        }
      } catch (e) {
        fail(e);
      }
    }, 250);
    const persist = () => {
      try {
        publish(settle());
      } catch (e) {
        fail(e);
      }
    };
    const unsubscribe = (window as any).focusApi?.onSuspend(() => {
      try {
        const current = dataRef.current;
        if (current.active?.status === "active") {
          publish({
            ...current,
            active: {
              ...current.active,
              status: "paused",
              recovered: true,
            },
          });
          setNotice("电脑已休眠，专注已暂停；唤醒后可继续或结束确认。");
        }
        lastTick.current = performance.now();
      } catch (e) {
        fail(e);
      }
    });
    window.addEventListener("beforeunload", persist);
    return () => {
      clearInterval(tick);
      unsubscribe?.();
      window.removeEventListener("beforeunload", persist);
    };
  }, [settle, publish, fail, setNotice]);
  const action = (fn: () => void) => {
    if (!fatal.current) {
      try {
        fn();
      } catch (e: any) {
        setError(e.message);
      }
    }
  };
  const begin = (task: FocusTask, minutes: number) =>
    action(() => {
      if (dataRef.current.active)
        throw new Error("请先结束并确认当前专注");
      if (
        !task?.id ||
        !task.title.trim() ||
        !Number.isFinite(minutes) ||
        minutes < 1 ||
        minutes > 180
      )
        throw new Error("请选择任务，并设置 1–180 分钟");
      restRef.current = 0;
      setRestSeconds(0);
      notified.current = false;
      setNotice("");
      setError("");
      lastTick.current = performance.now();
      const active: FocusSession = {
        id: crypto.randomUUID(),
        task,
        startedAt: Date.now(),
        plannedSeconds: minutes * 60,
        elapsedSeconds: 0,
        status: "active",
        sync: "local",
        syncTarget: "plan",
        segments: [],
        segmentOpen: false,
      };
      publish({ ...dataRef.current, active });
    });
  const pause = () =>
    action(() => {
      const next = settle();
      if (next.active?.status === "active")
        publish({
          ...next,
          active: { ...next.active, status: "paused" },
        });
    });
  const changeTask = (task: FocusTask) => {
    let changed = false;
    action(() => {
      const next = settle();
      if (!next.active) throw Error("当前没有正在进行的专注");
      publish({
        ...next,
        active: reassignActiveSession(next.active, task),
      });
      setNotice("任务已更换，已计时长保留；结束后整段专注记到新任务。");
      setError("");
      changed = true;
    });
    return changed;
  };
  const resume = () =>
    action(() => {
      const next = dataRef.current;
      if (next.active?.status === "paused") {
        lastTick.current = performance.now();
        publish({
          ...next,
          active: {
            ...next.active,
            status: "active",
            segmentOpen: false,
          },
        });
        setError("");
      }
    });
  const finish = () =>
    action(() => {
      const next = settle();
      if (next.active && next.active.status !== "review")
        publish({
          ...next,
          active: {
            ...next.active,
            endedAt: Date.now(),
            status: "review",
          },
        });
    });
  const confirm = (seconds: number, completed: number) =>
    action(() => {
      const next = dataRef.current;
      if (!next.active) throw new Error("当前没有待确认记录");
      const record = confirmSession(next.active, seconds, completed);
      publish({
        active: null,
        records: upsertRecord(next.records, record),
      });
      setNotice("专注记录已保存。");
      setError("");
    });
  // receipt.completedCount 是原表行“本次达标”标记（0/1），不回写覆盖
  // 本地记录里用户确认的番茄数；只补记 syncedPlanId
  const markSynced = (
    id: string,
    receipt?: {
      completedCount?: number;
      planId?: string;
      completionOwnedPlanIds?: string[];
    }
  ) =>
    action(() =>
      publish({
        ...dataRef.current,
        records: dataRef.current.records.map((r) =>
          r.id === id
            ? {
                ...r,
                sync: "synced" as const,
                ...(receipt?.completionOwnedPlanIds
                  ? {
                      completionOwnedPlanIds:
                        receipt.completionOwnedPlanIds,
                    }
                  : {}),
                ...(receipt?.planId
                  ? { syncedPlanId: receipt.planId }
                  : {}),
              }
            : r
        ),
      })
    );
  const discard = () =>
    action(() => {
      const next = dataRef.current;
      if (next.active?.status !== "review") return;
      publish({ ...next, active: null });
      setNotice("已放弃本次专注，未保存或同步。 ");
      setError("");
    });
  // 结束确认屏返回继续计时：走与暂停/恢复相同的状态机路径（review → paused），
  // 不新增并行计时逻辑；分钟数由 elapsedSeconds 原样保留，不会重复累计
  const returnToTiming = () =>
    action(() => {
      const next = dataRef.current;
      if (next.active?.status !== "review") return;
      lastTick.current = performance.now();
      publish({ ...next, active: returnFromReview(next.active) });
      setNotice("已返回继续计时；当前已暂停，点「继续」接着计时。");
      setError("");
    });
  const startBreak = () =>
    action(() => {
      if (dataRef.current.active) throw new Error("请先保存当前专注");
      restRef.current = 300;
      setRestSeconds(300);
      lastTick.current = performance.now();
      setNotice("休息中，休息时间不计入专注。");
    });
  const addManual = (record: FocusSession) =>
    action(() => {
      if (dataRef.current.active)
        throw new Error("请先结束并确认当前专注再补记");
      if (!record?.id || !record.task?.id || record.status !== "saved")
        throw new Error("补记记录格式不正确");
      if (
        !Number.isFinite(record.startedAt) ||
        record.startedAt > Date.now() + 60_000
      )
        throw new Error("补记的开始时间不能在未来");
      if (
        !Number.isFinite(record.acceptedSeconds) ||
        (record.acceptedSeconds as number) < 0 ||
        (record.acceptedSeconds as number) > 600 * 60
      )
        throw new Error("补记的专注时长必须在 1–600 分钟");
      if (
        record.completedCount != null &&
        (!Number.isInteger(record.completedCount) ||
          record.completedCount < 0 ||
          record.completedCount > 100)
      )
        throw new Error("补记的番茄数必须是 0–100 的整数");
      publish({
        ...dataRef.current,
        records: upsertRecord(dataRef.current.records, record),
      });
      setNotice("已补记专注记录。");
      setError("");
    });
  const count = data.active ? timeParts(data.active).remaining : 1500;
  const mergeCloud = (records: FocusSession[], sourceKey: string) => {
    // Compute first: a conflicting response must leave all local state intact.
    const merged = mergeCloudRecords(
      dataRef.current.records,
      records,
      sourceKey
    );
    try {
      publish({ ...dataRef.current, records: merged });
    } catch (e) {
      fail(e);
      throw e;
    }
  };
  return (
    <CounterContext.Provider
      value={{
        count,
        duration: data.active?.plannedSeconds || 1500,
        shouldFullscreen: false,
        active: data.active,
        records: data.records,
        mergeCloud,
        getSnapshot: () => dataRef.current,
        bindQuick: (q, rows) => {
          if (fatal.current) throw Error("本机存储异常，未绑定任务");
          publish(bindQuickSessions(dataRef.current, q, rows));
        },
        notice: noticeText,
        noticeSeq,
        error,
        blocked: fatal.current,
        restSeconds,
        begin,
        changeTask,
        pause,
        resume,
        finish,
        confirm,
        discard,
        returnToTiming,
        markSynced,
        startBreak,
        addManual,
        resetTimerAction: finish,
      }}
    >
      {children}
    </CounterContext.Provider>
  );
};
export { CounterContext, CounterProvider };
