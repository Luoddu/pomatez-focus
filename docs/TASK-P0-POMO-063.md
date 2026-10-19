# P0-POMO-063 相同偏好自动合并与中文差异
状态：IN_PROGRESS；负责人/root；唯一模块状态源本卡。
授权/目标：用户2026-10-19明确要求相同设置自动合并、不再假冲突，真正不同逐项中文显示，推送并发布Windows preview。不自动下载/安装/重启用户App，不访问真实连接/凭证或代用户选择真冲突。
基线/资源：3e26147df09db3e0bf1a77b18ab3a5e55595a469；fetch/check:sync实时同SHA、clean；task/p0-pomo-063-preference-merge独立模块分支，同checkout无活动重叠写者。仅隔离测试profile/模拟Feishu传输/ignored artifacts；无真实数据库、服务/端口/运行目录独占。
写集：app/renderer/src/focus/preferenceSync.ts、preferences.ts、新增preferenceDiff.ts；components/PreferenceSyncSettings.tsx；focus.css；tests/preference-sync.test.cjs、preference-bridge-desktop.cjs及必要纯差异测试；本卡/ACCEPTANCE-P0-POMO-063.md；版本仅electron/package.json/SettingsPanel.tsx。沿用既有同步协议和公开API，不改schema/加依赖/建服务；不写根治理、Learning/Memory、原始记录/热状态、其他电脑或真实飞书数据。
四源：①preferenceSync pending.parents与云heads ID不同直接冲突，未先按实际值等价判定；UI preferenceJSON英文原样渲染。②第三方新语义不适用：本轮仅项目自有同步协调/差异UI，沿用已冻结060的bitable API、exact-ID回执/读回/追加版本、不删除云历史。③命中已有preferenceJSON稳定排序/validPreferenceValue/持久outbox/CAS/apply/source隔离，Learning检索无同域可直接套用条目，禁止绕过持久屏障或按时间抢胜。④复用15个preference-sync、preferences-api、真实main/preload synthetic bridge与公开98验收。
语义：相同数值/不同键顺序或版本ID不构成用户冲突；无未应用选择时本机与全部云heads相同可接受现有heads并清理过时待同步项，不产生新云写。保留真实不同的分叉/待应用用户选择；若云已含待应用值，可在期望值CAS保护下采用，baseline引用实际确认的head IDs，不伪造回执。队列ID已出现必须先验证完整回执。暂停/切源/缓存错误/失去响应恢复规则保持。
中文展示：六偏好组只列真实不同字段；中文类别/目标日期/分钟、开关、浏览器模式；多云版本分列，必要时明确待同步/待应用值，不能让相同本机/飞书行掩盖第三份不同待处理意图。无英文JSON/密钥/内部ID外露。
验收正反：截图同值旧parent pending重启后自动无冲突且不多写；同值多heads无需二选一；不同值/不同未应用选择仍可见且显式解决；lost reply同ID不重复、缓存保存失败不外写、暂停/切源/原始记录和活动计时不变；中文差异仅变更字段、目标/规则可读；TS/全逻辑/生产bridge横竖窄屏、独立复核、干净包/五资产固定tag/上一98真实updater发现新版。
预算/分派：一次有界前台交付；root实现；允许复用一个只读reviewer检查冻结diff/原始日志/发布证据，不另派实现者，无后台自动化/新增服务/费用。已知根因可在本范围修正，同因两次且仍未知只停对应步骤。跨工作周期/新隐私后果升级。
回滚/Learning：旧98发行保留，无云历史删除或数据迁移，必要时停止偏好同步再退旧版。完成时在回执做Learning判断；只有新且验证可复用教训才提出，不把本产品策略变更自动写成全局教训。
