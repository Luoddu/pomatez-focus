// 待办番茄 chip 的单行窗口：一个任务的 chip 永不换行，最多渲染 CHIP_WINDOW 个。
// 渲染的本来就是待办序号（已完成的只贡献已收数据），所以窗口语义=
// 「接下来要做的 6 个」；收掉前面的，后面的自动顶入。
// 唯一例外：被选中的 chip（正在/即将专注）必须留在窗内，
// 选中序超出前 6 时窗口整体右滑到刚好包含它。
export const CHIP_WINDOW = 6;

export const chipWindow = (total: number, selectedIndex: number) => {
  let start = 0;
  if (selectedIndex >= CHIP_WINDOW)
    start = Math.min(
      selectedIndex - CHIP_WINDOW + 1,
      Math.max(0, total - CHIP_WINDOW)
    );
  return { start, end: Math.min(total, start + CHIP_WINDOW) };
};
