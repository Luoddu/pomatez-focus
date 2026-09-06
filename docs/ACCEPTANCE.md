# 0.1.0-preview.3 验证范围

## 置顶与应用切换修订

四处预检、故障分类、范围、停止线与回滚见 [模块执行卡](P0-POMO-001.md#screenshottopmost-repair-2026-09-06)。

- 已验证：生产构建、13 项逻辑/API 回归、21 项隐藏 Electron 桌面检查和真实进程重启通过。实际 main/preload/renderer 验证展开态为非置顶，显式请求 expanded+pinned 仍返回 pinned=false；普通对照窗口同为非置顶。紧凑态可置顶、取消和重新置顶；返回展开释放置顶。没有调用 focus/show/showInactive，没有可见测试窗口。
- 已验证：小窗重载读取原生 compact/pinned 状态；保留前次尺寸；今日与历史跨日期汇总正确；确认、放弃、保存、导出和暂停恢复继续通过。
- 已验证：preview.3 Windows portable 打包通过，实际便携启动链在独立隐藏配置中退出码为 0；归档私人路径检查为 0，内置上游 MIT 许可证逐字节一致。便携文件 SHA-256：517fbf9408f1ec86b78643b9942f010eb1e7208cc57ef364a50939df0d199379。
- 已确认原因：旧版大窗口默认置顶会遮住其他普通窗口。与启动应用失败不同，本次从应用窗口策略修复。
- 部分确认：Electron 34.5.8 默认 floating 将窗口排在任务栏之后，并在重新激活时重做此定位；改用官方 pop-up-menu 可绕开这条路径。此前 native frame=false/true 对照都曾在同一桌面会话无法置顶，随后未改代码即恢复并通过 19 项旧版复测。真实 Snipaste 2.11.300.0 Store 包的截图进入/退出链未自动复现，不能把屏幕共享的同类案例当成本机已修复证明。
- 上游证据：[固定版本置顶文档](https://github.com/electron/electron/blob/v34.5.8/docs/api/base-window.md#winsetalwaysontopflag-level-relativelevel)、[固定版本窗口实现](https://github.com/electron/electron/blob/v34.5.8/shell/browser/native_window_views.cc#L1701)、[Windows 屏幕共享后丢失置顶案例](https://github.com/electron/electron/issues/28052)、[Microsoft SetWindowPos](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos)。Snipaste FAQ/CLI 官方 wiki 为当前说明，不是 2.11.300.0 的固定实现源码；本次不调用截图命令、不改 Snipaste 配置、不采集用户桌面。
- 待实际体验：在展开态从任务栏切换其他应用；在置顶小窗中开始/退出 Snipaste 截图后确认小窗仍可保持置顶、Snipaste 可正常操作且键盘焦点不被抢走。pop-up-menu 在 Windows 上高于任务栏，故只用于小窗；小窗若被人为拖到任务栏上可局部遮挡，取消置顶或移动即可。
- Learning-Review: none — 现有官方 API 的本模块策略修正；Snipaste 因果链尚未本机完整验证，不作为已验证通用工程教训。

## preview.2 体验反馈修订（历史验证）

四处预检、基线、范围与回滚见 [模块执行卡](P0-POMO-001.md#preview-feedback-revision-2026-09-06)。

- 已验证：13 项逻辑/API 回归通过；19 项隐藏 Electron 检查与独立进程重启检查通过。放弃未确认会话后 active 为空，已有 records 完全一致，重载不复活被放弃会话；后续正常专注仍能保存并显示正确完成数。
- 已验证：原生窗口有最小化/最大化能力，内容区小于外框；置顶切换不重置尺寸；小窗展开恢复尺寸；最小展开尺寸下左右两栏不横向裁切。未在隐藏测试中调用会强制显示窗口的原生 maximize/minimize，实际点击体验仍由用户检查。
- 已验证：计时与记录同时存在，今日与累计汇总与保存值一致，JSON 导出继续保留全部已存记录。截图使用合成任务；capturePage 只包含网页内容，不包含 Windows 原生标题栏。
- 尺寸检查分类：实际紧凑外框 361×222 DIP，目标 360×220；展开前 1041×801、恢复后 1042×803。固定 Electron 34.5.8 native_window_views.cc:803–860、928–962 显示原生内容/外框约束转换和 Windows caption style 实现；上游 issue #13043 为旧版类似尺寸约束问题，不作为当前版缺陷证明。本次仅将几何测试容差设为 2 DIP，未修改运行时或用窗口补偿补丁。来源：https://github.com/electron/electron/blob/v34.5.8/shell/browser/native_window_views.cc 、https://github.com/electron/electron/issues/13043 。
- Learning-Review: none — 本轮是已确认的产品体验修改；Windows 原生尺寸观测仅适用于当前固定版本和缩放条件，不推广为跨任务通用结论。
- 后续会话限制（14:04）：同一产品构建先通过上述 19 项检查及重启检查；随后仅增强测试夹具的跨日期断言时，运行在初始置顶检查被阻断，重试一次结果相同。最小固定 Electron 34.5.8 对照（frame=false/true、show=false、alwaysOnTop=true）均返回 initial=false，显式解除后再置顶仍 false，均未显示窗口；产品代码和运行时版本没有变化。结论为当前桌面会话/原生窗口边界异常，确切 OS 原因 unknown；未增加产品补丁或删掉置顶断言。新增跨日期断言仍需在正常桌面会话运行。旧版已激活但 accessibility 仅返回空窗格，未强制终止用户进程。原先通过结果不宣称为最后一轮全通过。

以下为首版继承的验证与限制；本轮没有重放真实飞书写入或配置看板。

状态：**部分确认，预览版**。实现者验证不等于独立复核，也不等于用户体验验收。日期：2026-09-06。

## 已验证

- 独立干净 checkout 使用冻结锁文件离线安装并完成生产构建，生成的 renderer 文件名/内容与主工作区一致。
- Windows x64 portable 包构建通过，实际便携启动链在独立配置、隐藏模式下通过页面就绪检查并正常退出。归档检查包含原始 MIT LICENSE，未包含凭证文件、个人导出或迁移助手。

- 固定上游 v1.11.0 基线；Node 24.19.0、Yarn 1.22.22、Electron 34.5.8；生产构建通过。
- 13 项纯逻辑/模拟 API 测试通过：计时到点、暂停、提前结束、超时三种选择、手动完成数、格式校验、今日过滤、断网恢复、重复/并发同步、写入响应丢失后的回读、错误 Base 与冲突拒写。
- 14 项隐藏 Electron 界面/边界检查通过：真实计时循环、内联确认、记录保存、重载恢复、置顶/小窗切换、休眠事件暂停、受限 IPC、无可见测试窗口、无 renderer error。
- 另以两个独立 Electron 进程验证退出再启动：未结束会话恢复为暂停，保留已记录时间，未把关闭间隔计入。
- 受控 Feishu live 验证通过：读取今日未完成计划；创建并核对独立会话表；写入一条明确标注“验收”的合成记录；再次同步回读同一条记录；原计划读取结果前后相同。实际任务、表标识与凭证不纳入公开证据。
- 数字字段可能以字符串返回；空表可省略 items。两种实测响应形状已加入回归。

## 未验证 / 未完成

- 独立用户体验复核、长时间真实使用、操作系统强制断电后的持久性极限。
- 物理电脑休眠实测；现有验证覆盖 Electron powerMonitor 事件与计时中断保护，不等于真的令电脑休眠。
- 飞书图表界面配置。本版提供结构和指南，未把“表已存在”描述为“看板已完成”。
- macOS、Linux、Tauri、多设备并发、签名安装包。

## 验证中的修正与证据边界

隐藏重载测试最初在旧页面卸载前注入数据，被正常的 beforeunload 持久化覆盖。改用固定 Electron Debugger API 的新文档脚本后，单独 A/B 复现确认 CDP Page.enable 是注入生效的前置；测试先启用 Page 再加载夹具，没有为了测试删掉产品的保存逻辑。Windows 当前缩放下窗口高度有 1 DIP 舍入，尺寸检查容许这一误差。

本地凭证迁移助手最初选错 PowerShell 版本。诊断区分了继承的模块路径和 Windows PowerShell 的 Restricted 策略，最终使用已有且允许本地脚本的 PowerShell 7 运行时；未修改任何执行策略或系统权限。此私有迁移助手不随公开项目分发，应用本身无需 PowerShell。

Learning 判断：计时/空表/数字字符串的结论已直接落实为本模块回归和固定版本说明；未将它们推广为所有 SaaS 或所有计时器的通用保证。跨运行时启动的经验作为后续工程候选保留在此，未写入任何宿主项目共享 Learning 或声称已获独立复核。

运行命令见 README；本地测试详细输出位于忽略的 artifacts 目录。此文只保存去标识的检查结论，不能替代重新运行测试。
