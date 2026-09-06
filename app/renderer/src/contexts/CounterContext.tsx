// Adapted from Pomatez's CounterProvider: one elapsed-time loop owns focus and break timing.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FocusSession,
  FocusTask,
  advanceSession,
  confirmSession,
  restoreSession,
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
  notice: string;
  error: string;
  blocked: boolean;
  restSeconds: number;
  begin: (task: FocusTask, minutes: number) => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  confirm: (seconds: number, completed: number) => void;
  markSynced: (id: string) => void;
  startBreak: () => void;
  resetTimerAction: () => void;
};
const CounterContext = React.createContext<CounterProps>(
  {} as CounterProps
);
const CounterProvider: React.FC = ({ children }) => {
  const [data, setData] = useState<Data>({ active: null, records: [] });
  const dataRef = useRef(data);
  const [notice, setNotice] = useState("");
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
  }, [publish, fail]);
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
      (window as any).focusApi?.remind().catch(() => {});
    }
    const next = { ...current, active };
    const save = now - lastSave.current >= 1000;
    if (save) lastSave.current = now;
    publish(next, save);
    return next;
  }, [publish]);
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
          if (restRef.current === 0)
            setNotice("休息结束，可以选择下一个番茄。");
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
  }, [settle, publish, fail]);
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
  const resume = () =>
    action(() => {
      const next = dataRef.current;
      if (next.active?.status === "paused") {
        lastTick.current = performance.now();
        publish({
          ...next,
          active: { ...next.active, status: "active" },
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
  const markSynced = (id: string) =>
    action(() =>
      publish({
        ...dataRef.current,
        records: dataRef.current.records.map((r) =>
          r.id === id ? { ...r, sync: "synced" as const } : r
        ),
      })
    );
  const startBreak = () =>
    action(() => {
      if (dataRef.current.active) throw new Error("请先保存当前专注");
      restRef.current = 300;
      setRestSeconds(300);
      lastTick.current = performance.now();
      setNotice("休息中，休息时间不计入专注。");
    });
  const count = data.active ? timeParts(data.active).remaining : 1500;
  return (
    <CounterContext.Provider
      value={{
        count,
        duration: data.active?.plannedSeconds || 1500,
        shouldFullscreen: false,
        active: data.active,
        records: data.records,
        notice,
        error,
        blocked: fatal.current,
        restSeconds,
        begin,
        pause,
        resume,
        finish,
        confirm,
        markSynced,
        startBreak,
        resetTimerAction: finish,
      }}
    >
      {children}
    </CounterContext.Provider>
  );
};
export { CounterContext, CounterProvider };
