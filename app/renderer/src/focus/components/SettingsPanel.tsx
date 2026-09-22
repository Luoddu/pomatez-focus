import React, { useState } from "react";
import { WindowControls } from "./shared";
import UpdatePanel from "./UpdatePanel";
import { isSoundEnabled, setSoundEnabled, playRestEnd } from "../sound";

export type FocusConfig = {
  appId: string;
  appSecret: string;
  baseUrl: string;
  planTable: string;
  dateField: string;
  taskField: string;
  completedField: string;
  quadrantField: string;
};

const FIELDS: {
  key: keyof FocusConfig;
  label: string;
  full?: boolean;
}[] = [
  { key: "appId", label: "应用 ID" },
  { key: "appSecret", label: "应用 Secret" },
  { key: "baseUrl", label: "多维表格链接", full: true },
  { key: "planTable", label: "计划表名" },
  { key: "dateField", label: "日期字段" },
  { key: "taskField", label: "任务字段" },
  { key: "completedField", label: "完成字段" },
  {
    key: "quadrantField",
    label: "四象限字段（留空自动探测）",
    full: true,
  },
];

export default function SettingsPanel({
  config,
  connected,
  todayCount,
  quadrantField,
  pendingCount,
  busy,
  canConnect,
  localTitle,
  hasActive,
  pinned,
  settingsOpen,
  onConfig,
  onSubmit,
  onSetup,
  onRetrySync,
  onLocalTitle,
  onAddLocal,
  onToggleSettings,
  onToggleCompact,
  onTogglePin,
}: {
  config: FocusConfig;
  connected: boolean;
  todayCount: number | null;
  quadrantField: string | null;
  pendingCount: number;
  busy: boolean;
  canConnect: boolean;
  localTitle: string;
  hasActive: boolean;
  pinned: boolean;
  settingsOpen: boolean;
  onConfig: (config: FocusConfig) => void;
  onSubmit: () => void;
  onSetup: () => void;
  onRetrySync: () => void;
  onLocalTitle: (title: string) => void;
  onAddLocal: () => void;
  onToggleSettings: () => void;
  onToggleCompact: () => void;
  onTogglePin: () => void;
}) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  return (
    <div className="settings-scroll">
      <div className="settings-col">
        <div className="settings-title-row">
          <h1>设置</h1>
          <WindowControls
            pinned={pinned}
            settingsOpen={settingsOpen}
            onToggleSettings={onToggleSettings}
            onToggleCompact={onToggleCompact}
            onTogglePin={onTogglePin}
          />
        </div>
        <UpdatePanel />
        <div className="card settings-card">
          <h3>飞书连接</h3>
          <div className="conn-status">
            <span className={`dot ${connected ? "" : "off"}`} />
            {connected
              ? `已连接 · 今日已读取 ${todayCount ?? 0} 个待办番茄`
              : "未连接 · 本地模式"}
          </div>
          {connected && (
            <div className="conn-sub">
              {quadrantField
                ? `四象限字段已命中「${quadrantField}」`
                : "未在任务表找到四象限单选字段，任务将进入「未分类」"}
            </div>
          )}
          <form
            className="field-grid"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {FIELDS.map(({ key, label, full }) => (
              <div className={`field ${full ? "full" : ""}`} key={key}>
                <label>{label}</label>
                <input
                  required={key !== "quadrantField"}
                  type={key === "appSecret" ? "password" : "text"}
                  autoComplete="off"
                  placeholder={
                    key === "quadrantField"
                      ? "自动识别，也可填写实际字段名"
                      : ""
                  }
                  value={config[key]}
                  onChange={(e) =>
                    onConfig({ ...config, [key]: e.target.value })
                  }
                />
              </div>
            ))}
            <div className="settings-actions">
              <button
                className="btn-primary settings-save"
                disabled={busy || !canConnect}
              >
                保存并测试连接
              </button>
              <button
                type="button"
                className="btn-small outline"
                disabled={busy || !connected || !canConnect}
                onClick={onSetup}
              >
                启用原表专注记录
              </button>
            </div>
          </form>
          <div className="conn-sub">
            凭证只在本机系统加密存储。原番茄表记录实际分钟、专注日期和时间段；
            确认时累计达到目标，会勾选对应番茄的已完成。自由番茄在同一张表新增一行。
          </div>
        </div>
        <div className="card settings-card">
          <h3>同步状态</h3>
          <div className="sync-row">
            <span className="sync-text">待同步 {pendingCount} 条</span>
            <div className="spacer" />
            <button
              className="btn-small outline"
              disabled={busy || !connected || !pendingCount}
              onClick={onRetrySync}
            >
              立即重试
            </button>
          </div>
        </div>
        <div className="card settings-card">
          <h3>提示音</h3>
          <div className="sync-row">
            <span className="sync-text">
              计时到点与休息结束时播放合成提示音
            </span>
            <div className="spacer" />
            <button
              type="button"
              className={`btn-small outline sound-toggle${soundOn ? " on" : ""}`}
              aria-pressed={soundOn}
              onClick={() => {
                const next = !soundOn;
                setSoundEnabled(next);
                setSoundOn(next);
                if (next) playRestEnd();
              }}
            >
              {soundOn ? "已开启" : "已关闭"}
            </button>
          </div>
        </div>
        <div className="card settings-card">
          <h3>本地番茄</h3>
          <div className="sync-row">
            <input
              className="local-input"
              placeholder="输入任务名称"
              aria-label="本地任务名称"
              value={localTitle}
              onChange={(e) => onLocalTitle(e.target.value)}
            />
            <button
              className="btn-small outline"
              disabled={!localTitle.trim() || hasActive}
              onClick={onAddLocal}
            >
              添加
            </button>
          </div>
        </div>
        <div className="card settings-card">
          <h3>关于</h3>
          <div className="about-line">
            版本 <span className="ver">0.1.0-preview.45</span>
            <br />
            基于开源项目 pomatez 二次开发（MIT License，© roldanjr
            及贡献者）
          </div>
        </div>
      </div>
    </div>
  );
}
