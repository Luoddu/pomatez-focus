# P0-POMO-039 自定义策略与安装版更新验收

- DONE。按用户明确的“App内手动检查并安装更新＋GitHub源码接力”范围交付安装版；便携包不是任务门禁。授权、四源预检、写集、正反验收、预算和回滚以TASK-P0-POMO-039.md为准。源码、安装版公开发布、真实更新检测及独立最终复核全部PASS，未操作用户安装/重启或根控制面。
- 科学休息原位设置策略：每日番茄目标默认12（0–60整数，0仅额度），提醒间隔默认5分钟（1–60整数），每日额度默认60分钟（5–480，5步进），督促默认true。设置立即生效、重启恢复，不补弹已有用量；未达目标的额度内按累计间隔提醒，达标停止早期提醒，超额当即及按超额间隔追加，不交错两套提醒。完成数直接用现有saved/ready/owner与本地开始日期，不建立第二历史源。
- 已验证269/269逻辑（p039-logic-final.txt），包括8/3/45策略、0目标、非法值仍保持旧配置、旧70schema默认12/5且同日不倒放；45/7不整除时42早期、45无、45+即刻、49/51.99无、52有、56无、59有。保留午夜、进度未知、关督促仍采集、持久失败暂停提醒等正反路径。最初sandbox esbuild权限故障精确分类后用正常权限跑现有测试通过，不改产品安全或跳过断言。
- 生产UI17组（p039-ui.txt）：90/15/3实际生效，关监督仍记录，reload恢复三值；恢复默认继续既有回归。设置卡168.14px≤月历192.14px，scrollHeight170/client128，保存按钮滚动后443.07–487.07在容器359.09–487.09及视口764内；窄屏无横向溢出，提示仍标题/一行/两按钮。计时21组＋实际进程restart（p039-desktop.txt）、竖屏14组（p039-portrait.txt）PASS。截图未作为本轮验证依据。
- 冻结来源沿用ACTIVITYWATCH.md：AW13.2、WebWatcher0.6.0官方REST/URL/前台/非AFK或有声交集不改。发布用Electron34.5.8、updater6.8.3、builder25.1.8、gh2.97.0原生机制，无新依赖、浏览历史副本或上传个人设置。
- 包源/annotated tag固定9464dc7c6169fc82f18598161135f70c212dd25d，dirty=false，version0.1.0-preview.71；tag对象5d4efc6dc757a179aab2df2cc6681fb591fb8b7f。生产代码相对25445c的最后变化仅已审查保存可达性测试。干净build/package通过（p039-build-release.txt、p039-package.txt）；ASAR66个build文件逐一匹配，本机实际包exe隐藏静音临时profile启动退出0。独立reviewer重算本地六构建文件SHA256/size、setup SHA512/feed两处与ASAR66，无差异（release71-package-acceptance.json、p039-package-verify.txt）。便携构建仅留本机，不属于公开交付。
- 公开安装版：[preview.71](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.71)，publishedAt2026-10-07T09:49:50Z，isDraft=false/isPrerelease=true，未设Stable Latest。五资产全uploaded，ID及下表size/SHA256与草稿/本地清单相同（release71-remote-draft.json、release71-remote-public.json）；不clobber、旧70六资产ID/name/size/digest/state零差异（release71-old70-unchanged.json）。
- 来源分支：公开默认分支codex/feishu-focus，发布时9cfec61f837e05c31213b53eafa3727b45bdc86e；相对包源仅任务及验收两文档。最后本次规则/Learning/回执提交非force同步，tag和二进制仍固定9464dc7。其他Codex先fetch/check:sync再接力，源码与已安装App分别更新。运行代码未因文档收口重构建或换同号产物。

