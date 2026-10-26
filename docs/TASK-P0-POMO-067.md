# P0-POMO-067 分段番茄与本地安装更新

状态 REVIEW（功能独立PASS，随068最终版本发布）；owner/root，隔离农场模块唯一状态本卡。用户2026-10-26直接要求实施：结束确认页“切断本次”、同番茄可续做、轻量未完成提示；先本地更新再GitHub，新增重启入口。后续最新答复“我晚点自己升级”：取消本轮代装，不控制个人App，保留本地包后继续默认发布。未公开104合并至068的105，源码与最终发布证据见TASK/ACCEPTANCE-P0-POMO-068。baseline 7ae773c19a0c21e214abc199a6533a2c42e9b80d；旧分支与104包保留。只做模块内部，不接入根澄行主线。

范围：复用既有同planId分钟台账、session唯一ID和零完成记录。切断保存本段实际分钟而不记完成，退出当前专注后可做其他任务；返回同一稳定番茄扣已有已确认投入，只计本段新增时间，合计达标默认一个完成。标识放在任务番茄chip的轮廓/浅底/悬浮信息，原列宽、拖动、整段更换任务/正常保存/计时暂停不改。支持已同步/未同步及临时任务绑定；身份隔离到sourceKey+planId或本地/quick稳定ID，不按名称合并，不建立第二计时/记录源。

本地更新：继续官方NSIS安装版，不热覆盖运行ASAR。当前用户目录固定local-update收件目录，仅接收本地固定命名NSIS、版本、源码commit与哈希；repo helper显式stage已验本地包。App设置可“重启app”，发现准备好的新版显示“重启以加载更新”。按钮先暂停并持久化当前计时、备份一致renderer快照；新版本恢复暂停或review，关闭期间不累计。不接受renderer路径/URL/命令，不自动点击重启。安装复用electron-updater6.8.3公开setFeedURL/checkForUpdates/downloadUpdate/quitAndInstall；仅用户点击时临时绑定127.0.0.1随机端口与随机路径，向同进程官方generic updater提供固定只读包/feed，下载结束关闭，无公网、鉴权凭证、新常驻服务、任意文件服务。校验失败保留旧App，不安装。原GitHub手动检查下载保留；本机先本地NSIS交付后再发布GitHub五资产。

允许文件：app/renderer/src/focus/session.ts、新增partialTomato.ts；contexts/CounterContext.tsx；focus/FocusApp.tsx、components/ReviewPanel.tsx、FocusTimer.tsx、QuadrantBoard.tsx、UpdatePanel.tsx、focus.css；app/electron/src/focus/updater.ts、新增localUpdate.ts、main.ts、preload.ts；新增scripts/stage-local-update.cjs；对应tests/session.test.mjs、新增partial-tomato.test.mjs、local-update.test.cjs、split-tomato-desktop.cjs、local-update-desktop.cjs、local-update-installed.cjs，scripts/test-split-tomato.cjs、test-local-update.cjs、test-local-update-installed.cjs；tests/updater.cjs仅相应公开API回归；本卡、docs/ACCEPTANCE-P0-POMO-067.md、docs/LOCAL-UPDATE.md、AGENTS.md更新本机交付约定、CHANGELOG.md、版本helper的app/electron/package.json和SettingsPanel.tsx。ignored证据/官方最小快照/合成profile/本地NSIS包/发行helper与本机staging、安装目录仅经已验证本地安装器、当前用户备份和用户同意的首次升级。禁止直接改个人记录/原热数据库/凭证、系统服务/真实飞书写入/其他电脑、手改已安装ASAR；根治理/路线图/锁/Learning不写。

