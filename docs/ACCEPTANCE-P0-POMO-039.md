# P0-POMO-039 自定义科学休息策略与更新发布验收

- PARTIAL / 发布BLOCKED：实现、生产界面、源码推送与包源复核PASS；便携包二次同类上传超时，按停止线保留草稿、停止本轮发布，不报告完整推送DONE。授权、四源自检、范围、正反验收、预算与回滚见唯一状态源 TASK-P0-POMO-039.md。根主线及用户运行状态未修改。
- 基线c558f217含已独立通过但未公开的038提醒策略。新目标来自用户“之后自行设置，然后推送”：默认番茄目标12、间隔5分钟、额度60分钟，三项分别支持0–60整数（0仅额度）、1–60整数、5–480分钟且5步进；既有督促开关保持。入口改为设置策略，三输入和保存均在原卡内部，固定高度128px并允许内部滚动。
- 未达目标的额度内按累计浏览间隔提醒；达到目标则停止早期督促；超额当即提示并仅按超额间隔追加。与旧默认不同的额度/间隔不能整除也不会交错触发两套提醒。保存策略、开关恢复、重启及合法旧账本迁移都消费已有档位，避免补弹；仍直接使用已确认番茄记录与ready/owner口径，没有第二历史源。
- 固定第三方来源及官方查询沿用ACTIVITYWATCH.md，未改AW/API/依赖/网络边界；Electron34.5.8、updater6.8.3、builder25.1.8和gh2.97.0既有发布路径。配置和聚合数据只落用户本机，原始URL/标题不进入农场、Git或Release。
- 已验证：269/269逻辑（artifacts/p039-logic-final.txt）。含自定义8/3/45达标前后阈值、0目标、非法值保持旧策略、旧70schema默认12/5及同日不倒放；独立复核发现的不整除边界已修正，45/7验证42早期、45不弹、45+即时、49/51.99不弹、52弹、56不弹、59弹。保持既有午夜、未知进度、保存失败及开关正反覆盖。沙箱esbuild上层目录权限失败已定位并用既有正常权限测试复核，不改变产品权限或跳过断言。
- 已验证：17组生产科学休息真实UI（p039-ui.txt）；自定90/15/3保存后实际生效、督促关仍记录、reload保留三值，最后恢复默认以继续回归。设置卡168.14px≤月历192.14px，无横向溢出；内部scrollHeight170/clientHeight128，保存按钮scrollIntoView后443.07–487.07px在容器359.09–487.09px内且视口764px，原位滚动可达。弹窗仍为标题、一行字、两个按钮。21计时组＋真正进程restart（p039-desktop.txt）、14竖屏组（p039-portrait.txt）通过。截图不作为本轮验收依据。
- 实际包源/新annotated tag固定 `9464dc7c6169fc82f18598161135f70c212dd25d`，dirty=false，version=0.1.0-preview.71。运行源码相对25445c的最后变化仅已审查的保存可达性测试。干净build/package（p039-build-release.txt、p039-package.txt）完成，ASAR66个build文件逐一相同，包内版本71且updater完整打包。包程序用隐藏静音临时profile启动退出0，不使用用户正在运行的App。
- 包源独立复核PASS：review_scientific_rest只读重算下列六附件SHA256/size、setup SHA512/feed两处及ASAR66文件，无差异。原始证据release71-package-acceptance.json、p039-package-verify.txt；公开发布门禁另核远端，不以本地包或draft代替。

| 附件 | 字节 | SHA256 |
| --- | ---: | --- |
| Pomatez-Focus-v0.1.0-preview.71-win-x64-setup.exe | 75448742 | 84898f65dcb14a2fcdd4317a919f78a322b7041d463778efd5364cceef021678 |
| Pomatez-Focus-v0.1.0-preview.71-win-x64-portable.exe | 75297432 | 57ab644c9f8fb2478faf31cf50725e0b6b9616a03d706b39b1571362cc8af801 |
| Pomatez-Focus-v0.1.0-preview.71-win-x64-setup.exe.blockmap | 78775 | 6235798e7024caed9f1ab1a7e419cd202108115325e625ce1587f8cce23ace24 |
| preview.yml | 405 | 9a2c9685f0225ad360b2e1a4b478b099326bfe74eb357a79c85d9d18765afe46 |
| source-version.json | 107 | be562c1e138f2e9ed4082b7fe745229d3c355d9836113a581b71915cba0d5f69 |
| SHA256SUMS.txt | 524 | 2815b6e9427d33316c404eadc41462a12d8abc79c5b402c9b0ef29ed05fa2251 |

