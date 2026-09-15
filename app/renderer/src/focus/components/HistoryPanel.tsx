import React, { useState } from "react";
import { FocusSession, FocusTask } from "../session";
import { QUADRANT_TONES } from "../week";
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
const syncText = (record: FocusSession) =>
  record.cloudSynced
    ? "已共享到飞书"
    : record.sync === "synced"
    ? record.syncTarget === "plan"
      ? "已记账 · 待共享成果"
      : "旧会话已记账 · 待共享成果"
    : record.sync === "pending"
    ? "待同步飞书"
    : "本地记录";

export default function HistoryPanel({
  records,
  pendingCount,
  canSync,
  syncBusy,
  onSync,
  tasks,
  onExport,
  onAddManual,
  onGenerate,
  generating,
  genStageText,
  onRefresh,
  refreshBusy,
  pinned,
  settingsOpen,
  onToggleSettings,
  onToggleCompact,
  onTogglePin,
}: {
  records: FocusSession[];
  pendingCount: number;
  canSync: boolean;
  syncBusy: boolean;
  onSync: () => void;
  tasks: FocusTask[];
  onExport: () => void;
  onAddManual: (record: FocusSession) => void;
  onGenerate: () => void;
  generating: boolean;
  genStageText: string;
  onRefresh: () => void;
  refreshBusy: boolean;
  pinned: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onToggleCompact: () => void;
  onTogglePin: () => void;
}) {
  const [entryOpen, setEntryOpen] = useState(false);
  const todayRecords = records.filter(
    (r) =>
      new Date(r.startedAt).toDateString() === new Date().toDateString()
  );
  const sum = (
    list: FocusSession[],
    pick: (r: FocusSession) => number
  ) => list.reduce((total, r) => total + (pick(r) || 0), 0);
  const stats: [string, string][] = [
    [
      "今日番茄",
      String(sum(todayRecords, (r) => r.completedCount || 0)),
    ],
    [
      "今日专注时长",
      durationText(sum(todayRecords, (r) => r.acceptedSeconds || 0)),
    ],
    ["总番茄", String(sum(records, (r) => r.completedCount || 0))],
    [
      "总专注时长",
      durationText(sum(records, (r) => r.acceptedSeconds || 0)),
    ],
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
  return (
    <div className="right-col">
      <div className="side-section">
        <div className="side-title">
          概览
          <span className="side-title-actions">
            <button
              className={`btn-text gen-btn${generating ? " busy" : ""}`}
              disabled={refreshBusy || generating}
              onClick={onGenerate}
            >
              {generating && <span className="gen-spinner" aria-hidden="true" />}
              {generating ? "生成中…" : "生成今日番茄"}
            </button>
            <button
              className="ghost-btn refresh-btn"
              title="刷新今日番茄"
              aria-label="刷新今日番茄"
              disabled={refreshBusy}
              onClick={onRefresh}
            >
              ↻
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
        {generating && genStageText && (
          <div className="gen-progress" role="status">
            {genStageText}
          </div>
        )}
        <div className="stat-grid">
          {stats.map(([label, value]) => (
            <div className="card stat" key={label} data-stat={label}>
              <strong className={value.length > 6 ? "long" : ""}>
                {value}
              </strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="side-section">
        <div className="side-title">番茄月历</div>
        <HeatmapCalendar records={records} />
      </div>
      <div className="side-section records-section">
        <div className="side-title">
          专注记录
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
              title={!canSync ? "请先连接飞书" : pendingCount ? `上传 ${pendingCount} 条待同步记录并获取其他电脑成果` : "获取其他电脑的专注成果"}
              disabled={!canSync || syncBusy}
              onClick={onSync}
            >
              {syncBusy
                ? "同步中…"
                : `手动同步${pendingCount ? ` (${pendingCount})` : ""}`}
            </button>
            <button className="btn-text" onClick={onExport}>
              导出
            </button>
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
        <div className="card records">
          {groups.map((group) => (
            <section className="record-day" key={group.date}>
              <h4>
                {group.date}
                <span className="day-total">
                  共{" "}
                  {group.records.reduce(
                    (total, r) => total + (r.completedCount || 0),
                    0
                  )}{" "}
                  个番茄
                </span>
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
                        <span className={`r-icon tone-${q}`}>
                          <LogoIcon
                            size={14}
                            tone={QUADRANT_TONES[q]}
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
                            完成 {r.completedCount} 个 · {syncText(r)}
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
