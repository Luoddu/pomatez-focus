# P0-POMO-063 偏好自动合并与中文差异验收
状态：DONE；唯一状态源TASK-P0-POMO-063.md。
四源/授权/范围/回滚见执行卡。新逻辑以当前本机和全部云heads值一致作为接受条件，清理过时待同步版本并记录实际head IDs，不新增云写/不删历史；精确ID回执先验真，待应用选择保留CAS保护，云已含其目标时引用实际heads完成确认。真正不同及待处理意图继续显式选择。
聚焦26项PASS（21同步+5差异格式），全逻辑427/427PASS、renderer TS PASS，artifacts/p063-preference-tests.log、p063-all-tests.log、p063-renderer-types.log。覆盖同值旧parent pending重启、旧队列已被当前一致值取代、多heads相同/键顺序不同、云已含adoption值、不同待应用意图不得隐藏、CAS失配保留、精确ID内容不符拒绝；既有丢失回复/暂停/切源/持久化失败保护均仍通。
中文差异只列变更字段，复用项目类别中文名；周目标日期/有效数量、分钟/开关/挡位使用中文；不同待处理值另列，多等值云heads只展示一份。没有原始英文JSON/内部ID。生产bridge/横竖窄屏及发布结果待补。
Learning判断：本轮是已知产品值等价策略与中文差异展示修正，未发现需新增全局工程规范的第三方机制；将原始回归证据留在本验收/测试，不重复新增Learning。未写根Learning/Memory或真实飞书/用户profile。

复核修复：独立reviewer发现P2空目标跨来源确认卡因差异字段为空被隐藏；已保留缺失云设置的中文说明和按钮，不放宽foreignKeys保护。新增真实React静态渲染与A→B缺失目标初始化回归，focused28/28、全逻辑429/429PASS。桥接首轮clean cbe8aa验证中文差异/相同待同步重载恢复/记录不变通过，最终修复提交后的clean构建与桥接待验证；测试实际窗口最小值设320×400，480窄窗确认无页面横向溢出。

最终验收（2026-10-19）
- 冻结源码3a129a8bebe6908b81c323f745b920b71ee11669，最终build:focus/package:focus exit0、source-version同SHA/dirty=false/version0.1.0-preview.99；公开主线已同步。artifacts/focus-build.json、p063-build.log、p063-package.log、p063-source-push.log。
- 28项偏好聚焦（22同步+6差异/组件渲染）、全逻辑429/429PASS，renderer TS通过；最终修复后CRA再验证类型与生产构建通过。p063-preference-tests.log、p063-all-tests.log、p063-renderer-types.log。
- 最终生产main/preload/App+既有Feishu adapter模拟传输验证PASS：真实中文差异只列杂事/时长变化；480真实窄窗（测试设最小320×400）及1080竖屏、1440横屏无页面横向溢出；旧parents但同值pending在renderer重载后自动清理且不多写云版本；保留显式选择18→14有效番茄、原始records字节/paused计时关键字段、真实原生偏好CAS、切源与无效字段拒绝。p063-bridge.log。截图p063-preference-differences-480.png/1080.png目视通过，测试截图只关闭模拟记录产生的无关错误toast，无图像后处理。
- 原portrait脚本在本日周一失败（p063-portrait.log、p063-portrait-probe.log）：其fixture仅种过去5/1/3天记录，本周空，StatsPanel按原有逻辑显示stats-empty，测试却直接读取.stats-trend。StatsPanel及日期/产品逻辑无改动。ignored p063-portrait-month-fixture.cjs仅在空统计时点现有月tab使fixture记录入选，随后原14项全部PASS（p063-portrait-month.log）。不将此记为原脚本直接通过；原失败和probe保留，没有为测试修改系统日期或产品。
- 包内exe隐藏启动exit0、bundled updater576901bytes/裸require0、ASAR renderer JS/CSS及source/version与冻结源码一致。p063-packaged-smoke.log、p063-asar-updater.log、p063-release-prep.log。便携包仅本地产生未上传交付。
- 独立reviewer01a13d85-043d-7f61-91b4-9dc1ca566fbb发现的P2空目标入口隐藏已修复并复核关闭；对冻结源码、最终构建、五资产及真实旧更新器证据最终只读PASS，无未关闭P1/P2。复核未联网或访问真实profile。采用既有项目value-equality/差异渲染修正及边界回归，未形成新增第三方机制教训，不新增Learning/长期Memory。

公开发布与回滚
- https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.99 ，release417219847，正式non-draft prerelease；annotated tag剥离至3a129a8，未设Latest（仍preview.51）。后续仅两份回执文档提交不改发行源码/tag。
- 五资产：setup.exe75519738bytes、blockmap79206bytes、preview.yml405bytes、source-version.json107bytes、SHA256SUMS.txt405bytes。setup SHA256 1b29ef6ea71b46a605ce25f10b007d85d2bbbe428d307c706a8b44705b2f60c3。上传大文件期间早读草稿只有4项，门禁未放行；原upload自然exit0后重新核验5项，未重放上传。远端草稿/公开资产ID、大小、SHA256与本地均一致，完整清单见发行SHA256SUMS与artifacts/release99-local-assets.json、release99-remote-draft.json、release99-readback.json。
- 公开setup HTTP206首1024bytes与本地一致；tag及Latest见p063-public-verification.json、release99-tag-readback.txt。
- 从已验证公开98对应本地打包ASAR保留真实updater（source0d5cb9f），发布前发现98、发布后发现99，setup75519738及SHA512匹配，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。p063-update-before.json、p063-update-after.json。不声称该测试ASAR为当前用户已安装版本；未自动下载安装或重启用户App。
- 用户检查更新升级99后同步偏好：同值旧版本提示自动消除，真差异按中文字段/单位对照；换来源且飞书缺少目标时保留明确确认入口。未改真实用户数据/飞书内容，不删除云历史、不迁移缓存schema；必要时停同步并退至保留的98发行。范围外portrait夹具问题只记录与有界验收适配，未顺手修改产品或原脚本。
