# P0-POMO-032 验收与交接

已验证：基线 `aecc8d893137a291b39fa483c41f79e4443a5f61` 上的隔离任务分支 `task/p0-pomo-032-task-interactions`，preview.66。四源/角色/范围/预算记录见 `TASK-P0-POMO-032.md`，未修改真实飞书或用户 profile。

- 减号复用持久 EditQueue，立即投影隐藏指定待办；可连续点击、跨任务点击和同步中开始其他番茄。每个操作固定 record_id、taskId、原日期、序号；冷启动/响应丢失后只核对同一行。后台沿用服务写锁。
- 后端保留对已完成、台账/历史、实际分钟、日期/时段及改动身份的保护。刷新发现已有专注数据时，本地不继续隐藏该行。减少与追加交错时，按快照与尚未收据的唯一行计算数量；追加 token 固定该追加意图，允许已删除序号以新的操作再次使用。
- 新增任务异步读取原任务表「所属项目」关联中的现有项目，沿用「项目类型」颜色。选中的实际 project record_id 写入关联并回读；本地立即带颜色且可专注，回执绑定不重置计时。空归属/项目读取失败仍能添加；未知项目在首次业务写入前拒绝。

验证命令与结果（隐藏窗口、静音、合成数据）：

| 检查 | 结果 |
| --- | --- |
| `npm run test:focus:all` | 233/233 |
| `npm run build:focus` | 通过 |
| `node scripts/test-task-interactions.cjs` | seed/restart 两个真实 Electron 进程通过；连续减、跨任务、追加后减、同步中开始、离线恢复、固定行重试、已有分钟保护、项目本地颜色与云端回执 |
| 核心桌面测试（runner 注入 `--mute-audio`） | 21/21，真实进程重启恢复通过 |
| 竖屏测试（runner 注入 `--mute-audio`） | 14/14 |
| 分类/编辑桌面测试 | 8/8 |
| 快速新增桌面测试（静音隔离） | 12/12 |

原始测试日志位于本机忽略的 artifacts，不上传真实配置或私人截图。专项截图仅为隐藏窗口合成数据，Windows compositor 返回旧帧，未作为视觉完成证据；项目控件、颜色及操作以真实 DOM/IPC 验证。

Learning 判断：复用 LEARN-P1-UI-123-01（含糊结果重试保留同一意图身份），不是新机制或未验证经验；无新候选，不写根 Learning。

限制：飞书不提供此删除流程的 compare-and-swap；跨设备同一行在预检与 DELETE 间发生写入的极短竞态仍需避免。本次保留既有最高序号减法及任务原计数字段不变的语义；不将本地减少转成飞书任务计划数修改。

回滚：独立回滚本任务提交，既有 task/edit/color 队列字段兼容；已发出的飞书减少操作需显式补回，不能靠 Git 回滚业务数据。新客户端识别 remove 队列，未同步操作不应交给旧客户端处理。

已验证发布：源码 `3706c79db60a31d1afbccdb9034c7ba3abaca5ee` 已非强制推送公开主线，标签 `v0.1.0-preview.66` 精确固定同一 commit。干净源码重建/打包通过，包内 `build/source-version.json` 与发布 sidecar 的 SHA/version/dirty=false 一致；安装包隔离隐藏静音 smoke exit 0。

`preview.yml` 指向 preview.66 setup，SHA512 和大小核验通过。GitHub Release 的 setup/portable/blockmap/preview.yml/source-version.json/SHA256SUMS.txt 共六资产全部 uploaded，逐个大小及 SHA256 digest 与本机一致后才公开；isDraft=false、isPrerelease=true，未替换旧版本资产。发布页：<https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.66>。

未安装或重启用户 App。下一步由用户在 App 设置中「检查更新」安装；其他 Windows 电脑可使用同一 Release。发布后的验收文档独立提交，不移动实际构建 tag。
