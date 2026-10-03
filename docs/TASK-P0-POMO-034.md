# P0-POMO-034 分类色点与稻草人气泡

- REVIEW；角色/上下文负责人：隔离模块实现者 Codex，状态源本卡。用户要求补记分类色点、取消常驻伙伴横栏、点稻草人对话、早晨及22/23点短暂主动提醒；沿用 Windows Release 发布授权。
- 基线 def621e2b5d15450fbfcde3f6ff8edff1d15e56b；origin/codex/feishu-focus 实时 fetch/check:sync 一致、工作树干净，preview.67。独占 task/p0-pomo-034-scarecrow-bubble 及独立合成测试 profile；旧 worktree 无重叠活动修改证据，绿灯。
- 目标：颜色与已有分类一致；默认农田零额外占位、SVG稻草人支持点击/键盘；浮动气泡与本地优先日记；同连接当天澄留言读回后短暂提示；08:00–09:30早安、22/23点分开提醒，每日每段最多一次、不发声。非目标：真实澄接入、外部AI、后台服务、新身份或飞书拓扑、自动安装用户App。
- 允许写：ManualEntry/新分类选择组件、FarmField/FarmCompanion、wellbeing与focus.css；命中合成tests；本卡、验收、FARM-COMPANION、CHANGELOG与版本文件。禁止根共享控制面、真实凭证/任务/用户运行目录/用户App控制、新依赖、后台轮询或根跨组件写入。
- 必须加载模块AGENTS、本卡、相关组件/分类/日记源码及测试；根version-control、how-to-dispatch、context-loading命中原文已载入。条件加载第三方运行语义，不加载身份配置、根完整路线图。身份/跨组件/外部副作用冲突只暂停冲突步骤升级。
- 四源①当前：补记native select无色点，伙伴横栏常驻；SVG稻草人不可点击，60秒时钟已有focus/visibility刷新。②官方：固定现有React16.14.0合成事件回收源码见下，不安装/升级依赖；Electron/飞书关键运行语义不变，本轮无额外采用Gate。③复用分类PROJECT_TONES、journalTail/UUID/本地持久、已有时间分区，Learning LEARN-P1-UI-123-01。④复用companion-desktop、category-review、wellbeing-journal正反验收。
- 正反验收：菜单/已选项色点匹配分类且补记保存仍通，键盘/点击/点击外部关闭且不可触发多余提交；气泡不改变农田矩形，稻草人可键盘开启/外部关闭且草稿与失败重试仍保留；早安及22/23点一次提醒、刷新不重复，凌晨/假日不工作催促且计时仍可用；同来源澄文字可显示，重复留言不重弹/跨来源不串/休息优先；窄屏完整编辑滚动可达、同步不阻塞专注。
- 提醒由当前可见App组件拥有，无系统定时任务；沿用60秒/focus时钟刷新；日记读取沿用启动/重连/用户同步并加回到App时只读刷新（至少间隔60秒、卸载停止、失败不重试上传），不新增网络轮询；30秒后收起自动气泡，手动打开不自动收起，卸载清除timer。预算3小时、无子Agent、无新依赖；测试静音隐藏，只读瞬时故障一次重试，副作用不盲重放。
- 固定版本证据补充：现有React 16合成事件在处理后回收，node_modules/react-dom/cjs/react-dom.development.js L3280、L8583；键盘值在处理器内先复制再交状态更新，不保留已回收事件。
- 回滚本任务提交/旧包，保留新增提醒已读键和日记，旧版忽略；Learning检查点判断是否新增可复用教训，当前预期none（既有模式薄适配）。

- 已验证：ACCEPTANCE-scarecrow-bubble.md；逻辑241/241、桌面80组及真实进程重启、完整构建成功；稻草人通过真实鼠标输入和elementFromPoint命中，提示真实等待30.5秒收起。提交前远端仍为基线，允许写集无冲突，绿灯。Learning none：复用已验证机制，无新增根治理候选。等待干净源码包及公开更新feed核验。
