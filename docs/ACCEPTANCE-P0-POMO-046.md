# P0-POMO-046 发布验收

- DONE；合同、四处预检、正反门禁、授权、允许写集、资源、回滚及Learning判断见TASK-P0-POMO-046.md。
- 已验证：P045冻结运行源633ed8a独立PASS，本轮基线74f2f06干净且包含实时canonical c4fee83；version prepare保持未用preview.80（79为P045分支本地保留号）。
- 已验证：最终发布源8f19a4195bafd2ed6fdcf1b8528f819807e1110f / preview.80，build source-version dirty=false；79仅P045本地分支保留，version helper顺延80，不覆盖同号产物。仅版本展示和发布文档相对已独立PASS633改变，无业务逻辑变更。
- 来源/成品：固定electron-builder25.1.8官方NSIS-only target、原package-focus所有前置guard通过，打包退出0；129个build文件与ASAR逐一一致、包实际版本/source-version一致；真实成品hidden+mute隔离profile启动退出0。原始p046-build-clean.txt、p046-package.txt、p046-verify-package.txt及release80-package-acceptance.json。category真实静默8/8通过；复用P045全逻辑304、旅程20/AW25/overview7/portrait14/desktop21+真实进程恢复；未改运行策略，不重复无关测试。
- 独立包源review：review_scientific_rest独立重算129文件及五附件size/SHA256、setup SHA512/feed/SHA256SUMS，固定8f19源与版本一致PASS；已读成品smoke和category/旧78before原始证据，无运行源漂移。卡中两处79勘误仅文档修正，不改tag/包。
- 已发布：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.80 。非draft/prerelease/nonlatest；五附件均uploaded，公开前后ID/size/SHA256不变；annotated tag peeled精确8f19，源码canonical非force同步；旧78五附件与发布日期未变。五附件仅setup、setup.blockmap、preview.yml、source-version.json、SHA256SUMS.txt；没有便携包。原始release80-remote-draft.json、release80-remote-public.json、release80-old78-before.json、release80-upload-result.json、release80-latest-after.json。
- setup83319007字节，SHA256 3027aa256a2f145e9d439698517087e4128a462bebb271aa2bdd1c05f7f91d35；五远端资产哈希与本地独立复核一致，preview version/size/SHA512与setup一致。资产先齐再推新tag立即公开，遵循Learning039，不更换旧tag或资产。
- 真实生产FocusUpdater/electron-updater6.8.3与GitHub preview NSIS配置，在隔离静默Electron以旧78检测：发布前current78，发布后available80，setup URL/size/SHA512与公开feed完全一致；autoDownload=false、autoInstallOnAppQuit=false、下载/安装0、errors[]。原始release80-before-update.json、release80-live-update.json、p046-update-before.txt、p046-update-public.txt；未自动安装或重启用户App。
- 最终公开独立复核PASS：草稿/公开/包清单五uploaded资产ID/size/SHA256、固定tag/源及原生78→80更新证据一致；reviewer额外一次GH只读查询网络失败，仅据已固定原始远端JSON和独立本地重算结论，不宣称额外实时查询成功。Latest仍preview.51；仅本卡/回执DONE文档检查点同步，运行tag仍固定8f19，不重建或替换安装包。
- Learning none：本次复用已验证NSIS/ASAR/不可变发布/真实更新链，无新增机制或可跨任务新教训。回滚保留旧78，源码显式revert，后续包修复用新号，不覆盖80；root控制面、用户profile/AW/Edge和真实数据均未改。
