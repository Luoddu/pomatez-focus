# P0-POMO-037 明确推送规则并发布科学休息更新

- DONE；本卡为隔离模块状态源，负责人/协调者Codex `/root`。2026-10-07用户明确“明确，并完成本次推送”，授权修改本模块推送约定、非强制同步源码、在既有 `Luoddu/pomatez-focus` 创建Windows preview prerelease并上传更新附件，验证preview.68可检测新版。不操作用户当前安装/进程、真实飞书或其他电脑，不改根共享文件。
- 基线 `c1dcae6a3571ea70dde3d1efab665e1f7e807079` 与实时公开 `codex/feishu-focus` 相同，工作树干净；025/035旧源完整保全。版本工具查询公开最高68，本地69包/旧任务分支已占用69，依原工具采用70，保留69文件且不换同号包或tag。运行科学休息逻辑仍为035已独立PASS源码。
- 目标：规则把未加限定的“推送”定义为源码同步＋Windows更新发布＋客户端更新检测验收；“只推源码”例外，Mac既有独立月度模式不变。交付非draft preview.70 Release，六资产uploaded/大小与SHA256一致、preview.yml安装包SHA512正确、tag和包源一致、真实固定版更新器从68检测到70。只完成源码或草稿上传不算DONE。
- 写集：AGENTS.md、docs/DEVELOPMENT.md、本卡、docs/ACCEPTANCE-P0-POMO-037.md、CHANGELOG.md、app/electron/package.json、SettingsPanel版本展示；忽略的artifacts和构建输出仅记录脱敏测试/发布描述/哈希，不能进Git。Git refs为既有源码主线与新preview tag，已有tag/Release/资产不修改，不force。不新增运行依赖、网络服务或设置schema。
- 四源：①用户当前App/截图显示68，基线源码版本69、本次准备源码70，真实GitHub已发布最高68且六资产完整，036只推源码导致无新版渠道。②固定electron-updater6.8.3官方GitHubProvider.js L39–140读取releases.atom并按preview选择tag/preview.yml；本机官方gh release create/edit --help明确draft/target/verify-tag/资产生命周期，采用官方CLI既有认证，不调用旧写token脚本；Electron34.5.8与builder25.1.8沿用固定工具链。③复用scripts/next-version、repo-sync、push-focus、build/package、task-commit/内容扫描，命中根Learning已读无新增候选；不采用旧unbounded上传重试。④复用035的257逻辑/12新桌面/现有UI回归和真实包启动、既有updater真实404/SHA512拒绝测试及mac-release固定Provider测试；新增本次公开feed实际检测证据。
- 范围/资源：原独立clone独占task/p0-pomo-037-update-release，构建使用其独立依赖。AW记录/当前农场用户profile只读保全；测试隐藏、静音、隔离profile。允许同一只读reviewer对冻结规则diff/卡/测试和最终包元数据独立复核（20分钟，禁止启动进程/写文件/发布，不再派Agent）。本工作周期内有界完成，不创建自动监控。
- 正反验收：普通“推送”完成源码和可发现更新，明确“只推源码”仍不发布；新安装包可启动且更新器68能发现70，未授权安装/下载用户App不触发；错误feed/哈希拒绝而正确元数据正常识别；新tag固定实际包源，旧68和本地69不替换；六公开附件皆脱敏、无数据库/浏览记录/凭证，正常公开安装与校验材料仍可访问。
- 发布步骤：先准备版本/测试/独立复核/安全本地提交；干净确切HEAD构建和打包；非force推送主线及新tag，创建draft prerelease，上传完整六资产，用远端size/digest核对后发布非draft，再用本机同版本真实更新器配置检查从68到70。推送后公开分支若漂移先查新commit，不force；有副作用失败先查release/tag/资产状态，禁止盲重放/覆盖。
- 停止线：同因两次且根因不明停止相应步骤；身份/权限失败立即停止外部写入；上传每个资产失败后先查远端，已成功则不重传，未成功在已知瞬时故障时最多一次重试。客户端网络检查最多一次瞬时重试，官方既有transport路径可据证修正，预算不重置。
- 回滚：用户未安装无需回滚用户数据；已有68资产保持可用。新Release在公开前可保留draft不影响更新渠道；公开后发现问题另行修复新版本，不改写旧tag或替换资产。本卡收口记录完整源SHA、命令结果/复核/资产摘要/更新检测/限制/下一步。Learning none：已验证官方生命周期与既有守卫复用，当前产品约定修正不是新的跨任务工程教训。

- 收口：preview.70已于2026-10-07T04:33:38Z公开，tag/包源ccd3df25a8c5fea5bb2d3a56ec47056765e9211d；六远端附件状态/size/SHA256一致，68→70真实更新器state=available、下载/安装0。257逻辑与本轮真实UI/包/更新器正反验收通过，独立最终复核PASS。AGENTS与DEVELOPMENT已明确默认完整推送约定；旧68/69保留，用户App未自动更新。完整回执ACCEPTANCE-P0-POMO-037.md，最后文档提交只同步验收、不改变Release/tag/包源。Learning none沿用已验证生命周期复用判断。
