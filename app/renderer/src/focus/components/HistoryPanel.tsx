import React, { useEffect, useRef, useState } from "react";
import {
  FocusSession,
  FocusTask,
  isSpikyMood,
  moodLabel,
} from "../session";
import {
  tomatoTone,
  harvestTier,
  totalMilestone,
  TOTAL_MILESTONES,
  weekTomatoes,
  flagMarks,
  crossedFlags,
} from "../week";
import {
  WEEK_GOAL_DEFAULT,
  goalFill,
  goalMet,
  goalProgressRatio,
  isValidGoal,
  loadWeekGoals,
  saveWeekGoal,
  weekKeyOf,
} from "../weekgoal";
import { useCountUp } from "../countup";
import {
  LogoIcon,
  WindowControls,
  durationText,
  parseTitle,
  recordTime,
} from "./shared";
import HeatmapCalendar from "./HeatmapCalendar";
import ManualEntry from "./ManualEntry";

const WEEK_CHARS = "日一二三四五六";
const dayLabel = (value: number) => {
  const date = new Date(value);
  const today = new Date();
  const week = `周${WEEK_CHARS[date.getDay()]}`;
  if (date.toDateString() === today.toDateString())
    return `今天 · ${week}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return `昨天 · ${week}`;
  const md = `${date.getMonth() + 1}.${date.getDate()}`;
  const year =
    date.getFullYear() !== today.getFullYear()
      ? `${date.getFullYear()}.`
      : "";
  return `${year}${md} · ${week}`;
};
// 今天空态邀请语：按本地日期做种子，一天内稳定
const TODAY_INVITES = [
  "田里还空着，种一颗 25 分钟的番茄吧 🍅",
  "稻草人等你开工啦 🌾",
  "今日第一颗番茄，就从现在开始 🌱",
  "小种子已备好，点下开始就会发芽 🌱",
  "农夫不忙，田里慌，来种一颗吧 🍅",
  "今天的第一垄地，等你来翻 ✨",
  "泡杯茶，点「开始自由专注」，番茄自己长 🍵",
  "空田不丢人，种下就赢了 🌻",
  "蝴蝶都来了，就差你的第一颗番茄 🦋",
  "攒番茄的好天气，别浪费啦 ☀️",
];
const todayInvite = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / 86400000
  );
  return TODAY_INVITES[
    (now.getFullYear() * 400 + dayOfYear) % TODAY_INVITES.length
  ];
};
// 同步状态 → 圆点 + 文案：绿=已上云、橙=待同步、灰=本地。颜色弱依赖，
// 文案始终完整，色点只是快速扫读锚点
const syncInfo = (
  record: FocusSession
): { cls: string; text: string } => {
  if (record.cloudSynced)
    return { cls: "is-synced", text: "已共享到飞书" };
  if (record.sync === "synced")
    return {
      cls: "is-pending",
      text:
        record.syncTarget === "plan"
          ? "已记账 · 待共享成果"
          : "旧会话已记账 · 待共享成果",
    };
  if (record.sync === "pending")
    return { cls: "is-pending", text: "待同步飞书" };
  return { cls: "is-local", text: "本地记录" };
};

const SyncBadge = ({ record }: { record: FocusSession }) => {
  const { cls, text } = syncInfo(record);
  return (
    <span className={`r-sync ${cls}`}>
      <i className="r-sync-dot" aria-hidden="true" />
      {text}
    </span>
  );
};

// 铅笔小图标：记录行的「修改」入口，悬浮行时浮现
const PencilIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M11.2 2.3a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2L6 12.5l-2.9.7.7-2.9L11.2 2.3Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

// 里程碑小旗：未达成时只改变颜色，旗面始终直立。
const FlagIcon = ({ big }: { raised: boolean; big?: boolean }) => (
  <svg
    width={big ? 12 : 9}
    height={big ? 16 : 13}
    viewBox="0 0 12 16"
    aria-hidden="true"
  >
    <rect
      x="1.1"
      y="1"
      width="1.7"
      height="14"
      rx="0.85"
      fill="currentColor"
    />
    <path d="M2.8 1.6 L10.8 4.1 L2.8 6.7 Z" fill="currentColor" />
  </svg>
);

export default function HistoryPanel({
  records,
  pendingCount,
  canSync,
  syncBusy,
  onSync,
  tasks,
  onAddManual,
  onEdit,
  editingIds = [],
  onGenerate,
  generating,
  genStageText,
  genPercent,
  genFailed,
  refreshBusy,
  pinned,
  settingsOpen,
  onToggleSettings,
  onToggleCompact,
  onTogglePin,
  onWeekGoalMet,
  onOpenStats,
  onMilestone,
}: {
  records: FocusSession[];
  pendingCount: number;
  canSync: boolean;
  syncBusy: boolean;
  onSync: () => void;
  tasks: FocusTask[];
  onAddManual: (record: FocusSession) => void;
  onEdit?: (before: FocusSession, after: FocusSession) => void;
  editingIds?: string[];
  onGenerate: () => void;
  generating: boolean;
  genStageText: string;
  genPercent: number;
  genFailed: boolean;
  refreshBusy: boolean;
  pinned: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onToggleCompact: () => void;
  onTogglePin: () => void;
  onWeekGoalMet?: (total: number, goal: number) => void;
  onOpenStats?: () => void;
  onMilestone?: (milestone: number) => void;
}) {
  const [entryOpen, setEntryOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FocusSession | null>(
    null
  );
  const recordScrollRef = useRef<HTMLDivElement>(null);
  // 周目标：覆盖表（仅按周键），chip 显示本周已收/目标，悬浮开弹窗仅改本周
  const [goals, setGoals] = useState(loadWeekGoals);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalError, setGoalError] = useState("");
  const weekTotal = weekTomatoes(records, Date.now());
  const currentGoal = goals[weekKeyOf(Date.now())] ?? WEEK_GOAL_DEFAULT;
  const weekMet = goalMet(weekTotal, currentGoal);
  // 达成庆祝只在「本会话内由未达成变成达成」时触发一次；
  // 挂载基线已达成（历史达成/重开 App）不重复播报
  const celebratedRef = useRef<string | null>(null);
  useEffect(() => {
    const key = weekKeyOf(Date.now());
    if (celebratedRef.current === null) {
      celebratedRef.current = weekMet ? key : "";
      return;
    }
    if (weekMet && celebratedRef.current !== key) {
      celebratedRef.current = key;
      onWeekGoalMet?.(weekTotal, currentGoal);
    }
  }, [weekMet, weekTotal, currentGoal, onWeekGoalMet]);
  const saveGoal = () => {
    const value = Number(goalInput);
    if (!isValidGoal(value)) {
      setGoalError("请输入 1–350 的整数");
      return;
    }
    setGoals(saveWeekGoal(Date.now(), value));
    setGoalError("");
  };
  const todayRecords = records.filter(
    (r) =>
      new Date(r.startedAt).toDateString() === new Date().toDateString()
  );
  const sum = (
    list: FocusSession[],
    pick: (r: FocusSession) => number
  ) => list.reduce((total, r) => total + (pick(r) || 0), 0);
  // 保存番茄后概览数字 count-up 滚动到新值（纯展示层，减动效时跳变）
  const shownTodayTomatoes = useCountUp(
    sum(todayRecords, (r) => r.completedCount || 0)
  );
  const shownTodaySeconds = useCountUp(
    sum(todayRecords, (r) => r.acceptedSeconds || 0)
  );
  const shownWeekTotal = useCountUp(weekTotal);
  const totalTomatoes = sum(records, (r) => r.completedCount || 0);
  const todayTier = harvestTier(shownTodayTomatoes);
  // 里程碑按上一个成果到下一档计进度。
  const totalMs = totalMilestone(totalTomatoes);
  const totalDone =
    totalMs.reached >= TOTAL_MILESTONES[TOTAL_MILESTONES.length - 1];
  const totalProgress = totalDone
    ? 100
    : Math.min(
        100,
        Math.round(
          ((totalTomatoes - totalMs.reached) /
            (totalMs.next - totalMs.reached)) *
            1000
        ) / 10
      );
  const flags = flagMarks(totalMs.next).filter(
    (m) => m > totalMs.reached
  );
  // 越过里程碑：本会话内从 below 到 ≥ 时旗子弹起一次并通知；挂载基线不补播
  const [justRaised, setJustRaised] = useState<number | null>(null);
  const milestoneBase = useRef<number | null>(null);
  useEffect(() => {
    if (milestoneBase.current === null) {
      milestoneBase.current = totalTomatoes;
      return;
    }
    const prev = milestoneBase.current;
    milestoneBase.current = totalTomatoes;
    const crossed = crossedFlags(prev, totalTomatoes);
    if (!crossed.length) return;
    const top = crossed[crossed.length - 1];
    setJustRaised(top);
    onMilestone?.(top);
    const t = setTimeout(() => setJustRaised(null), 900);
    return () => clearTimeout(t);
    // flags/next 由 totalTomatoes 派生，只需盯总数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalTomatoes]);
  const stats: {
    label: string;
    value: string;
    tier?: string;
  }[] = [
    {
      label: "今日番茄",
      value: String(shownTodayTomatoes),
      tier: todayTier,
    },
    { label: "今日专注时长", value: durationText(shownTodaySeconds) },
    { label: "总番茄", value: String(totalTomatoes) },
    {
      label: "总专注时长",
      value: durationText(sum(records, (r) => r.acceptedSeconds || 0)),
    },
  ];
  const groups = records
    .slice()
    .sort((a, b) => b.startedAt - a.startedAt)
    .reduce((result, record) => {
      const label = dayLabel(record.startedAt);
      const group = result.find((item) => item.date === label);
      if (group) group.records.push(record);
      else result.push({ date: label, records: [record] });
      return result;
    }, [] as { date: string; records: FocusSession[] }[]);
  // 今天永远在最前，即使还没有任何记录
  const todayKey = dayLabel(Date.now());
  if (!groups.length || groups[0].date !== todayKey)
    groups.unshift({ date: todayKey, records: [] });
  // 历史在左、今天在右；默认定位到最右，继续翻旧记录时不强行拉回。
  const latestDay = groups[0]?.date;
  useEffect(() => {
    const alignLatest = () => {
      const el = recordScrollRef.current;
      if (el) el.scrollLeft = el.scrollWidth - el.clientWidth;
    };
    alignLatest();
    window.addEventListener("resize", alignLatest);
    return () => window.removeEventListener("resize", alignLatest);
  }, [groups.length, latestDay]);
  return (
    <div className="right-col">
      <div className="side-section">
        <div className="side-title">
          概览
          <span className="side-title-actions">
            {onOpenStats && (
              <button
                className="btn-text overview-action"
                aria-label="专注统计"
                title="周 / 月 / 季 / 年统计与时段热力"
                onClick={onOpenStats}
              >
                统计
              </button>
            )}
            {/* Same compact feedback for both foreground and background work. */}
            <button
              className={`btn-text gen-btn overview-action${
                generating ? " busy" : ""
              }${genFailed ? " failed" : ""}${
                genPercent === 100 ? " complete" : ""
              }`}
              aria-label="生成今日番茄"
              title={
                genStageText
                  ? `${genStageText}${
                      generating
                        ? "（按步骤估算进度，非耗时百分比）"
                        : ""
                    }`
                  : "生成今日番茄并刷新任务"
              }
              disabled={refreshBusy || generating}
              onClick={onGenerate}
            >
              <span
                className="gen-label"
                aria-live="polite"
                aria-atomic="true"
              >
                {genStageText || "生成今日番茄"}
              </span>
              {genStageText && (
                <span
                  className="gen-track"
                  role={generating ? "progressbar" : undefined}
                  aria-label="今日番茄步骤进度"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={genPercent}
                  aria-valuetext={`${genStageText}，步骤估算 ${genPercent}%`}
                >
                  <span
                    className="gen-fill"
                    style={{
                      width: `${genFailed ? 100 : genPercent}%`,
                    }}
                  />
                </span>
              )}
            </button>
          </span>
          <WindowControls
            pinned={pinned}
            settingsOpen={settingsOpen}
            onToggleSettings={onToggleSettings}
            onToggleCompact={onToggleCompact}
            onTogglePin={onTogglePin}
          />
        </div>
        <div className="stat-grid">
          {stats.map(({ label, value, tier }) => (
            <div className="card stat" key={label} data-stat={label}>
              <strong
                key={tier || "base"}
                className={value.length > 6 ? "long" : ""}
                data-tier={tier || undefined}
              >
                {value}
              </strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {/* 上一个已达成果 → 下一档，实时值贴着进度端点。 */}
        <div
          className="card stat-totalbar"
          title={`总番茄 ${totalTomatoes} 个的成就进度`}
        >
          <span className="stb-from">{totalMs.reached}</span>
          <div className="stb-main">
            <div className="stb-track" aria-hidden="true">
              <i style={{ width: `${totalProgress}%` }} />
              <span
                className={`stb-current${
                  totalProgress <= 4
                    ? " at-start"
                    : totalProgress >= 96
                    ? " at-end"
                    : ""
                }`}
                style={{ left: `${totalProgress}%` }}
              >
                {totalTomatoes}
              </span>
              {flags.map((m) => (
                <span
                  key={m}
                  className={`ms-flag${
                    totalTomatoes >= m ? " raised" : ""
                  }${justRaised === m ? " just-raised" : ""}`}
                  style={{
                    left: `${
                      ((m - totalMs.reached) /
                        (totalMs.next - totalMs.reached)) *
                      100
                    }%`,
                  }}
                  title={`${m} 个番茄`}
                >
                  <FlagIcon raised={totalTomatoes >= m} />
                </span>
              ))}
              <span
                className={`ms-flag big${
                  totalDone || totalTomatoes >= totalMs.next
                    ? " raised"
                    : ""
                }${justRaised === totalMs.next ? " just-raised" : ""}`}
                style={{ left: "100%" }}
                title={`${totalMs.next} 个番茄（终点）`}
              >
                <FlagIcon
                  raised={totalDone || totalTomatoes >= totalMs.next}
                  big
                />
              </span>
            </div>
          </div>
          <span className="stb-to">{totalMs.next}</span>
        </div>
      </div>
      <div className="side-section">
        <div className="side-title">
          番茄月历
          <span
            className="weekgoal"
            onMouseEnter={() => {
              setGoalInput(String(currentGoal));
              setGoalError("");
              setGoalOpen(true);
            }}
            onMouseLeave={() => {
              setGoalOpen(false);
              setGoalError("");
            }}
          >
            <button
              type="button"
              className={`weekgoal-chip${weekMet ? " met" : ""}`}
              aria-label="周目标，悬浮设置"
            >
              <span
                className="wg-fill"
                aria-hidden="true"
                style={{
                  width: `${
                    Math.round(
                      goalProgressRatio(weekTotal, currentGoal) * 1000
                    ) / 10
                  }%`,
                  ...(weekMet
                    ? {}
                    : {
                        background: goalFill(
                          goalProgressRatio(weekTotal, currentGoal)
                        ),
                      }),
                }}
              />
              <span className="wg-text">
                周目标 <span className="wg-now">{shownWeekTotal}</span>/
                <span className="wg-goal">{currentGoal}</span>
              </span>
            </button>
            {goalOpen && (
              <div
                className="weekgoal-pop"
                role="dialog"
                aria-label="设置本周目标"
              >
                <div className="weekgoal-row">
                  <input
                    type="number"
                    min={1}
                    max={350}
                    step={1}
                    value={goalInput}
                    aria-label="本周目标数"
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveGoal();
                    }}
                  />
                  <button
                    type="button"
                    className="btn-small outline"
                    onClick={saveGoal}
                  >
                    保存
                  </button>
                </div>
                {goalError ? (
                  <div className="weekgoal-error" role="alert">
                    {goalError}
                  </div>
                ) : (
                  <div className="weekgoal-hint">
                    仅本周生效，未设置的周默认 {WEEK_GOAL_DEFAULT}
                  </div>
                )}
              </div>
            )}
          </span>
        </div>
        <HeatmapCalendar records={records} goals={goals} />
      </div>
      <div className="side-section records-section">
        <div className="side-title">
          专注积累
          <span className="side-title-actions">
            <button
              className="btn-text"
              onClick={() => setEntryOpen((open) => !open)}
            >
              {entryOpen ? "收起" : "补记"}
            </button>
            <button
              className="btn-text"
              aria-label="手动同步"
              title={
                !canSync
                  ? "请先连接飞书"
                  : pendingCount
                  ? `上传 ${pendingCount} 条待同步记录并获取其他电脑成果`
                  : "获取其他电脑的专注成果"
              }
              disabled={!canSync || syncBusy}
              onClick={onSync}
            >
              {syncBusy
                ? "同步中…"
                : `手动同步${pendingCount ? ` (${pendingCount})` : ""}`}
            </button>
            {/* 「导出」按用户要求隐藏不渲染；导出实现（FocusApp.exportRecords）
                保留，恢复时还原下方按钮即可
            <button className="btn-text" onClick={onExport}>
              导出
            </button>
            */}
          </span>
        </div>
        {entryOpen && (
          <ManualEntry
            tasks={tasks}
            onSave={(record) => {
              onAddManual(record);
              setEntryOpen(false);
            }}
            onCancel={() => setEntryOpen(false)}
          />
        )}
        {editRecord && onEdit && (
          <ManualEntry
            key={editRecord.id}
            initial={editRecord}
            tasks={tasks}
            onSave={(record) => {
              onEdit(editRecord, record);
              setEditRecord(null);
            }}
            onCancel={() => setEditRecord(null)}
          />
        )}
        <div className="card records" ref={recordScrollRef}>
          {groups
            .slice()
            .reverse()
            .map((group) => (
              <section
                className={`record-day${
                  group.date === todayKey ? " is-today" : ""
                }`}
                key={group.date}
              >
                <h4>
                  {group.date}
                  {(() => {
                    const dayCount = group.records.reduce(
                      (total, r) => total + (r.completedCount || 0),
                      0
                    );
                    const tier = harvestTier(dayCount);
                    return (
                      <span
                        className={`day-total${tier ? ` ${tier}` : ""}`}
                      >
                        共 {dayCount} 个番茄
                      </span>
                    );
                  })()}
                </h4>
                {group.records.length === 0 ? (
                  <p className="record-invite">{todayInvite()}</p>
                ) : (
                  <ul className="record-list">
                    {group.records.map((r) => {
                      // 记录圆点按任务象限着色（与番茄园同一取数口径：
                      // 记录里的任务快照，无象限归 free 中性色）
                      const q =
                        r.task?.quadrant === "iu" ||
                        r.task?.quadrant === "inu" ||
                        r.task?.quadrant === "uni" ||
                        r.task?.quadrant === "unu"
                          ? r.task.quadrant
                          : "free";
                      return (
                        <li className="record" key={r.id}>
                          <span
                            className={`r-icon tone-${q}${
                              isSpikyMood(r.mood) ? " spiky" : ""
                            }`}
                            title={
                              r.mood != null
                                ? `本次感受：${moodLabel(r.mood)}`
                                : undefined
                            }
                          >
                            <LogoIcon
                              size={14}
                              tone={tomatoTone(r.task)}
                              spiky={isSpikyMood(r.mood)}
                            />
                          </span>
                          <div className="r-main">
                            <div className="r-line1">
                              <span className="r-time">
                                {recordTime(r.startedAt)} —{" "}
                                {r.endedAt ? recordTime(r.endedAt) : ""}
                              </span>
                              <span className="r-task">
                                {parseTitle(r.task.title).name}
                              </span>
                              <span className="r-dur">
                                {durationText(r.acceptedSeconds || 0)}
                              </span>
                            </div>
                            <div className="r-sub">
                              完成 {r.completedCount} 个 ·{" "}
                              <SyncBadge record={r} />
                              {onEdit && (
                                <button
                                  className="btn-text record-edit"
                                  aria-label={`修改记录 ${r.id}`}
                                  title="修改这条记录"
                                  disabled={editingIds.includes(r.id)}
                                  onClick={() => {
                                    setEntryOpen(false);
                                    setEditRecord(r);
                                  }}
                                >
                                  <PencilIcon />
                                  {editingIds.includes(r.id)
                                    ? "修改待同步"
                                    : "修改"}
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
        </div>
      </div>
    </div>
  );
}
