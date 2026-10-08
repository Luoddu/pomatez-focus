# Changelog

## 番茄农场 0.1.0-preview.80 (2026-10-08)

- 今日旅程改为概览整列宽的图案横条，吃饭、小憩、健身和月亮穿插番茄之间，参考小时显示为角标；完成颜色复用实际记录。
- 新增可视化多模板编辑和默认安排，内置4/3/3/3/3共16个番茄；新日使用默认，今日/明日可明确应用，保护成果与关联任务。
- 累计进度移至农场标题右侧，恢复100个一段、25个一旗，保持四象限与概览列比例。
- 提醒增加蓝色描边，当前旅程有健身节点时增加“去健身”，暂停并保存休息节点后确认提醒；不增加计时器或后台进程。

## 番茄农场 0.1.0-preview.78 (2026-10-08)

- 概览新增今日/明日预设旅程，每个轮廓可分别关联任务，未完成轮廓跨段拖动调整，已确认番茄填色。
- 旅程复用原计时器与完成记录，次日解析当天任务；休息手动接续，数量与休息名称可设置，不绑定钟点或阶段鼓励。
- 旅程与今日番茄卡片同宽，保持原四象限/概览列比例；旗路每50个番茄一段。
- 预设本地按日期与来源保存，不新增计时循环或进程；科学专注自设监督策略保持原值。
- 无人值守桌面测试统一静音，正常使用的提示音设置保持不变；77仅本地中间构建，未发布。

## 番茄农场 0.1.0-preview.76 (2026-10-08)

- 科学休息更名科学专注，两站累计显示小时、分钟、秒；有效站点信号下本地秒钟推进，心跳记录随后校准。
- 状态点悬浮显示检测详情、最近核对时刻和监测运行时间；断连或切到其他应用停止估算。
- 复用单一采集循环，每5秒查询近期记录、30秒全日校准；不新增采集进程，不每秒请求或写盘。
- 今日半小时专注热力默认显示8–24点，滚动可看凌晨；缩短月历卡片，为专注积累留出空间，保持原列宽比例。

## 番茄农场 0.1.0-preview.75 (2026-10-08)

- Windows农场启动时检查本机ActivityWatch；未运行时启动标准路径已安装的官方托盘管理器，已有服务或启动器不重复启动。
- 科学休息标题旁加入刷新按钮，重新读取当前日与统计、发现采集器；异常保留最后总量并显示原因。
- 一并交付下述概览精简和今日半小时热力；保持原四象限和概览列宽比例。

## 番茄农场 0.1.0-preview.74 (本地中间构建，随75交付)

- 概览隐藏总番茄和总专注时长卡片，保留今日两项统计；监控状态点移到摸鱼额度圈左上角，悬浮可查看状态。
- 番茄月历移除假日说明行，并在同一卡片右侧加入今日全天半小时专注热力，悬浮显示时间段和分摊番茄数。
- 月历主体左对齐，保持四象限与概览列宽比例和既有督促策略。

## 番茄农场 0.1.0-preview.73 (2026-10-07)

- 科学休息改用独立桌面置顶提醒，农场隐藏或最小化时也能显示在浏览器前方，保留标题、一行说明和两个按钮。
- “去睡觉”继续暂停已有专注，“开始下一个番茄”返回或恢复原番茄；提醒结束、采集中断或关闭督促后销毁小窗，主农场不被永久置顶。
- 提醒自身采用独立内存会话，异常退出时清理空白置顶窗；后续健康采集可重新显示，不影响农场计时。

## 番茄农场 0.1.0-preview.71 (2026-10-07)

- 当天完成12番茄前，B站＋小红书每累计观看5分钟提醒；完成12个后额度内停止早期督促，超额当即提醒并继续按5分钟步进。
- 科学休息增加“设置策略”：每日番茄目标、浏览提醒间隔和每日摸鱼额度都可自行设置，默认12个、5分钟和60分钟；目标设0可只按额度督促。
- 保存后立即生效、重启保留，不补弹历史提醒；复用已确认番茄记录，处理目标切换、旧账本迁移与重启去重，两个提醒条件同时命中仅弹一条。

## 番茄农场 0.1.0-preview.70 (2026-10-07)

- 正式发布“科学休息”：月历上方的每日摸鱼额度圆环、B站/小红书累计时间，以及原位切换的浏览时段统计。
- 默认共享60分钟额度、督促开启；超额后每新增5分钟浏览提醒去睡觉或回到已有番茄。
- 通过本机ActivityWatch官方API读取前台浏览记录，处理可听音频、空闲、重叠、跨午夜和断连；保存失败暂停督促，避免重复弹窗。
- 明确“推送”默认完成源码同步、Windows更新发布和客户端可检测验收；“只推源码”仍可单独指定。

# 0.1.0-preview.69 (local test build)