四源：①CounterContext单一elapsed循环；confirmSession支持0完成；withPendingCredit仅起始带入未同步分钟但timeParts未扣已有信用，故续做仍倒计整25。既有plan.mergePlan按session幂等、秒数分段累计，原同plan 12+13分钟验收已存在。现UpdatePanel只支持远端下载后安装，main拒有active记录；首次旧103无新入口需本地NSIS升级，用户已同意。②React16.14原组件状态/原始TS函数无新增库；Electron34.5.8固定官方app.md(a0e0268/blob a933484，sha a399867ad70be8102b78d6dae7d79a9dd016eb3911d190e97e04707a5159394b已重算)492–538 app.quit/relaunch：relaunch不自动退出、重复会多实例，需单飞与手动quit。electron-updater实际6.8.3安装包out/AppUpdater.d.ts:164、185公开setFeedURL/downloadUpdate、BaseUpdater.d.ts quitAndInstall，NsisUpdater.js:98–150原NSIS参数/安装；按固定包文件hash及本地快照复核，不调用protected缓存或替换包。既有真实loopback generic updater验收与NSIS安装测试可复用。③Learning039不可变发行与真实旧更新器、065初始化门禁；scripts/build/version/push/task-commit与tests/update-installed、updater、plan-desktop命中，不新建scheduler/parallel统计。④session.test/plan.test/plan-desktop覆盖0数量累计与幂等；新增续做剩余时间/同步交错/本地包错误正反与实际安装重启全链。根资料/完整路线图/私人参考不加载。

验收正反：切断14分20秒记0，另任务独立计时；返回原番茄只剩10分40秒，累计25分记1，原段不重复。重启、同步成功/失败/延迟、同名异ID/异来源均隔离；整段完成/原更换任务/放弃仍通，写失败不清active、不重复记录；已达标不能用切断把已完成番茄误标未完成。chip仅partial浅色轮廓/悬浮显示投入与剩余，完成后消失。local stage重复不复制、旧版/损坏/异源/路径逃逸拒绝，但合法固定包通；设置显示本地新版、点击保存当前暂停计时/备份后原官方NSIS从loopback获取、SHA校验、安装重启新版本，数据及未完成段保留，关闭间不算。无包普通重启、双击单飞、备份失败不得退出；远端更新链仍通。本地真实安装测试仅UUID独立产品/注册/随机profile并卸载清理，所有测试隐藏静音。用户App首次升级只在源码/本地包/实际安装链独立复核通过后执行，保存现场先行；随后公开五资产及真实旧103更新器0下载检测验证。

资源/预算：本clone build/dist与合成随机profile独占，固定本机当前用户local-update及首次App安装的控制权仅本卡，端口仅显式安装期间127.0.0.1随机短期监听，结束关闭；无DB/schema/生产共享服务。一次前台4小时有界交付；依项目规则复用既有review_scientific_rest作只读独立复核，不新增子Agent、后台自动化或真实外部消息。写前/检查点/提交/发布复核status、基线到主线diff和worktree；未知同因两次停对应步骤，底层故障先T0，已知官方修正可在预算内继续。包/本机安装/公开分别有门禁，无验收不标DONE。

回滚：显式revert本次源码，旧103/tag/assets保留；用户数据原结构和记录未迁移，已有0完成段仍可原版手动累计；本地staging副本非真相源，不删用户原始文件。首次升级保留已安装版本/一致快照备份，失败不发布；必要时使用保留旧安装包回装，不修改数据。Learning每检查点判定，新增候选由模块owner只在独立确证后本次原子检查点同commit写模块Learning，根Learning不写。

源码检查点：453/453、7组静音分段实链、重启备份/单飞及原updater负例、完整UUID NSIS本地安装重启均通过；早期三P2闭环及固定官方模板hash/候选Learning详见ACCEPTANCE-P0-POMO-067.md。首次真实UI只读定位到当前用户农场，尚未安装/修改个人App；用户已同意交付时本地bootstrap。版本helper实时预留104。Learning候选已独立接受，当前源码原子检查点同commit记录，最终收口引用。

封版检查点：源码01dc684 / preview104 / dirty=false，源码和219文件同源NSIS包均独立PASS。真实公开103更新器发布前current/0下载基线通过。个人App因截图/输入工具故障未被暂停或关闭，没有强杀、热复制、安装。用户随后改为自行升级，此原等待门禁已被用户新指令替代；067保留为已验功能输入，随068的105做最终发布，不发布104、不声称个人安装成功。Learning沿01dc684已记录条目。