| 公开附件 | 字节 | SHA256 |
| --- | ---: | --- |
| Pomatez-Focus-v0.1.0-preview.71-win-x64-setup.exe | 75448742 | 84898f65dcb14a2fcdd4317a919f78a322b7041d463778efd5364cceef021678 |
| Pomatez-Focus-v0.1.0-preview.71-win-x64-setup.exe.blockmap | 78775 | 6235798e7024caed9f1ab1a7e419cd202108115325e625ce1587f8cce23ace24 |
| preview.yml | 405 | 9a2c9685f0225ad360b2e1a4b478b099326bfe74eb357a79c85d9d18765afe46 |
| source-version.json | 107 | be562c1e138f2e9ed4082b7fe745229d3c355d9836113a581b71915cba0d5f69 |
| SHA256SUMS.txt | 524 | 2815b6e9427d33316c404eadc41462a12d8abc79c5b402c9b0ef29ed05fa2251 |

- 真实70→71检测PASS（release71-live-update.json、p039-live-update.txt）：同生产FocusUpdater、NsisUpdater和原ElectronHttpExecutor，构造前设app版本70且断言currentVersion70；公开同仓/preview渠道，无替代provider/transport。state=available、detectedVersion71、errors=[]；唯一setup URL与75448742字节/SHA512 ReKN/+nmv48jod+tpzgC/oqAqROI8oxZUDxTlykf6Kh9YDLDr4hINsRI1gQeyZdE8Q1oiDNcVepahNlT5ahyUg==精确匹配本地feed。autoDownload=false、autoInstallOnAppQuit=false，下载/安装事件0。App手动下载/安装仍复用现有官方NSIS及已验收校验/延后安装生命周期；用户实际点击安装未回报，不声称已替用户更新。
- 既往上传分类：首轮六文件并发停滞，四小附件完整；仅终止精确本任务gh进程，缺失exe逐个一次300000ms重试，setup成功，portable的spawnSync gh ETIMEDOUT/errno=-4039后停止，原因unknown，不修改网络/代理/身份。用户随后明确便携包非目标，按固定NsisUpdater.js L31–50及AppUpdater.js L642–709和真实检测证明五附件足够安装版；没继续portable重试或建立后续任务。发布说明明确安装版，SHA256SUMS保留的便携校验行仅本地构建信息。
- 已恢复的草稿/tag404：发布前无鉴权Atom首entry选择71，草稿feed请求404后回退同71/latest.yml并报ERR_UPDATER_CHANNEL_FILE_NOT_FOUND；未下载/安装。固定GitHubProvider.js L43–80、L105–129与实际请求链一致，不推论所有草稿可见。保留原始p039-update-pending.txt、release71-pending-update.json及诊断文件；五资产公开后真实70→71已恢复PASS。未通过API绕过immutable hook、未撤/替tag或旧资产，也没修补产品更新器。
- Learning已由模块协调者登记LEARN-P0-POMO-039-01并获独立语义复核，Evidence就是本文件，根Learning未修改。限定本仓此次Atom虚拟tag，不能把draft当更新健康证明；上传原因unknown不归纳代理或并发教训。配置/包源较早检查点none继续有效。

原始Learning证据的最小非敏感摘录及固定hash：
- 公共Atom SHA256=14a54b39a8a91890809689d1919c40ca19aa1827234010eb94233b87b19d7133；首entry link href原文为 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.71 ，title为v0.1.0-preview.71，content为本轮tag message：P0-POMO-039 configurable scientific rest strategy。
- 请求JSON SHA256=f058a152de2457147bcfd3e849712ec23b92262bf86c871dbb958d324b152043。三请求依次 /Luoddu/pomatez-focus/releases.atom 、/Luoddu/pomatez-focus/releases/download/v0.1.0-preview.71/preview.yml 、同路径latest.yml；authorizationPresent均false。
- 首次pending结果JSON SHA256=cb2f9886d837754f7ddf5b7db632492c4cac99fcc9aa7c9ea3e0263b85ae642e；currentVersion70、state=error、errors首code=ERR_UPDATER_CHANNEL_FILE_NOT_FOUND、下载/安装事件0。当前公开后的恢复结果见上方真实检测段；完整原文仅留忽略证据区。
- 最终独立review_scientific_rest按用户安装版范围给出公开发布PASS：逐项重算本地与远端五附件、tag/运行来源、旧70及原生70→71结果；Learning文字按其建议精确为请求preview.yml失败，不错误断言feed没上传。无未关闭范围内问题，最后规则/回执安全提交并非force同步，不替换现有Release资产。
