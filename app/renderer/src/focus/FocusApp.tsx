import React, { useContext, useEffect, useRef, useState } from "react";
import { CounterContext } from "contexts/CounterContext";
import { FocusTask, timeParts } from "./session";
import "./focus.css";

const demo: FocusTask[] = [
  {
    id: "demo-read",
    title: "阅读与整理 · 第 1 个番茄",
    source: "local",
  },
  {
    id: "demo-write",
    title: "完成一段写作 · 第 1 个番茄",
    source: "local",
  },
];
const clock = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
    s % 60
  ).padStart(2, "0")}`;
};
const api = () => (window as any).focusApi;
export default function FocusApp() {
  const timer = useContext(CounterContext);
  const [tasks, setTasks] = useState(demo),
    [selected, setSelected] = useState(demo[0].id);
  const [minutes, setMinutes] = useState(25),
    [compact, setCompact] = useState(false),
    [pinned, setPinned] = useState(true);
  const [tab, setTab] = useState("timer"),
    [connected, setConnected] = useState(false),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState("25"),
    [completed, setCompleted] = useState(0),
    [title, setTitle] = useState("");
  const [config, setConfig] = useState({
    appId: "",
    appSecret: "",
    baseUrl: "",
    planTable: "专注记录",
    dateField: "计划日",
    taskField: "任务",
    completedField: "已完成",
  });
  const syncing = useRef(false);
  const active = timer.active,
    parts = active ? timeParts(active) : null;
  const today = timer.records.filter(
    (r) =>
      new Date(r.startedAt).toDateString() === new Date().toDateString()
  );
  const pending = timer.records.filter((r) => r.sync === "pending");
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e: any) {
      setMessage(e.message || "操作失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (!api()) return;
    const status = await api().status();
    setConnected(status.configured);
    if (status.configured) {
      const rows: FocusTask[] = await api().today();
      setTasks(rows);
      setSelected((previous) =>
        rows.some((t) => t.id === previous)
          ? previous
          : rows[0]?.id || ""
      );
      setMessage(
        rows.length
          ? `已读取今日 ${rows.length} 个待办番茄`
          : "今天没有待办番茄，请在飞书安排后刷新。"
      );
    }
  };
  useEffect(() => {
    run(refresh);
  }, []); // One read at launch; subsequent refreshes are explicit.
  useEffect(() => {
    if (active?.status === "review") {
      setAccepted((Math.floor(timeParts(active).base) / 60).toFixed(2));
      setCompleted(0);
      setTab("timer");
      setCompact(false);
      api()?.windowMode({ compact: false, pinned });
    }
    // Initialize once when entering review; elapsed/pin renders must not reset the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.status]);
  const sync = async () => {
    if (!connected || syncing.current || !api()) return;
    syncing.current = true;
    try {
      for (const record of pending) {
        await api().sync(record);
        timer.markSynced(record.id);
      }
      setMessage("专注记录已同步到飞书。");
    } catch (e: any) {
      setMessage(`记录已保存在本机，待同步：${e.message}`);
    } finally {
      syncing.current = false;
    }
  };
  const pendingIds = pending.map((r) => r.id).join(",");
  // A pending-set change permits one attempt; a failed attempt waits for explicit retry.
  useEffect(() => {
    if (pendingIds && connected) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds, connected]);
  const windowMode = (small: boolean, pin: boolean) => {
    setCompact(small);
    setPinned(pin);
    api()?.windowMode({ compact: small, pinned: pin });
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
  const actions = (
    <div className="actions">
      {!active ? (
        <button
          className="primary"
          disabled={busy || !selected || timer.blocked}
          onClick={() => {
            setMessage("");
            timer.begin(tasks.find((t) => t.id === selected)!, minutes);
          }}
        >
          开始专注
        </button>
      ) : (
        active.status !== "review" && (
          <>
            <button
              className="primary"
              onClick={
                active.status === "active" ? timer.pause : timer.resume
              }
            >
              {active.status === "active" ? "暂停" : "继续专注"}
            </button>
            <button className="outline" onClick={timer.finish}>
              结束
            </button>
          </>
        )
      )}
    </div>
  );
  const shownTime = parts?.overtime
    ? `+${clock(parts.overtime)}`
    : clock(
        timer.restSeconds || (active ? parts!.remaining : minutes * 60)
      );
  return (
    <div className={`focus-app ${compact ? "compact" : ""}`}>
      <header className="titlebar">
        <span>
          ◷ <b>Pomatez Focus</b>
        </span>
        <div>
          <button
            title={pinned ? "取消置顶" : "置顶"}
            aria-label="置顶"
            aria-pressed={pinned}
            className={pinned ? "selected" : ""}
            onClick={() => windowMode(compact, !pinned)}
          >
            ⌖
          </button>
          <button
            title={compact ? "展开" : "小窗"}
            aria-label="切换小窗"
            onClick={() => windowMode(!compact, pinned)}
          >
            {compact ? "↗" : "↙"}
          </button>
          <button title="最小化" onClick={() => api()?.minimize()}>
            −
          </button>
          <button title="收起到托盘" onClick={() => api()?.hide()}>
            ×
          </button>
        </div>
      </header>
      {compact ? (
        <main className="mini">
          <div className="mini-task">
            {active?.task.title ||
              tasks.find((t) => t.id === selected)?.title ||
              "请选择番茄"}
          </div>
          <div className="mini-row">
            <strong>{shownTime}</strong>
            {actions}
          </div>
          <small>
            {active?.status === "paused"
              ? "已暂停"
              : parts?.overtime
              ? "额外时间 · 结束时确认"
              : "专注于当下这一件事"}
          </small>
          {active?.status === "review" && (
            <button onClick={() => windowMode(false, pinned)}>
              展开并确认
            </button>
          )}
        </main>
      ) : (
        <>
          <nav>
            {[
              ["timer", "番茄专注"],
              ["records", "专注记录"],
              ["settings", "飞书连接"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? "current" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <main className="content">
            {tab === "timer" && (
              <section className="timer-page">
                <div className="task-picker">
                  <select
                    aria-label="选择番茄"
                    disabled={!!active}
                    value={active?.task.id || selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {active ? (
                      <option value={active.task.id}>
                        {active.task.title}
                      </option>
                    ) : tasks.length ? (
                      tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))
                    ) : (
                      <option value="">今天没有待办番茄</option>
                    )}
                  </select>
                  <button
                    disabled={busy || !!active}
                    title="刷新今日番茄"
                    onClick={() => run(refresh)}
                  >
                    ↻
                  </button>
                </div>
                <div className="dial">
                  <svg viewBox="0 0 260 260" aria-hidden="true">
                    <circle
                      className="track"
                      cx="130"
                      cy="130"
                      r="116"
                    />
                    <circle
                      className="progress"
                      cx="130"
                      cy="130"
                      r="116"
                      strokeDasharray="729"
                      strokeDashoffset={
                        729 *
                        (1 -
                          Math.min(
                            1,
                            (active?.elapsedSeconds || 0) /
                              (active?.plannedSeconds || 1500)
                          ))
                      }
                    />
                  </svg>
                  <div>
                    <span className="time" data-testid="time">
                      {shownTime}
                    </span>
                    <small>
                      {timer.restSeconds
                        ? "休息中"
                        : active?.status === "paused"
                        ? "已暂停"
                        : active?.status === "review"
                        ? "本次专注已结束"
                        : parts?.overtime
                        ? "额外时间 · 等待你确认"
                        : "专注于当下"}
                    </small>
                  </div>
                </div>
                {!active && (
                  <label className="duration">
                    番茄时长{" "}
                    <input
                      aria-label="番茄时长"
                      type="number"
                      min="1"
                      max="180"
                      value={minutes}
                      onChange={(e) =>
                        setMinutes(Number(e.target.value))
                      }
                    />{" "}
                    分钟
                  </label>
                )}
                {actions}
                {active?.status === "review" && (
                  <section className="review">
                    <h2>确认这次专注</h2>
                    <p>
                      基础 {clock(parts!.base)} · 额外{" "}
                      {clock(parts!.overtime)}
                    </p>
                    <div className="choices">
                      <button
                        onClick={() =>
                          setAccepted(
                            (Math.floor(parts!.base) / 60).toFixed(2)
                          )
                        }
                      >
                        只计基础时间
                      </button>
                      <button
                        onClick={() =>
                          setAccepted(
                            (
                              Math.floor(active.elapsedSeconds) / 60
                            ).toFixed(2)
                          )
                        }
                      >
                        额外时间也计入
                      </button>
                    </div>
                    <div className="fields">
                      <label>
                        实际专注（分钟）
                        <input
                          aria-label="实际专注分钟"
                          type="number"
                          min="0"
                          step="0.01"
                          value={accepted}
                          onChange={(e) => setAccepted(e.target.value)}
                        />
                      </label>
                      <label>
                        完成番茄数
                        <input
                          aria-label="完成番茄数"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={completed}
                          onChange={(e) =>
                            setCompleted(Number(e.target.value))
                          }
                        />
                      </label>
                    </div>
                    <button
                      className="primary"
                      onClick={() => {
                        setMessage("");
                        timer.confirm(
                          Math.round(Number(accepted) * 60),
                          completed
                        );
                      }}
                    >
                      保存专注记录
                    </button>
                    <small>
                      完成数由你确认；不会自动勾选飞书任务。
                    </small>
                  </section>
                )}
                {!active && timer.records.length > 0 && (
                  <button
                    className="text-button"
                    onClick={timer.startBreak}
                  >
                    休息 5 分钟
                  </button>
                )}
                <div className="overview">
                  <div>
                    <strong>
                      {today.reduce(
                        (s, r) => s + (r.completedCount || 0),
                        0
                      )}
                    </strong>
                    <small>今日番茄</small>
                  </div>
                  <div>
                    <strong>
                      {Math.round(
                        today.reduce(
                          (s, r) => s + (r.acceptedSeconds || 0),
                          0
                        ) / 60
                      )}{" "}
                      <em>m</em>
                    </strong>
                    <small>今日专注时长</small>
                  </div>
                </div>
              </section>
            )}
            {tab === "records" && (
              <section>
                <div className="section-title">
                  <h1>专注记录</h1>
                  <button onClick={exportRecords}>导出</button>
                </div>
                {pending.length > 0 && (
                  <button
                    className="outline"
                    disabled={busy || !connected}
                    onClick={() => run(sync)}
                  >
                    重试同步 {pending.length} 条记录
                  </button>
                )}
                {!timer.records.length && (
                  <p className="empty">
                    从第一个番茄开始，留下你的专注记录。
                  </p>
                )}
                <ol className="records">
                  {timer.records.map((r) => (
                    <li key={r.id}>
                      <span className="record-dot">◷</span>
                      <div>
                        <h3>{r.task.title}</h3>
                        <p>
                          {new Date(r.startedAt).toLocaleString()} —{" "}
                          {r.endedAt &&
                            new Date(r.endedAt).toLocaleTimeString()}
                        </p>
                        <small>
                          完成 {r.completedCount} 个 ·{" "}
                          {r.sync === "synced"
                            ? "已同步飞书"
                            : r.sync === "pending"
                            ? "待同步"
                            : "本地记录"}
                        </small>
                      </div>
                      <strong>
                        {((r.acceptedSeconds || 0) / 60).toFixed(1)}{" "}
                        <em>m</em>
                      </strong>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {tab === "settings" && (
              <section className="settings">
                <h1>飞书连接</h1>
                <p>
                  {connected
                    ? "已连接。专注记录会在你确认后同步。"
                    : "连接你的多维表格，读取今天计划的番茄。"}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      await api().configure(config);
                      setConfig({ ...config, appSecret: "" });
                      await refresh();
                    });
                  }}
                >
                  {[
                    ["appId", "应用 App ID"],
                    ["appSecret", "应用 App Secret"],
                    ["baseUrl", "多维表格或知识库链接"],
                    ["planTable", "番茄计划表"],
                    ["dateField", "计划日期字段"],
                    ["taskField", "关联任务字段"],
                    ["completedField", "完成勾选字段"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        required
                        type={key === "appSecret" ? "password" : "text"}
                        autoComplete="off"
                        value={(config as any)[key]}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            [key]: e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                  <button className="primary" disabled={busy || !api()}>
                    连接并读取
                  </button>
                </form>
                <p className="hint">
                  凭证只在本机系统加密存储。将创建“专注会话”表，记录会话
                  ID、任务、起止时间、实际分钟与完成数。原计划和任务勾选不变。
                </p>
                <button
                  className="outline"
                  disabled={busy || !connected}
                  onClick={() =>
                    run(async () => {
                      await api().setup();
                      setMessage(
                        "专注会话表已就绪，可在飞书添加统计看板。"
                      );
                    })
                  }
                >
                  初始化专注会话表
                </button>
                <h2>本地番茄</h2>
                <div className="task-picker">
                  <input
                    placeholder="输入任务名称"
                    aria-label="本地任务名称"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <button
                    disabled={!title.trim() || !!active}
                    onClick={() => {
                      const t: FocusTask = {
                        id: crypto.randomUUID(),
                        title: title.trim(),
                        source: "local",
                      };
                      setTasks([...tasks, t]);
                      setSelected(t.id);
                      setTitle("");
                      setTab("timer");
                    }}
                  >
                    添加
                  </button>
                </div>
                <button className="text-button" onClick={exportRecords}>
                  导出本地专注记录
                </button>
              </section>
            )}
          </main>
          <div className="notice" role="status">
            {timer.error ||
              (active && timer.notice) ||
              message ||
              timer.notice ||
              (connected ? "飞书已连接" : "本地模式 · 随时开始专注")}
          </div>
        </>
      )}
    </div>
  );
}