- 源码非force推送至既有codex/feishu-focus，新tag71固定包源；先建draft prerelease，准确六附件单次上传，不clobber旧资产，不设Stable Latest。最终远端五附件uploaded/hash/size正确，便携包缺失，isDraft=true/isPrerelease=true；完整六资产及公开验收未完成，不提供公开新版可检测承诺。快照release71-final-pending.json；旧70六附件的ID/name/size/digest/state逐项不变（release71-old70-unchanged.json）。
- 上传T0：首轮gh六附件并发执行长时间停滞，四小附件已uploaded且hash/size正确，两exe远端不存在；精确PID74808/启动16:51:24的本任务gh进程仅结束该上传，原session退出1，原因unknown，不据一次I/O=0采样推定代理根因，不修改代理/身份/网络配置。原始四附件快照release71-after-stalled-upload.json保全。固定[gh2.97.0上传命令源码L60、L99–109](https://github.com/cli/cli/blob/v2.97.0/pkg/cmd/release/upload/upload.go)及[共享上传源码L110–151、L171–195](https://github.com/cli/cli/blob/v2.97.0/pkg/cmd/release/shared/upload.go)证实官方并发5、同名拒绝、内建最多3次网络/5xx重试；平台内部重试不作人工次数。协调者仅对远端缺失exe逐个一次官方gh有界重试，5分钟/文件，之前逐项核已完成hash/state，有同名正确资产则跳过、不同则停止；不用clobber、不造第三套发布路径。再超时即停止冲突发布步骤、保全草稿，其他已验收功能不回滚。
- 有界缺失附件重试：setup单次成功，远端75448742/SHA25684898f65…匹配；随后portable单次300000ms超时，原始错误 `spawnSync gh ETIMEDOUT`、errno=-4039、helper退出1。结束后远端仍仅五附件且draft=true，无遗留本任务gh进程。首轮停滞与第二同类超时根因unknown，未追加第三次重试、不修改网络路由、不公开不完整Release。可恢复产物和五既有附件保留；后续需要网络上传链路根级分类，再续同一固定包源缺失资产，不能clobber或换源伪装同号。
- 发布前真实70版NsisUpdater/ElectronHttpExecutor返回70/current（release71-before-update.json），构造前设置app.getVersion并断言currentVersion=70。完整公开后71/available、对应setup URL/size/SHA512尚未完成；所有真实测试autoDownload=false、autoInstallOnAppQuit=false，不安装或重启用户软件。
- 草稿/tag恢复T0已验证：再次真实70检查返回error/ERR_UPDATER_CHANNEL_FILE_NOT_FOUND，未下载/安装。保留p039-update-pending.txt、release71-pending-update.json；诊断仅包裹原ElectronHttpExecutor记录响应，未替换provider/transport，release71-public-feed.xml首entry链接为71，content为本轮annotated tag message；release71-update-requests.json三次请求均无Authorization，依次公共releases.atom→71/preview.yml→71/latest.yml。固定updater6.8.3 GitHubProvider.js L43–80选首个同preview tag，L105–129只对该tag回退latest.yml，未回退70。因此当前旧版更新检查受影响，不谎称draft被忽略或渠道已恢复；这不能泛化所有GitHub draft的行为。
- 回滚门禁：本任务新远端annotated71对象5d4efc6dc757a179aab2df2cc6681fb591fb8b7f、peeled9464dc7，本地仍保留。但.githooks/pre-push将任何已有preview ref删改都拒绝为immutable；未通过API绕过hook、未修改hook、未撤标签或换包源。模块AGENTS第6条要求六附件，因此未自行公开只有五附件的草稿。已询问用户是否允许本次仅发布已验收安装版来交付策略并恢复更新；便携版后续处理，回答前不执行公开操作。
- 用户安装尚未回报；本任务只交付已授权源码、公开更新包与可检测结果。70旧资产保留，未来修复用更高版本，个人配置和历史不上传。
- 配置与包源检查点Learning判断none：迁移、固定高度内部滚动及包源验收复用现有模式；上传原因unknown，单次顺序成功不足以归纳代理或并发教训。发布恢复检查点判断candidate，具体见下一条；独立复核已关闭不整除提醒及保存可达性问题，不将实现PASS替代完整发布PASS。
- 独立复核提出Learning候选：本仓preview标签创建后必须检验旧版真实更新可用性，不能把Release草稿当作可见性证明。候选已由上述原始Atom、请求和固定Provider链路支持；本模块写集禁止根Learning，故交回候选，不冒充已经根登记，后续REVIEW/DONE前须由对应协调者记录或给明确拒绝理由。当前状态仍为发布BLOCKED/等待用户调整交付范围。
- 原始证据固定：公共Atom SHA256=14a54b39a8a91890809689d1919c40ca19aa1827234010eb94233b87b19d7133，请求JSON=f058a152de2457147bcfd3e849712ec23b92262bf86c871dbb958d324b152043，第一次pending结果JSON=cb2f9886d837754f7ddf5b7db632492c4cac99fcc9aa7c9ea3e0263b85ae642e。Atom首entry原文link的href为 `https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.71`，title为 `v0.1.0-preview.71`，content为本轮tag message `P0-POMO-039 configurable scientific rest strategy`。三公共请求依次为 `/Luoddu/pomatez-focus/releases.atom`、`/Luoddu/pomatez-focus/releases/download/v0.1.0-preview.71/preview.yml`、同路径 `latest.yml`，authorizationPresent均false；真实结果currentVersion70、state=error、errors首code=ERR_UPDATER_CHANNEL_FILE_NOT_FOUND、下载/安装事件0。这份最小非敏感原始摘录随候选同commit留存，完整原始文件只在忽略证据区。
- 独立条件化复核：固定NsisUpdater.js L31–50由feed的files选择setup exe，AppUpdater.js L642–709用blockmap及完整setup，未引用portable。本feed仅有setup，因此现有五资产足够安装版更新链路；用户明确批准本次仅安装版后才可公开，发布说明须写明便携版未发布，SHA256SUMS中的便携校验仅代表保留的本地产物。公开后五asset ID/hash/size不变、tag/包源固定、真实70→71 available/errors[]及旧70不变仍需最终核验，当前不得写成PASS。
