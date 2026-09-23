export type FocusQuadrant = "iu" | "inu" | "uni" | "unu";
export type ProjectType =
  | "research"
  | "delivery"
  | "longterm"
  | "software"
  | "personal"
  | "misc";
export type FocusTask = {
  id: string;
  title: string;
  // Optional display metadata, not part of cloud accounting identity.
  description?: string;
  source: "local" | "feishu";
  planId?: string;
  taskId?: string;
  sourceKey?: string;
  quickTask?: { id: string; sequence: number };
  // free=自由番茄；done=今日已全部完成的占位行；pending=± 乐观更新的临时行
  kind?: "free" | "done" | "pending";
  creditedSeconds?: number;
  goalSeconds?: number;
  appliedSessionIds?: string[];
  // 已收 x/y：x=今日已完成番茄，y=今日计划总数（含已完成+待办）
  doneToday?: number;
  plannedToday?: number;
  // iu=重要且紧急 inu=重要不紧急 uni=紧急不重要 unu=不紧急不重要; 缺省=未分类
  quadrant?: FocusQuadrant;
  // Saved with the session; later changes to a project's category do not
  // recolor an existing tomato.
  projectType?: ProjectType;
};
// 主观感受（结束确认页可选填写）：-2 很痛苦 … +2 很愉快。
// 只存本地记录，不上传飞书；旧记录无此字段按未填写处理。
export type Mood = -2 | -1 | 0 | 1 | 2;
export const MOOD_OPTIONS: {
  value: Mood;
  label: string;
  emoji: string;
}[] = [
  { value: -2, label: "很痛苦", emoji: "😣" },
  { value: -1, label: "难受", emoji: "😖" },
  { value: 0, label: "平静", emoji: "😐" },
  { value: 1, label: "愉快", emoji: "🙂" },
  { value: 2, label: "很愉快", emoji: "😄" },
];
export const moodLabel = (mood?: number) =>
  MOOD_OPTIONS.find((o) => o.value === mood)?.label;
// 难受/很痛苦档 = 带刺番茄
export const isSpikyMood = (mood?: number) =>
  mood != null && mood <= -1;
const validMood = (mood: unknown): mood is Mood =>
  Number.isInteger(mood) &&
  (mood as number) >= -2 &&
  (mood as number) <= 2;

export type FocusSession = {
  id: string;
  task: FocusTask;
  startedAt: number;
  endedAt?: number;
  mood?: Mood;
  plannedSeconds: number;
  elapsedSeconds: number;
  acceptedSeconds?: number;
  completedCount?: number;
  status: "active" | "paused" | "review" | "saved";
  recovered?: boolean;
  syncTarget?: "plan";
  syncedPlanId?: string;
  cloudSynced?: boolean;
  revision?: number;
  previousTasks?: FocusTask[];
  completionOwnedPlanIds?: string[];
  segments?: { start: number; end: number }[];
  segmentOpen?: boolean;
  sync: "local" | "pending" | "synced";
};

// Attribution correction before confirmation: preserve the single timing owner.
export function reassignActiveSession(
  session: FocusSession,
  task: FocusTask
): FocusSession {
  if (session.status !== "active" && session.status !== "paused")
    throw Error("只能更换正在进行或已暂停的专注任务");
  if (
    !task?.id ||
    !task.title?.trim() ||
    task.kind === "done" ||
    task.kind === "pending"
  )
    throw Error("请选择可用的任务番茄");
  if (
    session.task.sourceKey &&
    session.task.sourceKey !== task.sourceKey
  )
    throw Error("不能将当前专注改到另一张飞书表");
  return { ...session, task: { ...task } };
}

export function advanceSession(
  session: FocusSession,
  seconds: number,
  at = Date.now()
): FocusSession {
  if (!Number.isFinite(seconds) || seconds < 0)
    throw new Error("Invalid elapsed time");
  if (session.status !== "active") return session;
  const segments = session.segments
    ? session.segments.map((s) => ({ ...s }))
    : undefined;
  if (segments && seconds > 0) {
    const last = segments[segments.length - 1];
    if (session.segmentOpen && last) last.end = at;
    else
      segments.push({
        start: Math.max(
          session.startedAt,
          at - seconds * 1000,
          last?.end || 0
        ),
        end: at,
      });
  }
  return {
    ...session,
    elapsedSeconds: session.elapsedSeconds + seconds,
    ...(segments ? { segments, segmentOpen: true } : {}),
  };
}

export function timeParts(session: FocusSession) {
  return {
    remaining: Math.max(
      0,
      session.plannedSeconds - session.elapsedSeconds
    ),
    base: Math.min(session.plannedSeconds, session.elapsedSeconds),
    overtime: Math.max(
      0,
      session.elapsedSeconds - session.plannedSeconds
    ),
  };
}

export function confirmSession(
  session: FocusSession,
  acceptedSeconds: number,
  completedCount: number,
  mood?: number
): FocusSession {
  if (session.status !== "review")
    throw new Error("Session is not awaiting confirmation");
  if (
    !Number.isFinite(acceptedSeconds) ||
    acceptedSeconds < 0 ||
    acceptedSeconds > Math.ceil(session.elapsedSeconds)
  ) {
    throw new Error("专注时长必须在 0 与本次记录时长之间");
  }
  if (
    !Number.isInteger(completedCount) ||
    completedCount < 0 ||
    completedCount > 100
  ) {
    throw new Error("完成番茄数必须是 0–100 的整数");
  }
  if (mood !== undefined && !validMood(mood)) {
    throw new Error("感受评级必须是 -2 到 2 的整数");
  }
  return {
    ...session,
    acceptedSeconds,
    // 番茄数由 review 屏快选确认（默认值按分钟/番茄时长自动累计）；
    // 原表行的“已完成”勾选仍由 mergePlan 的分钟台账独立推导，与此数无关
    completedCount,
    // 未选感受时不写入该字段（旧记录兼容：缺省即未评）
    ...(mood !== undefined ? { mood: mood as Mood } : {}),
    status: "saved",
    sync: session.task.source === "feishu" ? "pending" : "local",
  };
}

// 结束确认屏「返回继续计时」：review 时尚未写入任何记录，纯状态恢复——
// 回到暂停中的计时状态，保留已积累分钟、暂停历史（segments）与任务；
// endedAt 清掉，再次结束时由 finish 重设
export function returnFromReview(
  session: FocusSession | null
): FocusSession | null {
  if (!session || session.status !== "review") return session;
  const { endedAt, ...rest } = session;
  return { ...rest, status: "paused", segmentOpen: false };
}

export function restoreSession(
  session: FocusSession | null
): FocusSession | null {
  if (!session || session.status === "saved") return null;
  if (
    !session.id ||
    !session.task?.id ||
    !Number.isFinite(session.elapsedSeconds) ||
    session.elapsedSeconds < 0 ||
    !Number.isFinite(session.plannedSeconds) ||
    session.plannedSeconds <= 0
  ) {
    throw new Error("专注记录损坏，请先导出本地数据再恢复");
  }
  return {
    ...session,
    status: session.status === "review" ? "review" : "paused",
    recovered: true,
    segmentOpen: false,
  };
}

export function upsertRecord(
  records: FocusSession[],
  record: FocusSession
) {
  return [record, ...records.filter((r) => r.id !== record.id)];
}
