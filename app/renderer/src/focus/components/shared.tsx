import { FocusQuadrant, FocusTask, MOOD_OPTIONS, Mood } from "../session";
import { mixColor } from "../week";

export const QUADRANTS: {
  key: FocusQuadrant;
  label: string;
  pill: string;
}[] = [
  { key: "iu", label: "重要且紧急", pill: "red" },
  { key: "inu", label: "重要不紧急", pill: "orange" },
  { key: "uni", label: "紧急不重要", pill: "blue" },
  { key: "unu", label: "不紧急不重要", pill: "gray" },
];
export const quadrantMeta = (key?: FocusQuadrant) =>
  QUADRANTS.find((q) => q.key === key);

// “任务名 · 第 N 个番茄”拆分；无序号后缀的本地任务按第 1 个番茄展示
export const parseTitle = (title: string) => {
  const match = title.match(/^(.*?)(?:\s*·\s*|\s+)第\s*(\d+)\s*个番茄\s*$/);
  return match
    ? { name: match[1] || title, pomodoro: Number(match[2]) }
    : { name: title, pomodoro: 1 };
};

// 同一任务（飞书共享 taskId，本地按行 id）聚合为一组番茄
export type TaskGroup = { key: string; name: string; tasks: FocusTask[] };
export const groupTasks = (tasks: FocusTask[]): TaskGroup[] => {
  const groups: TaskGroup[] = [];
  const index = new Map<string, TaskGroup>();
  for (const task of tasks) {
    const key = task.taskId || task.id;
    let group = index.get(key);
    if (!group) {
      group = { key, name: parseTitle(task.title).name, tasks: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.tasks.push(task);
  }
  for (const group of groups)
    group.tasks.sort(
      (a, b) => parseTitle(a.title).pomodoro - parseTitle(b.title).pomodoro
    );
  return groups;
};

export const clock = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
    s % 60
  ).padStart(2, "0")}`;
};
export const durationText = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} 秒`;
  const minutes = Math.floor(total / 60);
  return minutes < 60
    ? `${minutes} 分钟`
    : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
};
export const recordTime = (value: number) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export const api = () => (window as any).focusApi;

// tone 覆盖番茄果体色（象限着色用）；缺省经典番茄红。
// 有 tone 时果体用哑光径向渐变（中心主色→边缘略深，无高光点）；
// 渐变 id 由 tone 派生——同 tone 的多个圆点共享 id，但 stops 完全相同，碰撞无害。
// spiky=带刺番茄：果缘一圈小刺，表示这段专注感受难受/很痛苦
const THORN_ANGLES = [-160, -120, -60, -20, 20, 160];
const thornPath = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  const bx = 12 + Math.cos(a) * 8.2;
  const by = 13.5 + Math.sin(a) * 8.2;
  const tx = 12 + Math.cos(a) * 11.4;
  const ty = 13.5 + Math.sin(a) * 11.4;
  const px = Math.cos(a + Math.PI / 2) * 1.5;
  const py = Math.sin(a + Math.PI / 2) * 1.5;
  return `M${bx + px} ${by + py}L${tx} ${ty}L${bx - px} ${by - py}Z`;
};
export const LogoIcon = ({
  size = 22,
  tone,
  spiky,
}: {
  size?: number;
  tone?: string;
  spiky?: boolean;
}) => {
  const gid = tone ? `logo-tomato-${tone.replace(/[^0-9a-z]/gi, "")}` : "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {tone && (
        <defs>
          <radialGradient id={gid} cx="45%" cy="36%" r="75%">
            <stop offset="0%" stopColor={tone} />
            <stop offset="55%" stopColor={tone} />
            <stop offset="100%" stopColor={mixColor(tone, "#000000", 0.14)} />
          </radialGradient>
        </defs>
      )}
      <circle cx="12" cy="13.5" r="9" fill={tone ? `url(#${gid})` : "#e64545"} />
      {spiky &&
        THORN_ANGLES.map((deg) => (
          <path key={deg} d={thornPath(deg)} fill="#8a5a2b" />
        ))}
      <path
        d="M12 4.5c-1.2-1.6-3-2.2-4.6-1.8.6 1.4 1.8 2.4 3.4 2.8-.8-1-1.2-2.2 1.2-1z"
        fill="#3faf62"
      />
      <path
        d="M12 5.5c.3-1.8 1.5-3 3.2-3.4.2 1.6-.6 3-2 3.8"
        fill="#3faf62"
      />
    </svg>
  );
};

// 主观感受选择（参考 Apple State of Mind）：5 档可选，再点已选取消；
// 不选即跳过，不影响保存
export const MoodPicker = ({
  value,
  onChange,
}: {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}) => (
  <span className="mood-row" role="group" aria-label="本次专注感受">
    {MOOD_OPTIONS.map((o) => (
      <button
        key={o.value}
        type="button"
        className={`mood-btn${value === o.value ? " selected" : ""}`}
        aria-pressed={value === o.value}
        aria-label={`感受：${o.label}`}
        title={o.label}
        onClick={() => onChange(value === o.value ? null : o.value)}
      >
        {o.emoji}
      </button>
    ))}
  </span>
);

export const Ring = ({
  size,
  stroke,
  progress,
  tone = "#4c6fff",
  className = "",
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  tone?: string; // 进度弧颜色：番茄园语境下随任务象限着色
  className?: string;
  children?: React.ReactNode;
}) => {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const shown = Math.min(1, Math.max(0, progress));
  return (
    <div className={`ring ${className}`}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#eceef2"
          strokeWidth={stroke}
        />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * shown).toFixed(1)} ${c.toFixed(1)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
};

// 窗口控制：设置/小窗/置顶，放在各屏标题行右侧（compact 用 MiniView 浮动钮）
export const WindowControls = ({
  pinned,
  settingsOpen,
  onToggleSettings,
  onToggleCompact,
  onTogglePin,
}: {
  pinned: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onToggleCompact: () => void;
  onTogglePin: () => void;
}) => (
  <div className="win-controls">
    <button
      className={`ghost-btn ${settingsOpen ? "selected" : ""}`}
      title={settingsOpen ? "返回" : "设置"}
      aria-label="设置"
      aria-pressed={settingsOpen}
      onClick={onToggleSettings}
    >
      ⚙
    </button>
    <button
      className="ghost-btn"
      title="切换为置顶小窗"
      aria-label="切换小窗"
      onClick={onToggleCompact}
    >
      ↙
    </button>
    <button
      className={`ghost-btn ${pinned ? "selected" : ""}`}
      title={pinned ? "取消置顶" : "切换为置顶小窗"}
      aria-label="置顶"
      aria-pressed={pinned}
      onClick={onTogglePin}
    >
      ⌖
    </button>
  </div>
);
