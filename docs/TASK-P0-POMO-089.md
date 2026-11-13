# P0-POMO-089 严格督促与开源拦截薄适配

- REVIEW（集成及隔离验收通过，待固定包/发布/个人更新回读）；owner/root；本模块本卡为唯一状态源。基线4b550bd46f3074f07c5b1f9483eb019b1194d282，task/p0-pomo-089-strict-supervision；用户选择免费开源Focuser模块接入农场。目标：游戏持续拦截；周一至周五12有效番茄后B站与小红书合计实际用时最多15分钟，完成后仍不能关闭督促；22:59提醒保存工作、23:00收工。不声称能替所有应用保存文件。
- 用户续令：完成接入和全部测试后更新App，不停在基础模块。CP1=dcb14871c8d85962f9d70c0d33c26944bec15442。继续完成下述写集内集成；发布/准备本地更新沿已有授权。更新App不能作为关闭其他工作应用的授权；个人进程不用于测试。产品内新增严格模式与配套请求权限会明确呈现启用状态，未完成链路不显示已生效。
- 精确补充写集：activitywatch.ts仅投影现有watcher已确认时间水位，用于保守放行截止，不新增计时源；对应既有浏览器测试mock随新增storage.local接口更新。Windows进程调用使用系统PowerShell/.NET Process公开接口，不装运行时；只在自有fixture验证终止。浏览器配套源码新增DNR block权限，个人浏览器实际重新加载在验证交付阶段执行，不能把源码权限声明当成运行生效。
- 收口写集补充：scripts/build-focus.cjs随包保留Focuser许可证；Learning.md由本模块owner单写已验证DNR入口类型教训，不写根Learning；自定义具体游戏目录选择是明确用户动作，拒绝宽泛根/系统及农场目录。其他浏览器、未知下载镜像和强制杀死农场的系统对抗不冒充覆盖。
- 四源预检：①dailyFocusLock.ts目前完成后解除策略锁、临时放行按墙钟且可重复；browserControl/background.js失联放行，不能证明严格900秒；游戏未接入。②Focuser v0.11.5固定commit14cbfdb3d55d3bc669bc9a39a6eddb9915e61844，MIT；closing.rs:22-106先关闭窗口、30秒后终止，process.rs:21-36排除系统PID及自身，blocker.rs:95-176整套引擎还写hosts和关闭浏览器；原文件冻结到忽略artifacts并记录SHA。③复用AW唯一计时、现有native messaging与每日锁；Learning中异步恢复/租约失联行为直接适用。④既有daily-focus-lock、browser-control、control-lease及desktop测试；新增适配模块必须测试误匹配、PID复用和正常工作应用。
- 范围：T1本地源码、离线及隔离fixture测试；系统部署另有Gate。写集docs/TASK-P0-POMO-089.md、docs/ACCEPTANCE-P0-POMO-089.md、docs/STRICT-SUPERVISION.md、third-party/focuser/许可证与来源清单；app/electron/src/focus/strict-supervision/新模块及必要dailyFocusLock/browserControl/nativeBrowserHost/main/preload接口；browser-control扩展资产、ScientificRest界面与类型、对应tests/scripts测试、CHANGELOG及版本helper输出。私有artifacts仅最小公开上游原文快照与合成验收，不放个人数据。未审查上游代码不执行。
- 复用决策：不嵌入Focuser整套SQLite/Allowance/Pomodoro引擎，避免第二额度源；优先移植可分离匹配和关闭模块，保留MIT。Windows无cargo，首次PoC先在现有TS/Node运行时移植纯策略，进程动作注入并用自有fixture验证；不得因此未经验证声称系统拦截已实现。对上游改变须逐项记录维护/退出成本。无新增付费或后台服务。
- 明确禁止：本轮测试关闭个人进程、自动重启App、改hosts/防火墙/系统服务/浏览器注册、安装编译器或扩大扩展权限；不改根共享文件、飞书数据或既有旅程。仅在实现和审查后的具体部署方案上请求必要系统权限，未授权步骤保持未启用。
- 验收正反：游戏程序/目录准确命中，普通编辑器/浏览器和相似目录不命中；目标退出后清理阶段，PID复用不能误杀；工作日12/900规则不能通过设置/重复放行放宽，正常番茄/科研网页及周末原策略仍可用；断线不能悄悄获得娱乐时间；22:59一次提示，正常工作可保存，无自动关机/强制关闭工作软件。完整真实链验收和独立复核后才可宣称启用，纯策略测试不替代。
- 独占资源：本worktree、artifacts/p089与随机测试profile；旧worktree只读。检查点核对status/worktree/远端，路径无冲突为绿灯；未知同因两次停止定位，复发扩大调用链。前台120分钟；超出则保存可审查检查点并报告剩余，不发布未验收行为。授权独立review_local_editing只读复核本任务冻结diff/原文/测试，不能编辑。
- 回滚：恢复本任务源码基线；保持原本地计时/云记录，新增策略默认未激活直至完整验收；新系统动作必须另附可验证恢复方案。Learning每个原子检查点判断，已验证候选由协调者处理；未找到可复用事实须写明理由。默认发布沿模块AGENTS，仅完整验收产物可发布。