- Add the compact “科学休息” card above the calendar, with a shared daily Bilibili/Xiaohongshu quota ring and in-place hourly statistics.
- Read the existing local ActivityWatch API using URL, foreground and AFK/audio records; retain previous totals on disconnection.
- Enable reminders by default after each additional five minutes over quota; pause for sleep or return to the existing pomodoro without duplicate timers.
- Persist settings and consumed reminder thresholds locally; no browser history upload or ActivityWatch modification.

## 番茄农场 0.1.0-preview.68 (2026-10-03)

- 补记分类菜单和已选分类显示对应色点，与专注积累使用相同六种颜色；支持鼠标、键盘和窄屏浮动菜单。
- 取消农田下方常驻伙伴横栏；点击稻草人打开浮动聊天气泡与随手记，点击外部或 Escape 收起，保留草稿，不挤动农田。
- 08:00–09:30 早安、22点收尾、23点睡眠提醒，每日每个时段最多一次，30秒后自动收起；无额外声音，假日和休息引导优先。
- 当天同连接的新澄留言读回后短暂提示，同一UUID不重复弹出；返回App可只读刷新，不轮询或重放失败上传。仍为预留接口，未接入真实澄服务。

## 番茄农场 0.1.0-preview.67 (2026-10-03)

- 补记可选择番茄分类；科研周目标在前且保持红色，总周目标改为金色。
- 月历和统计标记已核对的 2026 年官方放假/调休。假日工作给温和鼓励，没有番茄也可安心休息。
- 统计区分 08:00–09:30 晨间和 23:30–08:00 休息时段；按实际专注分段计算并排除暂停，不额外奖励熬夜。
- 成果同步显示真实阶段进度；成功核对后播放收篮动画，失败保留本机记录，可重试且不挡住继续专注。
- 稻草人增加季节、节日和日夜变化，提供开工/睡眠引导与随手记。日记先保存在本机，再同步同一个飞书 Base 的“农场日记”表。
- 预留澄的纯文本留言接口；尚未接入澄服务或外部 AI。日记重试保留同一 UUID，切换计时界面也不会丢失迟到的回执。

## 番茄农场 0.1.0-preview.66 (2026-10-02)

- 减少番茄先在本机生效，可连续点击和跨任务操作，后台逐条同步；断网、重启或响应丢失后仍只处理原先指定的番茄。
- 已完成、计时中或有专注数据的番茄保持保护，后台同步不挡住其他番茄开始专注。
- 四象限新增任务可选择飞书已有项目；本地立即使用对应颜色，随后自动写入「所属项目」关联。

## 番茄农场 0.1.0-preview.65 (2026-10-01)

- 暂停专注时，「继续」改为主题蓝色主按钮，「结束」退为描边按钮；完整计时窗与紧凑小窗一致。
- 计时中仍保持「暂停」描边、「结束」主按钮，结束二次确认维持原有提示。

## 番茄农场 0.1.0-preview.64 (2026-09-27)

- 科研任务仅保留浅红底，去掉科研文字标识与左侧强调线。
- 移除农场顶部科研红番茄数量；科研优先排序、周目标、统计与红果效果保持。

## 番茄农场 0.1.0-preview.63 (2026-09-27)

- 新增科研周目标，默认40个，悬浮或点击调整本周；总周目标独立保留。
- 统计新增最近8周科研收获、目标参考线、投入天数与专注时长，可切换科研时长趋势。
- 科研任务在各自象限内稳定优先，增加科研标识、浅底与侧边强调。
- 农场显示本周科研红番茄数量，科研果实适度放大并描边突出；达标显示完成标识。

## 番茄农场 0.1.0-preview.62 (2026-09-27)

- 修复小屏补记与修改表单底部被裁切：编辑时右栏可整体滚动，保存、取消和感受选择可达。
- 打开表单自动带入视野，结束编辑恢复原有历史列表与布局。

## 番茄农场 0.1.0-preview.61 (2026-09-27)

- 历史专注折叠卡只显示当日主题，移除“当日复盘”标题及长篇进展正文。
- 主题采用柔和深蓝灰文字与更舒适的行距，卡片更紧凑；日期、成果统计和查看明细保留。

## 番茄农场 0.1.0-preview.60 (2026-09-26)

- 编辑结束时间时，自动缩减超过有效时间窗口的专注时长，保留手动确认的番茄数。
- 显示扣除暂停后的可计入上限，支持小数分钟微调；延长结束时间不会自动增加专注时长。
- 修正输入后清除旧校验提示，沿用原有记录纠正与同步流程。

## 番茄农场 0.1.0-preview.36 (2026-09-17)

- Read optional task details from the linked Feishu task table (`详细`, with `详情` fallback).
- Click a board title to inspect details without changing selection or layout; click outside or press Escape to dismiss.
- Show multiline details below the active focus title; preserve details in the task cache and current session across restart.
- Retain existing timing, completion, history accounting and synchronization behavior.

