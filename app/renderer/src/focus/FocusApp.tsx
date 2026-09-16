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
import {
  api,
  clock,
  groupTasks,
  parseTitle,
} from "./components/shared";
import {
  weekTomatoes,
  weekQuadrants,
  quadrantCounts,
  quadrantToneList,
} from "./week";
import { CompletionQueue } from "./completionQueue";
import { playTimeUp } from "./sound";
import {
  shouldGenerateSilently,
  silentGenerateNotice,
} from "./silentgen";
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
    [0, 2],
    [1, 1],
    [3, 3],
    [4, 2],
    [6, 1],
    [7, 4],
    [8, 2],
    [10, 5],
    [11, 1],
    [13, 2],
    [14, 6],
    [15, 3],
    [17, 2],
    [18, 1],
    [20, 4],
    [21, 9],
    [22, 2],
    [24, 1],
    [25, 3],
    [27, 2],
    [28, 5],
    [29, 1],
    [31, 2],
    [32, 4],
    [33, 1],
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
    [silentGenerating, setSilentGenerating] = useState(false),
    [adjusting, setAdjusting] = useState(""),
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
  const [completionQueue] = useState(
    () => new CompletionQueue(localStorage)
  );
  const [queueRevision, setQueueRevision] = useState(0);
  useEffect(
    () =>
      completionQueue.subscribe(() => setQueueRevision((n) => n + 1)),
    [completionQueue]
  );
  const queued = completionQueue.entries.filter(
    (e) => e.sourceKey === sourceKey && e.state !== "done"
  );
  const queueFailed = queued.filter((e) => e.state === "failed");
  const boardTasks = completionQueue.project(tasks, sourceKey);
  const refreshSequence = useRef(0);
  const syncing = useRef(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [demoSeed] = useState(demoHistory);
  const active = timer.active,
    parts = active ? timeParts(active) : null;
  const pending = timer.records.filter((r) => r.sync === "pending");
  const historyPending = timer.records.filter(
    (r) =>
      !r.cloudSynced &&
      (r.task.source === "local" || r.task.sourceKey === sourceKey)
  );
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
    const v = new URLSearchParams(window.location.search).get(
      "farmNow"
    );
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, []);
  // ?genMock=1 仅供设计稿/截图脚本：不连飞书，本地按真实阶段顺序模拟推进
  const genMock = useMemo(
    () =>
      new URLSearchParams(window.location.search).get("genMock") ===
      "1",
    []
  );
  // 生成进度：主进程各阶段的真实事件经 preload 桥推到这里
  const [genStage, setGenStage] = useState<{
    stage: string;
    done?: number;
    total?: number;
  } | null>(null);
  useEffect(() => {
    if (!api() || !api().onGenerateProgress) return;
    return api().onGenerateProgress((p: any) => setGenStage(p));
  }, []);
  const GEN_STAGE_TEXT: Record<string, string> = {
    connect: "正在连接飞书…",
    tasks: "正在读取任务…",
    records: "正在读取专注记录…",
    plan: "正在规划今日番茄…",
    verify: "正在回读校验…",
  };
  const genStageText = genStage
    ? genStage.stage === "write"
      ? `正在写入 ${genStage.done}/${genStage.total}…`
      : GEN_STAGE_TEXT[genStage.stage] || "正在生成…"
    : "";
  const weeklyTomatoes = useMemo(
    () => weekTomatoes(shownRecords, farmNow ?? Date.now()),
    [shownRecords, farmNow]
  );
  // 象限色序列：田里果实按本周收获分布；果筐堆按累计收获分布（与
  // 「累计收获 N」口径一致，且不受星期几影响）
  const weekTones = useMemo(
    () =>
      quadrantToneList(
        weekQuadrants(shownRecords, farmNow ?? Date.now())
      ),
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
    const sequence = ++refreshSequence.current;
    setLoadingTasks(true);
    try {
      const status = await api().status();
      setConnected(status.configured);
      setSourceKey(status.sourceKey || null);
      if (status.configured) {
        const rows: FocusTask[] = await api().today();
        if (sequence !== refreshSequence.current) return;
        setTasks(rows);
        completionQueue.reconcile(status.sourceKey, rows);
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
      if (sequence === refreshSequence.current) setLoadingTasks(false);
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
        .catch(() =>
          notify("无法读取窗口状态，请重试切换小窗。", "error")
        );
    // One read at launch; subsequent refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (active?.status === "review") {
      const { base } = timeParts(active);
      setAccepted((Math.floor(base) / 60).toFixed(2));
      // 按分钟/番茄时长自动预填完成番茄数（floor）；用户点过快选后停止跟随
      setCompleted(
        Math.min(
          100,
          Math.max(0, Math.floor(base / active.plannedSeconds))
        )
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
    if (
      !connected ||
      !sourceKey ||
      syncing.current ||
      !api() ||
      timer.blocked
    )
      return;
    syncing.current = true;
    setSyncBusy(true);
    try {
      const eligible = (r: FocusSession) =>
        !r.cloudSynced &&
        (r.task.source === "local" || r.task.sourceKey === sourceKey);
      if (timer.getSnapshot().records.some(eligible))
        await api().backupHistory(timer.getSnapshot());
      const failures: string[] = [];
      const attempted = new Set<string>();
      do {
        for (let record of [...timer.getSnapshot().records]
          .filter(eligible)
          .reverse()) {
          if (attempted.has(record.id)) continue;
          attempted.add(record.id);
          try {
            let receipt: any;
            if (record.sync === "pending") {
              receipt = await api().sync(record);
              timer.markSynced(record.id, receipt);
              record = {
                ...record,
                sync: "synced",
                ...(receipt?.planId
                  ? { syncedPlanId: receipt.planId }
                  : {}),
              };
            }
            const archived = await api().archiveHistory(record);
            timer.mergeCloud([archived], sourceKey);
            // 确认 N 个番茄的多行完成可能部分失败：会话本体已同步，
            // 未成的行号单独提示，可右键 chip 补标或到飞书核对
            const failedRows = receipt?.completion?.failed;
            if (failedRows?.length)
              failures.push(
                `「${
                  parseTitle(record.task.title).name
                }」第 ${failedRows
                  .map((f: any) => f.sequence)
                  .join("、")} 个番茄未能标记完成：${
                  failedRows[0].reason
                }`
              );
          } catch (e: any) {
            failures.push(e.message || "一条专注记录未能同步");
          }
        }
      } while (
        timer
          .getSnapshot()
          .records.some((r) => eligible(r) && !attempted.has(r.id))
      );
      const remote = await api().history();
      if (remote.sourceKey !== sourceKey)
        throw Error("飞书连接已变化，请重新同步");
      timer.mergeCloud(remote.records, sourceKey);
      await refresh();
      if (remote.missing)
        failures.push(
          `还有 ${remote.missing} 条旧专注缺少完整明细，请在原电脑运行新版并同步。`
        );
      notify(
        failures.length
          ? `已同步可处理的成果，仍有待处理项：${failures[0]}`
          : "专注成果已同步，其他电脑同步后即可查看。",
        failures.length ? "error" : "info"
      );
    } catch (e: any) {
      notify(`记录已保存在本机，待同步：${e.message}`, "error");
    } finally {
      syncing.current = false;
      setSyncBusy(false);
    }
  };
  const pendingIds = timer.records
    .filter(
      (r) =>
        !r.cloudSynced &&
        (r.task.source === "local" || r.task.sourceKey === sourceKey)
    )
    .map((r) => `${r.id}:${r.sync}`)
    .join(",");
  // A pending-set change permits one attempt; a failed attempt waits for explicit retry.
  useEffect(() => {
    if (connected && sourceKey) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds, connected, sourceKey]);
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
  // 生成今日番茄：App 内原生走飞书 API，不弹任何外部窗口。
  // 点击后立即进入「连接飞书」阶段文字（乐观首帧），随后由主进程
  // 真实阶段事件推进；generating 锁 + 按钮 disabled 双重防重入
  const generate = () => {
    if (generating || silentGenerating) return;
    if (genMock) {
      // 截图/设计稿 mock：按真实阶段顺序本地推进（无网络、不写任何数据）
      const seq: {
        stage: string;
        done?: number;
        total?: number;
        wait: number;
      }[] = [
        { stage: "connect", wait: 600 },
        { stage: "tasks", wait: 700 },
        { stage: "records", wait: 600 },
        { stage: "plan", wait: 700 },
        { stage: "write", done: 3, total: 8, wait: 700 },
        { stage: "write", done: 8, total: 8, wait: 600 },
        { stage: "verify", wait: 600 },
      ];
      setGenerating(true);
      setGenStage({ stage: "connect" });
      let elapsed = 0;
      const timers = seq.map((s) => {
        const t = setTimeout(() => setGenStage(s), elapsed);
        elapsed += s.wait;
        return t;
      });
      timers.push(
        setTimeout(() => {
          setGenerating(false);
          setGenStage(null);
          notify("模拟生成完成（截图 mock，未连接飞书）。");
        }, elapsed)
      );
      return;
    }
    if (!api() || !connected) {
      notify("请先在设置中连接飞书，再生成今日番茄。", "error");
      return;
    }
    // 当天已生成过（今日计划行非空）：后台静默重跑——不弹进度、不锁界面，
    // 安静合并飞书变化；仅真实新增时轻提示，无变化不打扰。
    if (shouldGenerateSilently(todayCount)) {
      setSilentGenerating(true);
      (async () => {
        try {
          const r = await api().generateToday();
          await refresh();
          const notice = silentGenerateNotice(r);
          if (notice) notify(notice);
        } catch (e: any) {
          notify(e.message || "后台更新今日番茄失败，请稍后重试", "error");
        } finally {
          setSilentGenerating(false);
        }
      })();
      return;
    }
    setGenerating(true);
    setGenStage({ stage: "connect" });
    run(async () => {
      try {
        const r = await api().generateToday();
        const parts = [
          r.created > 0
            ? `已生成 ${r.created} 个今日番茄`
            : r.eligibleTasks === 0
            ? `没有可生成的任务：请${
                r.planningMode === "recent"
                  ? "勾选近日行动或将任务计划日设为今天"
                  : "将任务计划日设为今天"
              }并填写今日计划番茄数（已完成或放弃的任务不生成）`
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
        setGenStage(null);
      }
    });
  };
  // 悬浮 ± 临时调整：乐观更新 UI，写飞书失败按本地快照回滚并报错
  const adjust = (taskId: string, delta: 1 | -1) => {
    if (!api() || !connected) {
      notify("请先在设置中连接飞书，再调整番茄数。", "error");
      return;
    }
    if (completionQueue.entries.some(e => e.sourceKey === sourceKey && e.task.taskId === taskId && e.state !== "done")) {
      notify("该任务还有待同步的完成标记，请同步后再调整番茄数；其他番茄仍可继续标记。", "error");
      return;
    }
    const group = groupTasks(boardTasks).find((g) => g.key === taskId);
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
  // Accept many clicks immediately; durable per-row intent is independent of
  // the existing serialized Feishu write/readback and history synchronization.
  const queueReady = useRef(false);
  queueReady.current =
    connected &&
    !!sourceKey &&
    !adjusting &&
    !generating &&
    !syncBusy &&
    !busy;
  useEffect(() => {
    if (
      !sourceKey ||
      !queueReady.current ||
      completionQueue.running ||
      !completionQueue.entries.some(
        (e) => e.sourceKey === sourceKey && e.state === "pending"
      )
    )
      return;
    completionQueue
      .drain(
        sourceKey,
        async (planId) => {
          const status = await api().status();
          if (status.sourceKey !== sourceKey)
            throw Error("飞书连接已改变，请切回原连接后重试。");
          await api().completeToday({ planId });
        },
        () => queueReady.current
      )
      .then(() => {
        // One refresh per drained batch, never one full refresh per click.
        if (
          !completionQueue.entries.some(
            (e) => e.sourceKey === sourceKey && e.state === "pending"
          )
        )
          return refresh();
      })
      .catch((e: any) => notify(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    queueRevision,
    sourceKey,
    connected,
    adjusting,
    generating,
    syncBusy,
    busy,
  ]);
  const completeChip = (task: FocusTask) => {
    if (!api() || !connected || !sourceKey) {
      notify("请先在设置中连接飞书，再标记完成。", "error");
      return;
    }
    if (active?.task.id === task.id) {
      notify("这个番茄正在专注中，请先结束并确认本次专注。", "error");
      return;
    }
    try {
      completionQueue.enqueue(task, sourceKey);
      setSelected((previous) => (previous === task.id ? "" : previous));
    } catch (e: any) {
      notify(e.message, "error");
    }
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
  const nextTask = (() => {
    if (!active || active.task.kind === "free") return null;
    const wanted = parseTitle(active.task.title).pomodoro + 1;
    return (
      boardTasks.find(
        (t) =>
          t.kind !== "done" &&
          t.kind !== "pending" &&
          t.taskId === active.task.taskId &&
          parseTitle(t.title).pomodoro === wanted
      ) || null
    );
  })();
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
          pendingCount={historyPending.length}
          busy={busy}
          canConnect={!!api()}
          localTitle={localTitle}
          hasActive={!!active}
          onConfig={setConfig}
          onSubmit={() =>
            run(async () => {
              if (
                completionQueue.running ||
                completionQueue.entries.some((e) => e.state !== "done")
              )
                throw Error("请先同步完待完成标记，再更换飞书连接。");
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
                  active.task.kind === "free"
                    ? makeFreeTask()
                    : nextTask;
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
              tasks={boardTasks}
              selected={selected}
              onSelect={(id) =>
                setSelected((previous) => (previous === id ? "" : id))
              }
              minutes={minutes}
              onMinutes={setMinutes}
              onBegin={() => {
                // Bind free focus to the current Base, never a future connection.
                beginTask(
                  boardTasks.find(
                    (t) => t.id === selected && t.kind !== "done"
                  ) || makeFreeTask()
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
              completing={""}
            />
          )}
          <HistoryPanel
            records={shownRecords}
            pendingCount={historyPending.length}
            canSync={connected && !!api()}
            syncBusy={syncBusy}
            onSync={() => run(sync)}
            tasks={boardTasks}
            onExport={exportRecords}
            onAddManual={timer.addManual}
            onGenerate={generate}
            generating={generating}
            genStageText={genStageText}
            onRefresh={() => run(refresh)}
            refreshBusy={busy || loadingTasks}
            onWeekGoalMet={(total, goal) => {
              notify(`本周目标达成 🍅（${total}/${goal}）`);
              playTimeUp();
            }}
            {...windowControls}
          />
        </main>
      )}
      {(queued.length > 0 || completionQueue.storageError) && (
        <aside
          className="completion-status"
          role="status"
          aria-label="完成标记同步"
        >
          <span>
            {completionQueue.storageError ||
              `已在本机标记，${queued.length} 个待同步到飞书 · 可继续标记`}
          </span>
          {queueFailed.length > 0 && (
            <>
              <span>
                {queueFailed.length} 个暂未同步：
                {queueFailed[0].task.title} — {queueFailed[0].error}
              </span>
              <button
                onClick={() => {
                  try {
                    if (sourceKey) completionQueue.retry(sourceKey);
                  } catch (e: any) {
                    notify(e.message, "error");
                  }
                }}
              >
                重试未同步项
              </button>
            </>
          )}
        </aside>
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
