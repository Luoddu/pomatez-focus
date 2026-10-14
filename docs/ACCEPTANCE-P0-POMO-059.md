# P0-POMO-059 统一有效番茄验收
状态：DONE；生产桥接、公开发行与最终独立复核PASS；基线公开3a93524，version95。
四源与范围见TASK059。所有派生番茄数使用本机比例：周/科研目标、历史日/记录、月历/时段热力、统计/分享、农场累计/周/生长、任务已收和旅程贡献显示。今日取消未折算副总数。计时秒数保留真实；编辑/确认输入明确实际颗数，原始整数/日期/时间/身份/颜色快照不写、不迁移、不触碰真实profile/飞书。
功能证据：369/369全逻辑PASS；weights9（含缺9条明细补足confirmed10→6、foreignBase不混、override1+9*.6=6.4、零权重）；effective-stats14（8+10*.6=14、零/全1、>=10仍14.4、50*.58科研29恰达目标29、.29*100=29、summary/day/category/share等一致且原始字节/时长不改）；有效布局17 PASS；完整renderer TS PASS、相关ESLint PASS。
独立初审两P2已修复：researchWeeks聚合整数百位后/100，避免28.999...未达29；task progress保留confirmed总数，明细仅匹配source/sourceKey/task/day，known按固定分类+missing按当前任务比例并在tooltip注明，不让仅一条明细覆盖10个已收。工作流任务完成仍依据真实操作确认，不按0/0自动完成。
回滚：保留94发行与用户App，权重全1恢复；raw records无需恢复。Learning none - 复用同一派生视图和现有已验证接口，未产生新的跨任务教训。

正式生产验证：clean CRA build PASS（artifacts/p059-build.log）；生产桌面21项及真实进程重启PASS（p059-desktop.log）；横竖屏14项PASS（p059-portrait.log）；main/preload/App真实存储桥接PASS（p059-bridge.log）。合成8科研+10杂事按0.6，概览/积累/月历/农场/统计均14；改0.64均14.4；全1恢复18；原始18、身份、日期及acceptedSeconds保持。用户明确确认专注时长保留真实计时。

发行证据：源码528739fd5fa0e1869c765e1f13b325b27f022134非force推送codex/feishu-focus并回读一致；正式package:focus及ASAR/update bundle检查PASS，win-unpacked隐藏独立profile启动PASS。固定annotated tag v0.1.0-preview.95 peeled源码仍528739f；公开Release 412521376，draft=false/prerelease=true，未抢占stable latest（仍preview.51）。发行地址 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.95 。

公开5资产name/ID/size/digest与本地及draft逐项一致（artifacts/release95-readback.json、release95-local-assets.json、release95-remote-draft.json）；setup.exe 75488038字节，SHA256 e55af11a67364deffb80f8513f4bf49b7a1c3b1aa1e3b53e256cdebf5acaf37c；其余blockmap/preview.yml/source-version.json/SHA256SUMS.txt齐全。公开安装包HTTP206读取1024字节与本地前1024一致，未执行安装。

实际旧版更新链：读取本机已安装preview.94的ASAR updater，在隔离profile验证检测available preview.95、正确setup文件/75488038字节/SHA512（artifacts/p059-update-after.json）；errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。未下载全包、未操作真实App profile或自动安装/重启；用户可在App设置中自行更新。

最终独立复核：Heisenberg针对固定源码、生产证据、公开资产/tag及同一94 updater读回给出PASS；两项初审P2均已修复且正反例通过，未遗留阻断项。docs-only回执提交和非force push不改变发行源码tag。Learning判断none，理由为本轮复用既有派生视图口径及已验证发行链，未新增需跨任务记录的工程教训。
