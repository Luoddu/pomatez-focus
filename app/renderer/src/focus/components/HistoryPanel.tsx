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

const dayLabel = (value: number) => {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "今天";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return date.toLocaleDateString();
};
const syncText = (record: FocusSession) =>
  record.sync === "synced"
    ? record.syncTarget === "plan"
      ? "已同步飞书原番茄表"
      : "已同步飞书会话表"
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
  return (
    <div className="right-col">
      <div className="side-section">
        <div className="side-title">
          概览
          <span className="side-title-actions">
            <button
              className="btn-text gen-btn"
              disabled={refreshBusy || generating}
              onClick={onGenerate}
            >
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
              title={!canSync ? "请先连接飞书" : pendingCount ? `同步 ${pendingCount} 条待同步记录` : "没有待同步记录"}
              disabled={!canSync || syncBusy || pendingCount === 0}
              onClick={onSync}
            >
              {syncBusy ? "同步中…" : `手动同步${pendingCount ? ` (${pendingCount})` : ""}`}
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
          {!records.length && (
            <p className="empty">
              从第一个番茄开始，留下你的专注记录。
            </p>
          )}
          {groups.map((group) => (
            <section className="record-day" key={group.date}>
              <h4>{group.date}</h4>
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
                      <LogoIcon size={14} tone={QUADRANT_TONES[q]} />
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
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
