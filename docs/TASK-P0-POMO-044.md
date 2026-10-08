# P0-POMO-044 每日预设旅程

- DONE；隔离模块唯一状态源；owner/实现 /root。用户2026-10-08明确“开始作战”，接受先交互前端预览、再接现有计时/确认记录、独立复核、源码和Windows安装版手动更新发布；不自动安装或重启用户App。
- 基线 f66b8ce88c2923c2f4001ba832d26ffbcbc4c7ae，fetch/check:sync为canonical preview.76、干净单worktree绿灯。分支task/p0-pomo-044-daily-journey，串行独占本clone及合成测试profile/临时loopback端口；无根仓、用户profile、AW/Edge控制、OS改动。
- 目标：今日番茄下方同宽今日旅程，保留四象限/概览列比例；默认4/3/3/3/3，休息吃饭/睡觉、睡觉、健身/吃饭/睡觉、睡觉、下班，用户可分别改数量/休息名称/每个轮廓番茄任务。今天/明天预设，未完成轮廓拖动跨段并携带任务；实际确认完成填色，进行中不算完成；休息手动进入/继续，无固定钟点和阶段鼓励。概览旗路50番茄一段，282显示250–300。保留科学专注12/5/60自设策略及原农场里程碑。
- 非目标：不改变Feishu任务/schema/权限，不自动生成额外日计划、不新增历史真相源/进程/定时器/云同步；不联动澄鼓励、不调整科学专注阈值；不迁移旧数据、不改全局农场徽章。
- 四处预检：①HistoryPanel现两概览格和百粒旗路，FocusApp已有begin/change/confirm；CounterContext唯一实际记录与计时owner，任务taskId稳定、planId按日变化。②沿用React16.14、Electron34.5.8、TypeScript4.9.4，无新依赖/第三方运行语义变更；固定本机TypeScript lib.dom.d.ts DataTransfer L4302、DragEvent L4917、dragstart/drop L5741–5742公开类型，采用原生拖动。③taskSnapshot源/日期隔离，version/build/push/task-commit helpers，Learning039原生更新发布规则与042采集恢复边界；不改AW。④既有session/plan、portrait/overview合成真实桌面验收可复用，新增journey纯逻辑与隔离真实桌面/重启证据。
- 数据与边界：独立按来源/本地日期保存有界预设，稳定任务引用只含来源/taskId或local id/显示名称，明日启动解析当天可用任务；无有效日计划明确要求重新选或生成今日，不偷偷启动其他任务。旅程只保存轮廓和actual sessionId/unit关联，完成以原记录saved/completedCount为准，已完成和进行中轮廓不拖走。存储失败不假成功、坏数据不覆盖；来源/日期不同不串计。最多20段、100轮廓，单日有界读写；随已存在records事件同步，不每秒写入。
- 写集：本卡、docs/ACCEPTANCE-P0-POMO-044.md、docs/DAILY-JOURNEY.md、CHANGELOG.md；新app/renderer/src/focus/journey.js/.d.ts、components/TodayJourney.tsx；FocusApp.tsx、components/HistoryPanel.tsx、focus.css、contexts/CounterContext.tsx；tests/journey.test.mjs、tests/journey-desktop.cjs及scripts/test-journey-desktop.cjs，必要既有overview/portrait测试适配；版本helper生成app/electron/package.json、components/SettingsPanel.tsx。ignored artifacts仅原型、合成证据、打包发布暂存。禁止其他文件/共享接口/运行数据写入。
- 验收正反：跨段未完拖动数量守恒且任务保留，已完成/活动禁止移动；开始既有唯一计时、任务可实地替换、确认才填色，放弃/0确认不填；今天已完成与多数量记录一次分配不重复，异源/异日不填；明日预设重启保留，次日解析新planId、无可用任务不误启；休息可手动接续而不强制时刻；坏数据/存储故障不丢实际历史且正常有效保存/恢复可用；同半列宽、不改380概览列/四象限比例；旗路50段而旧计数/徽章仍通；前版真实App更新器发现新版且不自动下载/安装。
- 资源/预算/停止：复用现有计时循环，无新常驻进程/后台任务；短时隔离Electron测试及任务临时预览服务结束即停。同根因两次不明停止相应步骤；范围外问题只记录。允许既有review_scientific_rest冻结commit/测试证据独立只读复核，不写入、不启动用户App、不再分派；不新建Agent。
- 回滚：恢复基线明确产品文件/回退安装版；旅程独立存储不改原专注记录，可忽略新键。源码非force canonical同步；新preview号/固定source SHA/五安装资产，旧tag/资产不变；原生上一版更新检查，不自动用户安装。
- Learning判断：none，当前为既有任务/计时/发布路径复用，未形成新的验证教训；工程检查点及复核后再判定。证据在本卡/验收回执，根路线图不写。

- 实现检查点：preview.77已按version:prepare递增，预设/逐任务选择/原生拖动/实际确认/独立进程次日恢复完成。完整逻辑297/297 PASS；生产桌面旅程13组正反PASS。前端原型先交付，再接原计时；错误分类与原始回执在ACCEPTANCE。后续冻结源最终干净build、portrait/overview、原监督回归及独立review/五安装资产和旧76真实更新检查仍待完成。Learning none，局部修复不推广为新教训。

- 授权变更：用户明确要求之后全部静默测试。写集追加app/electron/src/main.ts中POMATEZ_HEADLESS测试启动分支，只使用固定Electron34.5.8官方commandLine和webContents.setAudioMuted；正常用户模式不改。测试同时验证主窗口/新建contents静音，后续直接测试启动也加--mute-audio。既有只读review新增检查此分支与计时恢复回执P2修复。77若已生成本地中间包不覆盖，version helper继续递增，最终公开版本在交付证据中固定。

- REVIEW修复：独立1179bd8复核发现恢复保存回执和同进程跨日任务P2，两处已修、静音真实旅程17组正反PASS。overview7、portrait14、AW23 PASS。77只作本地中间构建，原生打包outfile瞬时占用owner未知有界分类记录；version helper递增78，不覆盖旧产物，最终干净打包/新冻结复核/公开更新待完成。Learning none，复用既有恢复回执、官方静音和版本路径。

- 最终交付：f7d6460985a50fb9becc3e397e137e234e232a74 / preview.78源码、包源及公开交付独立PASS；完整逻辑297、最终静音旅程17、AW23、overview7、portrait14通过，ASAR119文件匹配/成品smoke0。五资产先草稿核对再新tag立即公开，旧76不变，真实76→available78原生更新器校验一致且0下载/安装。细证据/限制见ACCEPTANCE；仅本卡/回执DONE文档同步，不改运行tag或包。Learning none；无新后台/进程、无用户App自动安装/重启，之后无人值守测试统一静音。
