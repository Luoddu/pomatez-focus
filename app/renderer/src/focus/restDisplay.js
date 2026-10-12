export function durationText(value) {
  const seconds = Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
  return `${Math.floor(seconds / 3600)}小时 ${
    Math.floor(seconds / 60) % 60
  }分钟 ${seconds % 60}秒`;
}
export function clockText(value) {
  const s = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  return `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
export function quotaDisplay(seconds, quotaMinutes) {
  const used = Math.max(0, Number.isFinite(seconds) ? seconds : 0), quota = quotaMinutes * 60;
  const over = used >= quota, excess = Math.max(0, used - quota);
  return { over, ratio: over ? (excess % quota)/quota : Math.max(0,(quota-used)/quota),
    clock: clockText(over ? used : quota-used),
    label: over ? "今日累计" : "剩余额度", excess: clockText(excess), laps: Math.floor(used/quota) };
}
const day = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};
// A short-lived projection for display only. Stored usage and reminder thresholds
// remain the official query result; source heartbeats reconcile this estimate.
export function displayUsage(state, now) {
  const usage = state.usage,
    live = state.live;
  if (
    !usage ||
    state.status !== "recording" ||
    !live ||
    !["bilibili", "xiaohongshu"].includes(live.site) ||
    usage.day !== day(now) ||
    !Number.isFinite(live.estimateFrom) ||
    now < live.checkedAt ||
    now > live.expiresAt ||
    live.expiresAt > live.checkedAt + 7000 ||
    live.estimateFrom < usage.start
  )
    return usage;
  const extra =
    Math.max(0, Math.min(82000, now - live.estimateFrom)) / 1000;
  return {
    ...usage,
    [live.site]: usage[live.site] + extra,
    totalSeconds: usage.totalSeconds + extra,
  };
}
export function monitorDetail(state, now) {
  const live = state.live;
  const lines = [state.message || "正在核对采集状态"];
  if (state.status === "recording" && live) {
    const fresh = now >= live.checkedAt && now <= live.expiresAt;
    lines.push(
      fresh
        ? `监测运行 ${durationText(
            Math.max(0, now - live.startedAt) / 1000
          )}`
        : "信号等待中 · 暂停实时估算"
    );
    lines.push(
      `最近检测 ${new Date(live.checkedAt).toLocaleTimeString("zh-CN", {
        hour12: false,
      })}`
    );
    lines.push(live.detail);
    lines.push(
      live.site
        ? `当前：${live.site === "bilibili" ? "B站" : "小红书"}`
        : "当前未计入网站用时"
    );
    lines.push("秒数含心跳间隔内估算，收到记录后校准");
  } else if (state.updatedAt) {
    lines.push(
      `最后核对 ${new Date(state.updatedAt).toLocaleTimeString(
        "zh-CN",
        { hour12: false }
      )}`
    );
  }
  return lines.join("\n");
}