## [1.11.0](https://github.com/zidoro/pomatez/compare/v1.10.0...v1.11.0) (2026-05-19)


### Features ✨

* add translation support ([8f24913](https://github.com/zidoro/pomatez/commit/8f2491336e0636519e589ae31c9adc797427d73c))
* **electron:** improve native title bar toggle behavior ([680ccd6](https://github.com/zidoro/pomatez/commit/680ccd69c283809df34c039ea44d5f218d5cc458))
* update tauri & electron ([ce3639c](https://github.com/zidoro/pomatez/commit/ce3639c461fc8c61301a3caccd258f29e66ee29f))


### Bug Fixes 🐛

* **tauri:** add webkit flag to set on linux to stop crashes on wayland ([1cf6173](https://github.com/zidoro/pomatez/commit/1cf6173a4abefc8d4abcff2e555c6f988220cf19))
* **tauri:** dragging on mac after tauri update ([709a83e](https://github.com/zidoro/pomatez/commit/709a83e770543f9fb672b26d75d5a45d53715d96))
* **tauri:** dragging on mac after tauri update ([30eaf22](https://github.com/zidoro/pomatez/commit/30eaf2236b2ad7046c4cd2de946fa1d99ec0ff90))
* **tauri:** on mac hide the native checkmarks ([3cf59ff](https://github.com/zidoro/pomatez/commit/3cf59ffd3a6f3514a027980aba5245d42cdd354d))

## [1.10.0](https://github.com/zidoro/pomatez/compare/v1.9.0...v1.10.0) (2025-12-23)


### Features ✨

* **electron:** add close confirmation during sessions for the tray context menu ([5015a50](https://github.com/zidoro/pomatez/commit/5015a50fee15ea70afcfafc1d527e190dd7e2c52))

## [1.9.0](https://github.com/zidoro/pomatez/compare/v1.8.0...v1.9.0) (2025-11-09)


### Features ✨

* **electron:** Discord Rich Presence ([#700](https://github.com/zidoro/pomatez/issues/700)) ([de82067](https://github.com/zidoro/pomatez/commit/de82067f7090812fae149eaf50d477ddb6c9994d))


### Bug Fixes 🐛

* **electron:** discord rpc not initialising on start ([#717](https://github.com/zidoro/pomatez/issues/717)) ([df4e2b4](https://github.com/zidoro/pomatez/commit/df4e2b47619805b4e649328a3bb4dfbe6dad0285))

## [1.8.0](https://github.com/zidoro/pomatez/compare/v1.7.2...v1.8.0) (2025-05-26)


### Features ✨

* add setting to follow the system theme ([#690](https://github.com/zidoro/pomatez/issues/690)) ([96b2318](https://github.com/zidoro/pomatez/commit/96b2318f881ab753d6ba6024c31e6b809ddc42db))

## [1.7.2](https://github.com/zidoro/pomatez/compare/v1.7.1...v1.7.2) (2024-08-30)


### Bug Fixes 🐛

* react warning that was blocking the previous release ([#666](https://github.com/zidoro/pomatez/issues/666)) ([c2f0861](https://github.com/zidoro/pomatez/commit/c2f0861f3400f028fe6c767b1af6d33da60edd92))

## [1.7.1](https://github.com/zidoro/pomatez/compare/v1.7.0...v1.7.1) (2024-08-30)


### Bug Fixes 🐛

* add extra logic to keep track of time accurately when in the background ([#664](https://github.com/zidoro/pomatez/issues/664)) ([5276215](https://github.com/zidoro/pomatez/commit/52762152aa5b4a5eee0b679342966df14b04339f)), closes [#608](https://github.com/zidoro/pomatez/issues/608)

## [1.7.0](https://github.com/zidoro/pomatez/compare/v1.6.4...v1.7.0) (2024-07-25)


### Features ✨

* allow user to input shortcuts in the Shortcut component (requires backend changes) ([#523](https://github.com/zidoro/pomatez/issues/523)) ([47ecece](https://github.com/zidoro/pomatez/commit/47ececea7ae9c929215e064272ef4e57004d615e))
* hide preview button when the text in not being edited ([#657](https://github.com/zidoro/pomatez/issues/657)) ([b1ed5af](https://github.com/zidoro/pomatez/commit/b1ed5af1ec9012a3b14a762bcc1658d7d9dee0f4))


### Bug Fixes 🐛

* add word wrapping for card titles ([#637](https://github.com/zidoro/pomatez/issues/637)) ([a63a21e](https://github.com/zidoro/pomatez/commit/a63a21ec3e98f433ad8e18e1425f731cd922fc0d))
* typo with "stay focused" ([9c5cbd6](https://github.com/zidoro/pomatez/commit/9c5cbd616d4e6a063ae293acaec951da7e6d09f2))


### Reverts ⏪️

* remove google analytics in the app ([#610](https://github.com/zidoro/pomatez/issues/610)) ([95dae58](https://github.com/zidoro/pomatez/commit/95dae58e67f449a161dbd5e86daffe447ef3883d)), closes [#609](https://github.com/zidoro/pomatez/issues/609)

## [1.6.4](https://github.com/zidoro/pomatez/compare/v1.6.3...v1.6.4) (2023-12-16)

### Bug Fixes 🐛

- electron and tauri signing (release 1.6.3 was skipped) ([6442717](https://github.com/zidoro/pomatez/commit/64427172d5721f9384d0d7f5ebf26c8130938812))

## [1.6.3](https://github.com/zidoro/pomatez/compare/v1.6.2...v1.6.3) (2023-12-16)

### Bug Fixes 🐛

- mac signing for electron and tauri ([2c542fe](https://github.com/zidoro/pomatez/commit/2c542feec3f243847dd685913d093f2a48395b00))

## [1.6.2](https://github.com/zidoro/pomatez/compare/v1.6.1...v1.6.2) (2023-12-12)

### Bug Fixes 🐛

- winget release fix ([8759751](https://github.com/zidoro/pomatez/commit/875975112d282572f08d848047fe577a12db0401))

## [1.6.1](https://github.com/zidoro/pomatez/compare/v1.6.0...v1.6.1) (2023-11-23)

### Bug Fixes 🐛

- release issue (didn't release to homebrew or winget) ([fe854b0](https://github.com/zidoro/pomatez/commit/fe854b040446afa169478359413b4937ffdc75ae))

## [1.6.0](https://github.com/zidoro/pomatez/compare/v1.5.0...v1.6.0) (2023-11-23)

### Features ✨

- shortcuts for adding new cards with `Enter` & `Ctrl+Enter` ([a73fca7](https://github.com/zidoro/pomatez/commit/a73fca70847836bf7b96bdef54e67023813bda29))

### Bug Fixes 🐛

- electron open at login notification showed up on every start up ([654c4db](https://github.com/zidoro/pomatez/commit/654c4dbbeaaa07c69bade454855ab96259d17516))
- **tauri:** avoid setting open at login if already set ([1e836ee](https://github.com/zidoro/pomatez/commit/1e836ee7f8d4670208e276912faf5c7d1fc1ad0f))
- **website:** wrong download link for macOS apple silicon installer ([476b232](https://github.com/zidoro/pomatez/commit/476b232615b257e04c9f9065e435b26860b2995a))

## [1.5.0](https://github.com/zidoro/pomatez/compare/v1.4.2...v1.5.0) (2023-11-17)

### Features ✨

- add a link to our community discord ([8b2802f](https://github.com/zidoro/pomatez/commit/8b2802f61f7e8004260a27090ad4c768a0a4185f))

### Bug Fixes 🐛

- **tauri:** check autostart status to prevent error with `@tauri-apps/plugin-autostart` on Windows ([de4f8b9](https://github.com/zidoro/pomatez/commit/de4f8b9441b7a8e9d8f1225285e43fd0cb3c8e62))
- **tauri:** github link opens in app ([09e5ae3](https://github.com/zidoro/pomatez/commit/09e5ae39436ffe95b032df12e6c6752cfa704ab1))
- **tauri:** high dpi screen scaling ([a9ff671](https://github.com/zidoro/pomatez/commit/a9ff6713054ac00692844c6f264c35ca896a80a7))

## [1.4.2](https://github.com/zidoro/pomatez/compare/v1.4.1...v1.4.2) (2023-11-12)

### Bug Fixes 🐛

- **tauri:** mac ipc added to connect-src CSP ([b535250](https://github.com/zidoro/pomatez/commit/b535250f5ae720cc75ad50badee381ee7d5a4c47))

## [1.4.1](https://github.com/zidoro/pomatez/compare/v1.4.0...v1.4.1) (2023-11-12)

### Bug Fixes 🐛

- **tauri:** links now open in the default browser ([901b824](https://github.com/zidoro/pomatez/commit/901b82481eab8da6e5aade01a97874e52a1905c4))

## [1.4.0](https://github.com/zidoro/pomatez/compare/v1.3.1...v1.4.0) (2023-11-12)

### Features ✨

- add base tauri app ([8b91a3f](https://github.com/zidoro/pomatez/commit/8b91a3f898efa8f1775eb83b937f379a56d9c4da))
- make tauri version draggable ([6202477](https://github.com/zidoro/pomatez/commit/620247715b3fb0e21c0a68b4fd77470f30f60391))
- restructure connector in a way that allows easy switching out for platforms ([ce368dd](https://github.com/zidoro/pomatez/commit/ce368dd03b7edf3129acedbae1acabad059c2d67))
- **tauri:** add base connector with placeholders for logging ([a989379](https://github.com/zidoro/pomatez/commit/a989379a57c66078409169d325c61860b109c8fe))
- **tauri:** add closing logic ([5b7c749](https://github.com/zidoro/pomatez/commit/5b7c74958b216424ccb922a5e7c49df271d0f912))
- **tauri:** add easy command interface for frontend -&gt; backend ([4483005](https://github.com/zidoro/pomatez/commit/44830057ee8a4a70c68677becab8a467c742d102))
- **tauri:** add global show and hide shortcuts as well as block reload ([ef17d00](https://github.com/zidoro/pomatez/commit/ef17d00c5ee5fc46fef7c409734b6524edc7acdb))
- **tauri:** add tray icon updating and a number of other commands ([61d3e2c](https://github.com/zidoro/pomatez/commit/61d3e2c00fb6c9e1a617802c7f6f283eb5793163))
- **tauri:** added connection hooks for all of the base tauri commands ([9ad7edc](https://github.com/zidoro/pomatez/commit/9ad7edcd3d6c3e212c4273e26d6ce2df8843a0dc))
- **tauri:** always on top command ([702f419](https://github.com/zidoro/pomatez/commit/702f4198548b0a2ba21cf1418f5849c969ff6cfb))
- **tauri:** auto updater ([02c6d00](https://github.com/zidoro/pomatez/commit/02c6d00e38c2eeb6ce3883709ae1b97b426ebf4d))
- **tauri:** compact mode resizing ([dc63f31](https://github.com/zidoro/pomatez/commit/dc63f31a3402aaa9b8ded51f6f804bf3607a8ae2))
- **tauri:** debug menu in dev mode ([c5289b9](https://github.com/zidoro/pomatez/commit/c5289b9c905e40e4d6dea9912d8f9f666fba977c))
- **tauri:** full screen mode ([d59ca69](https://github.com/zidoro/pomatez/commit/d59ca6946057360cb49427aba3584775c2c69e18))
- **tauri:** improve installer ([f9c8eb2](https://github.com/zidoro/pomatez/commit/f9c8eb283020f269928d4b65e72a39aa80ff0d4c))
- **tauri:** pass the data from the frontend into the commands ([58553d8](https://github.com/zidoro/pomatez/commit/58553d8d9072de3e6d461942799b322b4bbbb3ce))
- **tauri:** updater window ([2dfc795](https://github.com/zidoro/pomatez/commit/2dfc7952a1b46ff970a9020217e1211a6c210b2e))

### Bug Fixes 🐛

- changing time configuration with keyboard did not work - [#402](https://github.com/zidoro/pomatez/issues/402) ([#489](https://github.com/zidoro/pomatez/issues/489)) ([b9b5248](https://github.com/zidoro/pomatez/commit/b9b524863d50905a756bbb1428fd87ed7f7c73e7))
- **tauri:** allow context menu on list titles ([a2ae285](https://github.com/zidoro/pomatez/commit/a2ae28569ea11074bc3413bda3f0085b39f7b369))
- **tauri:** catch audio playing errors gracefully ([f4f3274](https://github.com/zidoro/pomatez/commit/f4f3274881d1bbd40eea38bff72466dd25dbb18e))
- **tauri:** fullscreen break being resizeable ([aec8c3a](https://github.com/zidoro/pomatez/commit/aec8c3a73cf260192d1d4a33dc4071d7b592ba59))
- **tauri:** update to tauri v2 (fixes audio) ([231a379](https://github.com/zidoro/pomatez/commit/231a37903c7ff36b15025be98eaad7db1782446d))

## [1.3.1](https://github.com/zidoro/pomatez/compare/v1.3.0...v1.3.1) (2023-10-19)

### Bug Fixes 🐛

- javascript error on launch ([#414](https://github.com/zidoro/pomatez/issues/414)) ([c6c18fb](https://github.com/zidoro/pomatez/commit/c6c18fb47b424be62a9b91ed64c7c95e8eaa41a3))
- **lang:** Switch "released notes" with "release notes" ([#439](https://github.com/zidoro/pomatez/issues/439)) ([d9a3afa](https://github.com/zidoro/pomatez/commit/d9a3afa11f828084483c1d1e3693ff9b0dc1c8e1))
- toast notification ([#382](https://github.com/zidoro/pomatez/issues/382)) ([25403d7](https://github.com/zidoro/pomatez/commit/25403d742d83d0d3654418a43bc5efe8316dc019))

## [1.3.0](https://github.com/zidoro/pomatez/compare/v1.2.3...v1.3.0) (2023-09-26)

### Features ✨

- add support for open at login in the settings tab ([f57e133](https://github.com/zidoro/pomatez/commit/f57e1335d59938d95c6de4455b96aafcc8a878a2))
- increase maximum focus time to 2 hours ([#383](https://github.com/zidoro/pomatez/issues/383)) ([3fc1493](https://github.com/zidoro/pomatez/commit/3fc14937ee4b08e74390fbd36eb115278f55f179))

### Bug Fixes 🐛

- compact mode layout broke with 120 minutes max timer config ([#393](https://github.com/zidoro/pomatez/issues/393)) ([c8c3c66](https://github.com/zidoro/pomatez/commit/c8c3c66460116aefe8a172b4237fa08b52583ffc))
- disable dragging for navigation links ([#387](https://github.com/zidoro/pomatez/issues/387)) ([a5b147f](https://github.com/zidoro/pomatez/commit/a5b147fbac812b2be6e92ce218841bfebe29d790))
- fix security issues ([bcbd65f](https://github.com/zidoro/pomatez/commit/bcbd65fa18d5f5531b20ab2ee0462b03ec766b5c)), closes [#407](https://github.com/zidoro/pomatez/issues/407)
- notification type selection issue in settings ([04ddca1](https://github.com/zidoro/pomatez/commit/04ddca16023bfea1b6496d41769ee7715700354d))

## [1.2.3](https://github.com/zidoro/pomatez/compare/v1.2.2...v1.2.3) (2023-05-03)

### Bug Fixes 🐛

- **app/renderer:** fix linter warnings that causes CI test build failing ([26edd59](https://github.com/zidoro/pomatez/commit/26edd59b26155954208fafc0dc3d933501c11bc9))
- Set Application Menu to Fix Mac Shortcuts ([0e6d47f](https://github.com/zidoro/pomatez/commit/0e6d47f0eb166256f914494518b4ea9e63160c06))

## [1.2.2](https://github.com/zidoro/pomatez/compare/v1.2.1...v1.2.2) (2022-12-21)

### Bug Fixes 🐛

- missing app icon ([c0617bd](https://github.com/zidoro/pomatez/commit/c0617bdee55923aad9da4fc09e1238c966f77958))

## [1.2.1](https://github.com/zidoro/pomatez/compare/v1.2.1...v1.2.1) (2022-12-20)

### Changes to Existing Features 🔧

- increase max rounds to 10 ([#241](https://github.com/zidoro/pomatez/issues/241)) ([270701d](https://github.com/zidoro/pomatez/commit/270701db906ca314a552c8ea629f6ce083424cd8))

### Miscellaneous Chores

- this is just to try and trigger the right release version ([2f6fb49](https://github.com/zidoro/pomatez/commit/2f6fb49c77694d99cdb0e26a5765688834841cf6))

### Features ✨

- added compact mode ([#178](https://github.com/zidoro/pomatez/issues/178)) ([c057c11](https://github.com/zidoro/pomatez/commit/c057c11b88122b8bac90867738b1c4319ad7a8ae))
- allow other UI to scale to the new resizeable mode ([dee69fe](https://github.com/zidoro/pomatez/commit/dee69fe70020913f407fd8ae0c06698afa81649d))
- allow the window to be resized and app to scale ([9bd0128](https://github.com/zidoro/pomatez/commit/9bd0128120fccd8e9c6810a50434700f14a4cc17))
- **compact mode:** prevent user from resizing the window ([dd69232](https://github.com/zidoro/pomatez/commit/dd69232cee804ced9a51566512b196a902453bb4))
- **website:** update downloadable installer version ([cd1b1cd](https://github.com/zidoro/pomatez/commit/cd1b1cdaccf0ff8d17a1dcff4cd6d2f8f3536bcc))

### Bug Fixes 🐛

- app icon on mac ([ce12ace](https://github.com/zidoro/pomatez/commit/ce12ace0701f2e4bce298c5b8ae0e9533fb89afd))
- **app:** invalid .desktop category mentioned here [#127](https://github.com/zidoro/pomatez/issues/127) ([534db41](https://github.com/zidoro/pomatez/commit/534db4111b1969cec953e9545c0d3f1d724c13c6))
- **app:** try to fix issue [#106](https://github.com/zidoro/pomatez/issues/106) ([1061494](https://github.com/zidoro/pomatez/commit/1061494f96dff436564001ae49aac8153687176b))
- broken styles during compact mode ([b142a47](https://github.com/zidoro/pomatez/commit/b142a47ade65196be406bf78529ce10f723ca012))
- bump version for main package.json (was resulting in wrong release version) ([c1530ce](https://github.com/zidoro/pomatez/commit/c1530ce20b3e340237c6857a6eac4eba0aead6e9))
- center add card element creating started ([6d4ce16](https://github.com/zidoro/pomatez/commit/6d4ce16f7160dfd2240d58703c5a37d472d9e34e))
- change help links cursor to pointer ([930e79a](https://github.com/zidoro/pomatez/commit/930e79aad7fa2fec154a8565c8570499f7b51cf4)), closes [#167](https://github.com/zidoro/pomatez/issues/167)
- don't close cards when clicking as its easy to lose info ([8394249](https://github.com/zidoro/pomatez/commit/839424935bdb74446d11c0c11fabba399146b41f))
- drag logic for logo on title bar ([460090b](https://github.com/zidoro/pomatez/commit/460090b8f015c696fe6cffa6823fffd322ae9a5a))
- exiting fullscreen error on linux ([a08ec7a](https://github.com/zidoro/pomatez/commit/a08ec7abca7eaba3ed7eeb1bf3e1f5d9ebb5c47a))
- explicitly define security policy to stop electron complaining ([d19fead](https://github.com/zidoro/pomatez/commit/d19fead0fde4a778afcbb62e92f38544ff01b175))
- flag extra files for version bumps ([a9b2a31](https://github.com/zidoro/pomatez/commit/a9b2a319f20563b15325a734e3fa167faab81dc2))
- fullscreen break escape key issue ([b4affbb](https://github.com/zidoro/pomatez/commit/b4affbb3d70421be5383669afd9337c44d763a72))
- lower electron version as bumping causes release build failures ([dff7116](https://github.com/zidoro/pomatez/commit/dff7116286907b0d80e397661c907856a78ff897))
- lower uuid version to fix lib export issue ([fd30315](https://github.com/zidoro/pomatez/commit/fd303150b853964e2a4bd425f0104804dc4b5866))
- mac fullscreen break ([42dd82d](https://github.com/zidoro/pomatez/commit/42dd82d3d37cd71e6e4ff63aafaea39427a6fe1a))
- make tasks not edit when clicking contained links ([7b4de89](https://github.com/zidoro/pomatez/commit/7b4de89bab6421561bba63fa146dcfd3fdc2a49f))
- make the settings menu vertically resize ([eec4ef0](https://github.com/zidoro/pomatez/commit/eec4ef0372e1979a856832ce3c0333dbb2c5bc1b))
- min size not respected when coming out of compact mode ([1d3171f](https://github.com/zidoro/pomatez/commit/1d3171f24b216892fe08da3b266f96948dc5588a))
- range slider visual bug on window resized ([365fda3](https://github.com/zidoro/pomatez/commit/365fda3e8d116a22c301142dabbd48e6e5ffed26))
- re-enable resizeable as it may be causing issues on ubuntu ([e7befeb](https://github.com/zidoro/pomatez/commit/e7befeb933119ae616d7a93de22267f98f645d31))
- styling issues with compact mode + fullscreen ([3cb1725](https://github.com/zidoro/pomatez/commit/3cb1725f201f38fd0b37fe10fed75d5c1e829a92))
- task links not opening in new windows ([a32807f](https://github.com/zidoro/pomatez/commit/a32807f757315606b3c2c2048f3d85f8a794ad8b))
- timer task preview size ([5ed1275](https://github.com/zidoro/pomatez/commit/5ed12752f8de3a30694582ea6a24d138b1e721d5))
- update to electron 18 to avoid gpu issues on certain linux distros ([bcd4755](https://github.com/zidoro/pomatez/commit/bcd475596c689b7d13fd179a54373a1ca3c5ae24))
- **website:** force render on client-side ([#206](https://github.com/zidoro/pomatez/issues/206)) ([fb9f111](https://github.com/zidoro/pomatez/commit/fb9f111b65737fc5d6f317704618df819d8cc7f3))
- **website:** remove canonical link as because it's unnecessary ([a4cd6ba](https://github.com/zidoro/pomatez/commit/a4cd6babcc9ece0854a60423857f1155ba500c0b))
- **website:** remove the clean script on predeploy ([065a0a6](https://github.com/zidoro/pomatez/commit/065a0a695f6641da731ded84c45dfcb39a54bb5e))
- **website:** scrolling issues ([0649dcf](https://github.com/zidoro/pomatez/commit/0649dcf92cda2f27d948e7755d9dc01925b54ca6))
- window randomly vanishing on mac after minimise ([fbfaca9](https://github.com/zidoro/pomatez/commit/fbfaca95a2788a3e4dc02e5d04fe6b18fe572679))
- windows full screen mode issues ([55344a2](https://github.com/zidoro/pomatez/commit/55344a2c97c7ab064a565cc7973663469aff5ff1))

### [1.2.1](https://github.com/zidoro/pomatez/compare/root-v1.2.0...root-v1.2.1) (2022-04-14)

### Features ✨

- added compact mode ([#178](https://github.com/zidoro/pomatez/issues/178)) ([c057c11](https://github.com/zidoro/pomatez/commit/c057c11b88122b8bac90867738b1c4319ad7a8ae))
- **website:** update downloadable installer version ([cd1b1cd](https://github.com/zidoro/pomatez/commit/cd1b1cdaccf0ff8d17a1dcff4cd6d2f8f3536bcc))

### Changes to Existing Features 🔧

- increase max rounds to 10 ([#241](https://github.com/zidoro/pomatez/issues/241)) ([270701d](https://github.com/zidoro/pomatez/commit/270701db906ca314a552c8ea629f6ce083424cd8))

### Bug Fixes 🐛

- **app:** invalid .desktop category mentioned here [#127](https://github.com/zidoro/pomatez/issues/127) ([534db41](https://github.com/zidoro/pomatez/commit/534db4111b1969cec953e9545c0d3f1d724c13c6))
- **app:** try to fix issue [#106](https://github.com/zidoro/pomatez/issues/106) ([1061494](https://github.com/zidoro/pomatez/commit/1061494f96dff436564001ae49aac8153687176b))
- bump version for main package.json (was resulting in wrong release version) ([c1530ce](https://github.com/zidoro/pomatez/commit/c1530ce20b3e340237c6857a6eac4eba0aead6e9))
- change help links cursor to pointer ([930e79a](https://github.com/zidoro/pomatez/commit/930e79aad7fa2fec154a8565c8570499f7b51cf4)), closes [#167](https://github.com/zidoro/pomatez/issues/167)
- flag extra files for version bumps ([a9b2a31](https://github.com/zidoro/pomatez/commit/a9b2a319f20563b15325a734e3fa167faab81dc2))
- lower electron version as bumping causes release build failures ([dff7116](https://github.com/zidoro/pomatez/commit/dff7116286907b0d80e397661c907856a78ff897))
- **website:** force render on client-side ([#206](https://github.com/zidoro/pomatez/issues/206)) ([fb9f111](https://github.com/zidoro/pomatez/commit/fb9f111b65737fc5d6f317704618df819d8cc7f3))
- **website:** remove canonical link as because it's unnecessary ([a4cd6ba](https://github.com/zidoro/pomatez/commit/a4cd6babcc9ece0854a60423857f1155ba500c0b))
- **website:** remove the clean script on predeploy ([065a0a6](https://github.com/zidoro/pomatez/commit/065a0a695f6641da731ded84c45dfcb39a54bb5e))
- **website:** scrolling issues ([0649dcf](https://github.com/zidoro/pomatez/commit/0649dcf92cda2f27d948e7755d9dc01925b54ca6))

### Miscellaneous Chores

- this is just to try and trigger the right release version ([2f6fb49](https://github.com/zidoro/pomatez/commit/2f6fb49c77694d99cdb0e26a5765688834841cf6))

## [1.2.0](https://github.com/zidoro/pomatez/compare/root-v1.1.0...root-v1.2.0) (2022-04-11)

### Features ✨

- added compact mode ([#178](https://github.com/zidoro/pomatez/issues/178)) ([c057c11](https://github.com/zidoro/pomatez/commit/c057c11b88122b8bac90867738b1c4319ad7a8ae))
- **website:** update downloadable installer version ([cd1b1cd](https://github.com/zidoro/pomatez/commit/cd1b1cdaccf0ff8d17a1dcff4cd6d2f8f3536bcc))

### Bug Fixes 🐛

- **app:** invalid .desktop category mentioned here [#127](https://github.com/zidoro/pomatez/issues/127) ([534db41](https://github.com/zidoro/pomatez/commit/534db4111b1969cec953e9545c0d3f1d724c13c6))
- **app:** try to fix issue [#106](https://github.com/zidoro/pomatez/issues/106) ([1061494](https://github.com/zidoro/pomatez/commit/1061494f96dff436564001ae49aac8153687176b))
- change help links cursor to pointer ([930e79a](https://github.com/zidoro/pomatez/commit/930e79aad7fa2fec154a8565c8570499f7b51cf4)), closes [#167](https://github.com/zidoro/pomatez/issues/167)
- **website:** force render on client-side ([#206](https://github.com/zidoro/pomatez/issues/206)) ([fb9f111](https://github.com/zidoro/pomatez/commit/fb9f111b65737fc5d6f317704618df819d8cc7f3))
- **website:** remove canonical link as because it's unnecessary ([a4cd6ba](https://github.com/zidoro/pomatez/commit/a4cd6babcc9ece0854a60423857f1155ba500c0b))
- **website:** remove the clean script on predeploy ([065a0a6](https://github.com/zidoro/pomatez/commit/065a0a695f6641da731ded84c45dfcb39a54bb5e))
- **website:** scrolling issues ([0649dcf](https://github.com/zidoro/pomatez/commit/0649dcf92cda2f27d948e7755d9dc01925b54ca6))

### Changes to Existing Features 🔧

- increase max rounds to 10 ([#241](https://github.com/zidoro/pomatez/issues/241)) ([270701d](https://github.com/zidoro/pomatez/commit/270701db906ca314a552c8ea629f6ce083424cd8))
