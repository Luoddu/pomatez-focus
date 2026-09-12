import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CounterContext } from "contexts/CounterContext";
import { FocusSession, FocusTask, timeParts } from "./session";
import QuadrantBoard from "./components/QuadrantBoard";
import FocusTimer from "./components/FocusTimer";
import ReviewPanel from "./components/ReviewPanel";
import SettingsPanel, { FocusConfig } from "./components/SettingsPanel";
import HistoryPanel from "./components/HistoryPanel";
import MiniView from "./components/MiniView";
import { api, clock, groupTasks, parseTitle } from "./components/shared";
import { weekTomatoes, weekQuadrants, quadrantCounts, quadrantToneList } from "./week";
import "./focus.css";

// 仅未连接飞书时使用的演示数据，方便离线演示与截图
const demo: FocusTask[] = [
  {
    id: "demo-fig-1",
    title: "整理项目方案 · 第 1 个番茄",
    source: "local",
    taskId: "demo-fig",
    quadrant: "iu",
    doneToday: 1,
    plannedToday: 3,
  },
  {
    id: "demo-fig-2",
    title: "整理项目方案 · 第 2 个番茄",
    source: "local",
    taskId: "demo-fig",
    quadrant: "iu",
    doneToday: 1,
    plannedToday: 3,
  },
  {
    id: "demo-paper-done",
    title: "回复工作邮件",
    source: "local",
    taskId: "demo-paper",
    quadrant: "iu",
    kind: "done",
    doneToday: 2,
    plannedToday: 2,
  },
  {
    id: "demo-metal-1",
    title: "阅读学习资料 · 第 1 个番茄",
    source: "local",
    taskId: "demo-metal",
    quadrant: "inu",
    doneToday: 0,
    plannedToday: 2,
  },
  {
    id: "demo-metal-2",
    title: "阅读学习资料 · 第 2 个番茄",
    source: "local",
    taskId: "demo-metal",
    quadrant: "inu",
    doneToday: 0,
    plannedToday: 2,
  },
  {
    id: "demo-video-1",
    title: "整理待办事项 · 第 1 个番茄",
    source: "local",
    taskId: "demo-video",
    quadrant: "uni",
    doneToday: 0,
    plannedToday: 1,
  },
  {
    id: "demo-wechat-1",
    title: "整理个人笔记 · 第 1 个番茄",
    source: "local",
    taskId: "demo-wechat",
    quadrant: "unu",
    doneToday: 0,
    plannedToday: 1,
  },
  {
    id: "demo-split-1",
    title: "规划下一周任务 · 第 1 个番茄",
    source: "local",
    taskId: "demo-split",
    doneToday: 0,
    plannedToday: 1,
  },
];
// 演示历史记录（[几天前, 当日番茄数]）：仅内存态展示，不写 localStorage，
// 让离线 demo 的月历有色阶、番茄地进入挂果阶段；连接飞书后完全不使用
const demoHistory = (): FocusSession[] => {
  const days: [number, number][] = [
    [0, 2], [1, 1], [3, 3], [4, 2], [6, 1], [7, 4], [8, 2], [10, 5],
    [11, 1], [13, 2], [14, 6], [15, 3], [17, 2], [18, 1], [20, 4],
    [21, 9], [22, 2], [24, 1], [25, 3], [27, 2], [28, 5], [29, 1],
    [31, 2], [32, 4], [33, 1],
  ];
  return days.map(([ago, count]) => {
    const started = new Date();
    started.setDate(started.getDate() - ago);
    started.setHours(10, 30, 0, 0);
    return {
      id: `demo-rec-${ago}`,
      task: demo[ago % demo.length],
      startedAt: started.getTime(),
      endedAt: started.getTime() + count * 1500 * 1000,
      plannedSeconds: 1500,
      elapsedSeconds: count * 1500,
      acceptedSeconds: count * 1500,
      completedCount: count,
      status: "saved",
      sync: "local",
    };
  });
};
export default function FocusApp() {
  const timer = useContext(CounterContext);
  const [tasks, setTasks] = useState<FocusTask[]>(() =>
      api() ? [] : demo
    ),
    [selected, setSelected] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(() => !!api());
  const [minutes, setMinutes] = useState(25),
    [compact, setCompact] = useState(false),
    [pinned, setPinned] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false),
    [connected, setConnected] = useState(false),
    [sourceKey, setSourceKey] = useState<string | null>(null),
    [todayCount, setTodayCount] = useState<number | null>(null),
    [quadrantField, setQuadrantField] = useState<string | null>(null);
  // 右下角浮出 toast：信息 3 秒自消；需要处理的错误常驻、带关闭 ×
  const [toast, setToast] = useState<{
    id: number;
    text: string;
    kind: "info" | "error";
  } | null>(null);
  const toastSeq = useRef(0);
  const notify = (text: string, kind: "info" | "error" = "info") =>
    setToast({ id: ++toastSeq.current, text, kind });
  const [busy, setBusy] = useState(false),
    [generating, setGenerating] = useState(false),
    [adjusting, setAdjusting] = useState(""),
    [completing, setCompleting] = useState(""),
    [accepted, setAccepted] = useState("25"),
    [completed, setCompleted] = useState(0),
    [completedTouched, setCompletedTouched] = useState(false),
    [localTitle, setLocalTitle] = useState("");
  const [config, setConfig] = useState<FocusConfig>({
    appId: "",
    appSecret: "",
    baseUrl: "",
    planTable: "专注记录",
    dateField: "计划日",
    taskField: "任务",
    completedField: "已完成",
    quadrantField: "",
  });
  const syncing = useRef(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [demoSeed] = useState(demoHistory);
  const active = timer.active,
    parts = active ? timeParts(active) : null;
  const pending = timer.records.filter((r) => r.sync === "pending");
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  // Demo 模式把内存态演示记录叠在真实记录后展示；接入飞书后只用真实记录
  const shownRecords = useMemo(
    () => (api() ? timer.records : [...timer.records, ...demoSeed]),
    [timer.records, demoSeed]
  );
  const totalTomatoes = useMemo(
    () =>
      shownRecords
        .filter((r) => r.status === "saved")
        .reduce((n, r) => n + (r.completedCount || 0), 0),
    [shownRecords]
  );
  // 番茄园周制：北京时间周一起算的本周完成数驱动田里生长；
  // ?farmNow=<ms> 仅供设计稿/截图脚本 mock 时刻（天空与周窗口同口径）
  const farmNow = useMemo(() => {
    const v = new URLSearchParams(window.location.search).get("farmNow");
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, []);
  const weeklyTomatoes = useMemo(
    () => weekTomatoes(shownRecords, farmNow ?? Date.now()),
    [shownRecords, farmNow]
  );
  // 象限色序列：田里果实按本周收获分布；果筐堆按累计收获分布（与
  // 「累计收获 N」口径一致，且不受星期几影响）
  const weekTones = useMemo(
    () => quadrantToneList(weekQuadrants(shownRecords, farmNow ?? Date.now())),
    [shownRecords, farmNow]
  );
  const pileTones = useMemo(
    () => quadrantToneList(quadrantCounts(shownRecords)),
    [shownRecords]
  );
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e: any) {
      notify(e.message || "操作失败，请稍后重试", "error");
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (!api()) return;
    setLoadingTasks(true);
    try {
      const status = await api().status();
      setConnected(status.configured);
      setSourceKey(status.sourceKey || null);
      if (status.configured) {
        const rows: FocusTask[] = await api().today();
        setTasks(rows);
        setTodayCount(rows.length);
        // 默认不预选；刷新只保留仍然存在的选中
        setSelected((previous) =>
          rows.some((t) => t.id === previous) ? previous : ""
        );
        // today() 完成四象限探测后重读 status，拿到命中结果
        const after = await api().status();
        setQuadrantField(after.quadrantField ?? null);
      } else {
        // Demo tasks are only appropriate once local mode is confirmed.
        setTasks((previous) => (previous.length ? previous : demo));
      }
    } finally {
      setLoadingTasks(false);
    }
  };
  useEffect(() => {
    run(refresh);
    if (api())
      api()
        .windowState()
        .then((state: { compact: boolean; pinned: boolean }) => {
          setCompact(state.compact);
          setPinned(state.pinned);
        })
        .catch(() => notify("无法读取窗口状态，请重试切换小窗。", "error"));
    // One read at launch; subsequent refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (active?.status === "review") {
      const { base } = timeParts(active);
      setAccepted((Math.floor(base) / 60).toFixed(2));
      // 按分钟/番茄时长自动预填完成番茄数（floor）；用户点过快选后停止跟随
      setCompleted(
        Math.min(100, Math.max(0, Math.floor(base / active.plannedSeconds)))
      );
      setCompletedTouched(false);
      windowMode(false, false);
    }
    // Initialize once when entering review; elapsed/pin renders must not reset the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.status]);
  const handleAccepted = (value: string) => {
    setAccepted(value);
    if (active && !completedTouched) {
      const auto = Math.floor(
        Number(value) / (active.plannedSeconds / 60)
      );
      setCompleted(
        Number.isFinite(auto) ? Math.min(100, Math.max(0, auto)) : 0
      );
    }
  };
  const handleCompleted = (value: number) => {
    setCompletedTouched(true);
    setCompleted(value);
  };
  const sync = async () => {
    if (!connected || syncing.current || !api()) return;
    syncing.current = true;
    setSyncBusy(true);
    try {
      const attempted = new Set<string>();
      do {
        for (const record of [...pendingRef.current].reverse()) {
          if (attempted.has(record.id)) continue;
          attempted.add(record.id);
          const receipt = await api().sync(record);
          timer.markSynced(record.id, receipt);
          // 确认 N 个番茄的多行完成可能部分失败：会话本体已同步，
          // 未成的行号单独提示，可右键 chip 补标或到飞书核对
          const failedRows = receipt?.completion?.failed;
          if (failedRows?.length)
            notify(
              `「${parseTitle(record.task.title).name}」第 ${failedRows
                .map((f: any) => f.sequence)
                .join("、")} 个番茄未能标记完成：${failedRows[0].reason}`,
              "error"
            );
        }
        await refresh();
      } while (pendingRef.current.some((r) => !attempted.has(r.id)));
      notify("专注记录已同步到飞书。");
    } catch (e: any) {
      notify(`记录已保存在本机，待同步：${e.message}`, "error");
    } finally {
      syncing.current = false;
      setSyncBusy(false);
    }
  };
  const pendingIds = pending.map((r) => r.id).join(",");
  // A pending-set change permits one attempt; a failed attempt waits for explicit retry.
  useEffect(() => {
    if (pendingIds && connected) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds, connected]);
  const windowMode = async (small: boolean, pin: boolean) => {
    try {
      const state = api()
        ? await api().windowMode({ compact: small, pinned: pin })
        : { compact: small, pinned: small && pin };
      setCompact(state.compact);
      setPinned(state.pinned);
      if (small && pin && !state.pinned)
        notify("置顶未生效，可点击置顶按钮重试。", "error");
    } catch {
      notify("窗口切换未完成，请重试。", "error");
    }
  };
  // 生成今日番茄：App 内原生走飞书 API，不弹任何外部窗口
  const generate = () => {
    if (!api() || !connected) {
      notify("请先在设置中连接飞书，再生成今日番茄。", "error");
      return;
    }
    setGenerating(true);
    run(async () => {
      try {
        const r = await api().generateToday();
        const parts = [
          r.created > 0
            ? `已生成 ${r.created} 个今日番茄`
            : "今日番茄已齐全，无需生成",
        ];
        if (r.blocked > 0)
          parts.push(`${r.blocked} 个任务数据不完整，已跳过`);
        if (r.capacityExceeded)
          parts.push(`超出建议日容量 ${r.capacityOverage} 个`);
        notify(parts.join("；") + "。");
        await refresh();
      } finally {
        setGenerating(false);
      }
    });
  };
  // 悬浮 ± 临时调整：乐观更新 UI，写飞书失败按本地快照回滚并报错
  const adjust = (taskId: string, delta: 1 | -1) => {
    if (!api() || !connected) {
      notify("请先在设置中连接飞书，再调整番茄数。", "error");
      return;
    }
    const group = groupTasks(tasks).find((g) => g.key === taskId);
    if (!group || adjusting) return;
    const rollback = tasks;
    if (delta === 1) {
      const info = group.tasks.find((t) => t.plannedToday != null);
      const seq =
        Math.max(
          info?.plannedToday ?? 0,
          ...group.tasks.map((t) => parseTitle(t.title).pomodoro)
        ) + 1;
      setTasks([
        ...tasks,
        {
          id: `pending-${taskId}-${seq}`,
          title: `${group.name} · 第 ${seq} 个番茄`,
          source: "feishu",
          taskId,
          kind: "pending",
          doneToday: info?.doneToday ?? 0,
          plannedToday: (info?.plannedToday ?? group.tasks.length) + 1,
        },
      ]);
    } else {
      const victims = group.tasks.filter(
        (t) =>
          t.kind !== "done" &&
          t.kind !== "pending" &&
          t.id !== active?.task.id
      );
      const victim = victims.reduce<FocusTask | null>(
        (top, t) =>
          !top ||
          parseTitle(t.title).pomodoro > parseTitle(top.title).pomodoro
            ? t
            : top,
        null
      );
      if (!victim) return;
      setTasks(tasks.filter((t) => t.id !== victim.id));
    }
    setAdjusting(taskId);
    (async () => {
      try {
        await api().adjustToday({ taskId, delta });
        await refresh();
      } catch (e: any) {
        setTasks(rollback);
        notify(e.message || "番茄调整失败，请稍后重试", "error");
      } finally {
        setAdjusting("");
      }
    })();
  };
  // 右键 chip「标记完成」：只勾飞书已完成，不建专注记录、不计分钟；
  // 乐观移除 chip，失败回滚并报错
  const completeChip = (task: FocusTask) => {
    if (!api() || !connected) {
      notify("请先在设置中连接飞书，再标记完成。", "error");
      return;
    }
    if (completing || adjusting) return;
    const rollback = tasks;
    const parsed = parseTitle(task.title);
    setCompleting(task.id);
    setTasks(tasks.filter((t) => t.id !== task.id));
    (async () => {
      try {
        await api().completeToday({ planId: task.planId || task.id });
        notify(`已完成「${parsed.name} · 第 ${parsed.pomodoro} 个番茄」。`);
        await refresh();
      } catch (e: any) {
        setTasks(rollback);
        notify(e.message || "标记完成失败，请稍后重试", "error");
      } finally {
        setCompleting("");
      }
    })();
  };
  const exportRecords = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            records: timer.records,
            active,
            recoveryBackup: timer.blocked
              ? localStorage.getItem("pomatez-focus-v1")
              : undefined,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `focus-records-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const addLocal = () => {
    const t: FocusTask = {
      id: crypto.randomUUID(),
      title: localTitle.trim(),
      source: "local",
    };
    setTasks([...tasks, t]);
    setSelected(t.id);
    setLocalTitle("");
    setSettingsOpen(false);
  };
  // 自由番茄绑定当前连接状态；每次开始都用新 id
  const makeFreeTask = (): FocusTask => ({
    id: crypto.randomUUID(),
    title: "自由番茄",
    kind: "free" as const,
    source:
      connected && sourceKey ? ("feishu" as const) : ("local" as const),
    ...(sourceKey ? { sourceKey } : {}),
  });
  // 开始一个任务：把未同步的同一 planId 记录折算进 creditedSeconds 后再起计时
  const beginTask = (task: FocusTask) => {
    const unsyncedSeconds = task.planId
      ? pending
          .filter(
            (r) =>
              r.syncTarget === "plan" &&
              r.task.sourceKey === task.sourceKey &&
              r.task.planId === task.planId &&
              !task.appliedSessionIds?.includes(r.id)
          )
          .reduce((n, r) => n + (r.acceptedSeconds || 0), 0)
      : 0;
    timer.begin(
      {
        ...task,
        creditedSeconds: (task.creditedSeconds || 0) + unsyncedSeconds,
      },
      minutes
    );
  };
  // 同任务的下一个番茄（序号 +1），自由番茄没有“下一个”但总是可以再开一个
  const nextTask = useMemo(() => {
    if (!active || active.task.kind === "free") return null;
    const wanted = parseTitle(active.task.title).pomodoro + 1;
    return (
      tasks.find(
        (t) =>
          t.taskId === active.task.taskId &&
          parseTitle(t.title).pomodoro === wanted
      ) || null
    );
  }, [active, tasks]);
  const nextAvailable = active?.task.kind === "free" || !!nextTask;
  const shownTime = parts?.overtime
    ? `+${clock(parts.overtime)}`
    : clock(
        timer.restSeconds || (active ? parts!.remaining : minutes * 60)
      );
  const overtimeActive = !!(active && parts && parts.overtime > 0);
  const overtimeRef = useRef(false);
  overtimeRef.current = overtimeActive;
  // 计时器语境的通知/错误也走 toast；超时时 notice 已由圆环下内联提示承担
  useEffect(() => {
    if (timer.error) notify(timer.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.error]);
  useEffect(() => {
    if (timer.notice && !overtimeRef.current) notify(timer.notice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.notice, timer.noticeSeq]);
  // 信息类 toast 3 秒自动消失；错误常驻直到用户关闭
  useEffect(() => {
    if (!toast || toast.kind === "error") return;
    const t = setTimeout(
      () =>
        setToast((cur) => (cur && cur.id === toast.id ? null : cur)),
      3000
    );
    return () => clearTimeout(t);
  }, [toast]);
  const view =
    active?.status === "review"
      ? "review"
      : active
      ? "timing"
      : "board";
  if (compact)
    return (
      <div className="focus-app compact">
        <MiniView
          active={active}
          taskTitle={
            active?.task.title ||
            tasks.find((t) => t.id === selected)?.title ||
            ""
          }
          shownTime={shownTime}
          pinned={pinned}
          onPause={timer.pause}
          onResume={timer.resume}
          onFinish={timer.finish}
          onExpand={() => windowMode(false, pinned)}
          onTogglePin={() => windowMode(true, !pinned)}
        />
      </div>
    );
  const windowControls = {
    pinned,
    settingsOpen,
    onToggleSettings: () => setSettingsOpen(!settingsOpen),
    onToggleCompact: () => windowMode(true, true),
    onTogglePin: () => windowMode(true, !pinned),
  };
  return (
    <div className="focus-app">
      {settingsOpen ? (
        <SettingsPanel
          config={config}
          connected={connected}
          todayCount={todayCount}
          quadrantField={quadrantField}
          pendingCount={pending.length}
          busy={busy}
          canConnect={!!api()}
          localTitle={localTitle}
          hasActive={!!active}
          onConfig={setConfig}
          onSubmit={() =>
            run(async () => {
              await api().configure(config);
              setConfig({ ...config, appSecret: "" });
              await refresh();
            })
          }
          onSetup={() =>
            run(async () => {
              await api().setup();
              notify("原表专注字段已就绪，保存时会回写对应番茄。");
            })
          }
          onRetrySync={() => run(sync)}
          onLocalTitle={setLocalTitle}
          onAddLocal={addLocal}
          {...windowControls}
        />
      ) : (
        <main className={`content view-${view}`}>
          {view === "review" && active ? (
            <ReviewPanel
              active={active}
              accepted={accepted}
              completed={completed}
              connected={connected}
              nextAvailable={nextAvailable}
              onAccepted={handleAccepted}
              onCompleted={handleCompleted}
              onSave={() => {
                timer.confirm(
                  Math.round(Number(accepted) * 60),
                  completed
                );
              }}
              onSaveRest={() => {
                timer.confirm(
                  Math.round(Number(accepted) * 60),
                  completed
                );
                timer.startBreak();
              }}
              onSaveNext={() => {
                const target =
                  active.task.kind === "free" ? makeFreeTask() : nextTask;
                timer.confirm(
                  Math.round(Number(accepted) * 60),
                  completed
                );
                if (target) beginTask(target);
              }}
              onDiscard={() => {
                timer.discard();
              }}
              onReturn={timer.returnToTiming}
            />
          ) : view === "timing" && active ? (
            <FocusTimer
              active={active}
              restSeconds={timer.restSeconds}
              shownTime={shownTime}
              onPause={timer.pause}
              onResume={timer.resume}
              onFinish={timer.finish}
            />
          ) : (
            <QuadrantBoard
              tasks={tasks}
              selected={selected}
              onSelect={(id) =>
                setSelected((previous) => (previous === id ? "" : id))
              }
              minutes={minutes}
              onMinutes={setMinutes}
              onBegin={() => {
                // Bind free focus to the current Base, never a future connection.
                beginTask(
                  tasks.find((t) => t.id === selected) || makeFreeTask()
                );
              }}
              onBreak={timer.startBreak}
              busy={busy || loadingTasks}
              blocked={timer.blocked}
              canBreak={timer.records.length > 0}
              restSeconds={timer.restSeconds}
              totalTomatoes={totalTomatoes}
              weekTomatoes={weeklyTomatoes}
              weekTones={weekTones}
              pileTones={pileTones}
              farmNow={farmNow}
              onAdjust={adjust}
              adjusting={adjusting}
              activeTaskId={
                active && active.task.kind !== "free"
                  ? active.task.taskId || ""
                  : ""
              }
              onComplete={completeChip}
              completing={completing}
            />
          )}
          <HistoryPanel
            records={shownRecords}
            pendingCount={pending.length}
            canSync={connected && !!api()}
            syncBusy={syncBusy}
            onSync={() => run(sync)}
            tasks={tasks}
            onExport={exportRecords}
            onAddManual={timer.addManual}
            onGenerate={generate}
            generating={generating}
            onRefresh={() => run(refresh)}
            refreshBusy={busy || loadingTasks}
            {...windowControls}
          />
        </main>
      )}
      {toast && (
        <div
          className={`toast ${toast.kind}`}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <span>{toast.text}</span>
          {toast.kind === "error" && (
            <button
              className="toast-close"
              aria-label="关闭提示"
              onClick={() => setToast(null)}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
