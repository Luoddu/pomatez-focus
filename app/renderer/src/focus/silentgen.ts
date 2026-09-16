// 「生成今日番茄」的前台/静默分流：当天已有今日计划行（today() 返回非空，
// 行本身按北京日口径由主进程生成/读取）时，再触发改后台静默——不弹进度、
// 不锁界面，安静合并飞书变化；仅真实新增番茄时轻提示，无变化不打扰。
// 首次生成（今日计划为空）逻辑完全不变，仍走前台进度条。

export function shouldGenerateSilently(todayCount: number | null): boolean {
  return typeof todayCount === "number" && todayCount > 0;
}

// 静默生成结果 → 是否打扰用户。created>0 表示有新任务/番茄数增加被合并；
// excess（计划调减）不由生成器删行、看板无可见变化，不通知。
export function silentGenerateNotice(result: {
  created?: number;
}): string | null {
  return (result.created ?? 0) > 0 ? "今日番茄已更新。" : null;
}
