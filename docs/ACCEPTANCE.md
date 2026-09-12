# preview.17 公开源码验收

2026-09-12，Windows x64。本次验证对象为从公开基线 511633f 导出的源码快照，演示任务使用通用名称。不是对未来版本或其他机器的保证。

## 已验证

| 检查 | 结果 | 覆盖 |
| --- | --- | --- |
| `node scripts/build-focus.cjs` | 通过 | Shareables、Electron、preload、React 生产构建 |
| `node --test tests/session.test.mjs tests/feishu.test.cjs tests/plan.test.cjs tests/generate.test.cjs tests/week.test.mjs` | 73/73 | 计时/恢复、飞书响应、原表台账、幂等、冲突、计划生成/完成、周统计 |
| `node scripts/test-desktop.cjs` | 21/21；独立进程重启通过 | 暂停/恢复/超时、保存/放弃、窗口/置顶、历史、导出、受限 IPC |
| Electron 运行 `tests/manual-sync-desktop.cjs` | 4/4 | 补记失败保留、手动重试原记录、忙碌防重复、断连提示 |
| `node scripts/shot-readme.cjs` | 31 处任务标签替换；四张统计卡保留 | 隔离演示页、无真实连接、隐藏窗口、栅格化前去除原文字 |
| 图片人工查看 | 通过 | 主图任务/历史名称不可读，概览、四象限与农场仍可辨；旧 compact/records 图为通用模拟数据 |

本次在独立 worktree 编译修改后的源码，复用已安装的固定版本 node_modules。未声称重新联网安装依赖。桌面测试使用隔离 profile 和隐藏窗口；没有写入真实飞书账户或操作用户运行中的 App。

构建存在旧 Browserslist 数据和 Node 弃用提示，未导致构建失败；逻辑测试有 TypeScript 模块类型提示，全部测试通过。

## 发布与隐私边界

- 只导出当前产品源码、回归测试、品牌图标、去标识说明和打码截图。
- 不导出 design 原始截图、运行配置、凭证、个人记录、临时工具或构建产物。
- 以公开提交为父提交建立新的快进提交；不推送含有未打码截图的本地开发中间提交。
- 公开 README 明确区分 preview.17 源码和 Releases 中的 preview.1 安装包；本次不创建 Release。
- 上游 MIT LICENSE、固定来源和已经公开的上游历史保留。

## 未验证与限制

- 本次没有进行真实飞书账户写入、多设备并发、物理休眠、强制断电、长时间稳定性测试。
- macOS、Linux、Tauri、签名安装包和飞书仪表盘配置不在本次交付范围。
- 原表分钟保留在所选行，确认多个番茄不会把分钟拆到多行；已确认时长累计达到目标也会完成当前行。
- 四象限缺失/未知值目前归入“不紧急不重要”；配置页应核对实际字段，避免误读优先级。

任务边界、四处自检、正反验收与回滚见 [P0-POMO-001](P0-POMO-001.md)。Learning 判断：复用已有导出和隔离提交流程，没有新增可推广的工程教训；不将本次发布状态写入根共享 Learning。
