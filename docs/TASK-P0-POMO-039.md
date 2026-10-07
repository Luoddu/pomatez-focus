# P0-POMO-039 自定义科学休息策略与安装版推送

- DONE；唯一状态源本模块卡。模块协调/实现/root，独立只读review_scientific_rest。用户2026-10-07要求策略可自行设置并推送，随后明确只需App内手动检查、下载并安装更新，及其他Codex从GitHub修改源码；便携包不属于默认交付。安装版公开、真实更新检测和独立最终复核全部PASS；不自动安装或重启用户App，不操作其他电脑或根控制面。
- 基线c558f217ca962ad9fada25475383f0d94ccab7e1含已验证未发布038；开工fetch/check:sync确认公开203d19b，独立task/p0-pomo-039-rest-settings-release，本clone单写、无其他worktree，绿灯。包源/tag9464dc7c6169fc82f18598161135f70c212dd25d，干净构建。公开源码9cfec61相对包源仅两份文档；最后回执提交/非force推送后源码继续前进，tag和已发布包固定不变。
- 目标已实现：科学休息原位设置策略，自定每日番茄目标0–60整数（0仅按额度）、浏览提醒间隔1–60整数、每日摸鱼额度5–480分钟/5步进。默认12/5/60、督促true。修改策略不补弹历史，保存及重启恢复；额度内未达目标按累计提醒，达标后停止早期提醒，超額当即及每间隔提醒，两个条件不交错重复。
- 写集：本卡、ACCEPTANCE-P0-POMO-039、ACTIVITYWATCH、CHANGELOG；activitywatch.ts；ScientificRest.tsx/focus.css；两项activitywatch测试；版本工具生成package.json/SettingsPanel.tsx。用户明确范围后模块协调者增补AGENTS.md、docs/DEVELOPMENT.md安装版默认规则及本模块Learning.md。根Learning/路线图、AW数据库、飞书、Counter计时核心不写；不新增依赖或服务。忽略artifacts只存合成验收/发布暂存，不入Git。
- 四源自检：①实际本机基线、公开源码及P038/037卡与验收；②冻结AW13.2/WebWatcher0.6.0官方URL/前台/AFK语义不变，updater6.8.3 GitHubProvider L39–140、NsisUpdater L31–50、AppUpdater L642–709，Electron34.5.8/builder25.1.8/gh2.97.0原生路径；③复用设置原子落盘、ready/owner、版本/build/package/push/task-commit及Learning治理，不引入第二数据源；④扩展现有逻辑/生产UI阈值迁移，沿用真实旧版更新和资产验收。精确原文/命令及证据在ACCEPTANCE-P0-POMO-039.md，非依赖资料不扩展。
- 正反验收已通过：8/3/45自定义阈值生效，7→8停止额度内督促但超额仍提醒；45/7不能整除时42早期、45无、45+超额、49/51.99无、52有、56无、59有；0目标仅额度；非法值拒绝且旧值可用；保存不倒放、重启保留；关督促仍统计；70旧schema迁移默认12/5并消费同日档位；午夜、未知进度、持久失败仍有正反覆盖。三输入/滚动保存可达、小于月历、窄屏、真IPC提醒和两动作PASS；真实70更新从草稿404恢复到公开71/available，准确setup地址/size/SHA512，无下载安装。
- 资源/预算：本clone独占，隐藏静音临时测试profile、合成REST独立端口，用户AW/profile只读；同一只读reviewer复核冻结diff/原始逻辑/UI/包源/发布，不运行App、不写入、不再分派。首轮并发停滞后仅缺失exe逐个一次5分钟重试；setup成功、portable二次超时后停止该项，原因unknown，不修改代理/身份/网络，也不继续上传试错。用户明确不需要portable后，验证五现有资产并公开安装版。无计划任务或自动重启。
- 交付：preview.71于2026-10-07T09:49:50Z非draft prerelease发布，Stable Latest不变；setup、blockmap、preview.yml、source-version、SHA256SUMS五资产ID/字节/hash与既有草稿和本地清单相同，旧70六资产不变。仓库默认/公开源码分支codex/feishu-focus，其他Codex可按AGENTS接力。用户安装未由用户回报，手动更新入口由用户操作。
- 回滚：旧70和用户历史保留，未来修复用更高版本；不替换同号包或旧tag、不绕过hook。功能/规则/版本均有安全提交，可在明确回滚任务中恢复。上传unknown不作泛化教训。发布恢复候选由模块协调者登记LEARN-P0-POMO-039-01，原始最小证据与Learning同commit、独立语义复核PASS；不写根Learning。
- 未完成项：无用户授权范围内遗留；便携包非交付，未创建后续任务。下一步是用户在设置中手动检查/下载/安装，更新后科学休息→设置策略。
