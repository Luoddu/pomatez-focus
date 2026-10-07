# P0-POMO-037 更新发布验收

- DONE；本轮干净源码构建、GitHub六资产校验、非draft发布、真实更新检测及独立最终复核全部通过。授权、四源、写集与停止/回滚以TASK-P0-POMO-037.md为准，未全部满足不报告推送完成。
- 源基线为已公开c1dcae6，运行科学休息代码与035独立复核PASS版本相同；本次运行改动仅preview.69到preview.70两处版本值。69本地包保留，70由既有版本工具选择，未手改版本守卫。
- 规则明确在AGENTS.md第6条与DEVELOPMENT发布流程：普通“推送”包括源码/完整Windows prerelease/客户端检测；明确“只推源码”仍单独止于源码。未授权安装/重启不做，Mac个人版仍独立月度。
- 已读取固定electron-updater6.8.3 GitHubProvider公开发布feed和preview.yml选择逻辑，gh2.97.0官方help的draft/target/verify-tag/assets/edit参数；使用官方CLI自身认证，不提取或存储token，不使用旧无限重试发布脚本。
- 本轮实际构建/标签源码：`ccd3df25a8c5fea5bb2d3a56ec47056765e9211d`，dirty=false、version=`0.1.0-preview.70`；公开主线由c1dcae6非force快进到该SHA，annotated新tag70精确固定同commit。没有替换68/69。最后纯文档回执另作提交，tag/包源继续固定该SHA。
- 已验证：`test-focus-all`257/257；真实Electron计时21组＋实际进程重启、竖屏14组、分类8组、科学休息12组全部通过。既有updater负例真实HTTP404/错误SHA512拒绝，正常check/download/defer/install生命周期通过（只有测试Mock可安装，真实负例未安装）。证据artifacts/release70-logic.txt、release70-test-*.txt、release70-activitywatch-ui.txt、release70-updater-negative.txt。
- 已验证：干净源码build/package完成；实际打包exe在独立临时profile中隐藏静音启动退出0，未触碰当前用户App。asar内source/version与代码一致、updater为依固定版本esbuild生成的完整bundle，没有裸依赖引用。独立reviewer只读重算六本地附件SHA256/size、setup SHA512，并比较asar58个build文件均一致，冻结上线前门禁PASS。
- [公开preview.70 Release](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.70) 于2026-10-07T04:33:38Z发布，draft=false/prerelease=true。先上传draft、远端六资产全uploaded且size与GitHub SHA256 digest逐项符合下表后，再公开发布；公开后再复核全部六项及tag/源码相同。证据artifacts/release70-remote-draft.json、release70-remote-public.json。采用官方gh2.97.0，无无限重试、clobber、外部消息或凭证文件。

| 附件 | 字节 | SHA256 |
| --- | ---: | --- |
| Pomatez-Focus-v0.1.0-preview.70-win-x64-setup.exe | 75443867 | 69e8c73e5f37e7bb9a24d30fe6fef83f2973cc0e0156b859f738a48e9e37110b |
| Pomatez-Focus-v0.1.0-preview.70-win-x64-portable.exe | 75292539 | b7db4991c7a39505f8e8d39e7d27be96a08d04a87f35d224ebf8a4a1b8e2b651 |
| Pomatez-Focus-v0.1.0-preview.70-win-x64-setup.exe.blockmap | 79134 | 739b808fb7ba67aca052b8884cfdcdc2485acddc2cc7ae60ef4d99d766f27e21 |
| preview.yml | 405 | 1045b9c0892042a3dc201628d77f82660305e9b4686b9b7c914fb4da44c56edb |
| source-version.json | 107 | bbb6f71d062c45a9ead027963eb0a2520df55ce66c4e3178bbccfe8980348237 |
| SHA256SUMS.txt | 524 | d7ccd575ae685a7778aff4d0cc8d83c2b561d269f8d52a37594ab38686389ccf |

- 已验证：setup实际SHA512与preview.yml顶层及files记录相同，版本/URL/size正确。既有68六公开附件的原始digest再读均未改变（artifacts/release70-old68-unchanged.json）；69本地安装/便携包仍保留，没有复用其号码发布不同源码。
- 客户端更新检测已验证：同应用实际FocusUpdater和固定版NsisUpdater/ElectronHttpExecutor，构造前设置测试App版本68并断言currentVersion确为68；不替换provider/network、不启额外代理或通道。发布前真实公开feed返回68/state=current；发布后返回70/state=available、正确setup URL/size75443867/SHA512，errors=[]。autoDownload=false、autoInstallOnAppQuit=false、下载/安装事件均0；测试只用隐藏临时profile。原始证据artifacts/release70-before-update.json、release70-live-update.json、release70-live-check.txt；不以GitHub页存在代替客户端检测。
- 用户安装/点击检查更新尚未由用户回报；本次验收已经覆盖相同更新器及公网更新渠道，未自动操作用户正在运行的App。现在用户可在现有农场里点击检查更新、手动下载/安装；专注期间原有更新延后安装逻辑保持。失败回滚保留旧68包，后续修复使用新版本，不改写已公开70资产。
- 最终独立reviewer `/root/review_scientific_rest` 对固定源码、六远端附件状态/ID/哈希、非draft状态、旧68完整性与68→70真实检测证据给出PASS，无未关闭阻断；复核只读原始证据，未独立启动应用或执行外部写入。包/临时profile/日志不进Git，公开release仅六个明确附件，发布说明不包含私人任务或浏览历史。
- Learning判断none：复用原版本、构建、GH发布和官方更新器生命周期；产品“推送”含义由用户明确修正，无新增跨任务验证教训。
