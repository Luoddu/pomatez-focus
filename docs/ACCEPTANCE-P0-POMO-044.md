# P0-POMO-044 验收

- DONE。合同/四处预检/基线/授权/写集/资源/正反定义/回滚见TASK-P0-POMO-044.md；最终固定运行源f7d6460985a50fb9becc3e397e137e234e232a74 / preview.78，交付证据见后述。
- 已验证：旅程12项纯逻辑，默认顺序/跨段任务守恒/同段插入、真实多数量记录单位唯一、活动未填色与锁定/放弃0数量、来源日期隔离、数量修正、次日稳定引用/无planId持久化、保护已完阶段/预算、手动休息/坏数据保留/存储失败、50粒旗路。tests/journey.test.mjs固定本地日内合成时间。
- 已验证：生产Electron main/preload/renderer两个独立进程、同一隔离profile，13组旅程检查（artifacts/journey-plan-checks.json、journey-resume-checks.json）。3已确认→填3，拖动3+4并保留任务，活动更换保留session id/startedAt，确认仅1记录填1、放弃不填；预设明日两个任务分别选择，真实进程重启加次日合成日历恢复，新planId解析、旧日不填；缺失任务拒绝且不自由替代，坏JSON不覆盖且历史仍可读；保存故障无假启动、恢复写入正常。合成服务桩无真实外部写入，不操作用户App或profile。
- 部分确认：拖动使用DOM公开DragEvent/DataTransfer进入真实生产事件处理，不声称用户鼠标真实拖动已验收；布局几何确认同半列、相同左边、位于今日番茄下方且无横溢出，最终portrait/overview回归待补。人工真实用户任务与多机本地预设同步不属于本轮验收。
- 故障分类：隔离故障注入的executeJavaScript最后表达式返回函数，Electron IPC无法克隆；定位FAILED-JS原始表达式，改测试为void返回，不改IPC或权限。空值比较使无活动时下一轮廓入口缺失已由真实桌面复现并修正；保存失败提示被例行记录协调成功清掉、嵌套attempt清掉缺失任务错误均按精确调用链修正，真实正反通过。没有将测试IPC错误升级为系统产品补丁。
- 性能边界：复用CounterProvider唯一计时器，旅程没有setInterval/新进程；完成关联和任务候选按plan/records/tasks做memo，秒tick不读写旅程存储，不扫描全部历史。记录事件、来源/日期变化、人工安排才有有界协调/写盘；单日最多20段100轮廓。短测试进程数记录在上述JSON，不等于长期各机性能保证。
- Learning判断：none，复用现有计时、日期来源隔离和039不可变发布路径；本次业务空值/提示修复有局部测试但未形成需推广的新工程教训。

- 独立复核1179bd8两项P2：恢复timer存储失败须检查实际同session已active再通过休息节点；同进程跨午夜须核对taskScope已刷新当日，不能用昨日planId。修复后的真实桌面17组PASS（p044-journey-fixed.txt），新增计时键故障仍paused/resting、有效重试同session恢复；同进程改日未刷新拒旧行、显式刷新后新planId启动。保留此前实际新进程次日恢复及缺失/坏数据场景。
- 用户静音要求已落地到headless启动：固定Electron34.5.8官方electron.d.ts L879–884 web-contents-created、L16700–16703 setAudioMuted，注册早于创建任意窗口；Chromium启动mute-audio加公开contents静音，正常模式不执行。真实测试主窗口/新peer contents isAudioMuted=true，每阶段断言；测试launcher也传--mute-audio，未修改用户提示音偏好。
- 固定构建布局回归overview7/7、portrait14/14、AW监督23/23 PASS（p044-overview.txt、p044-portrait.txt、p044-aw.txt）；右列380且四象限比例/月历半小时/原策略/原生两按钮保持，原真滚轮/真实用户拖动限制保持。
- 77中间NSIS失败分类：输出Can't open output file，只有154204字节uninstaller生成器中间文件；同目录合成写探针和当前该文件独占ReadWrite打开均PASS，当前无77生成器进程。固定app-builder-lib25.1.8 NsisTarget.js computeScriptAndSignUninstaller公开机制先写同outfile生成器、执行生成卸载器后再正式makensis；瞬时占用具体owner unknown，不声称已确定根因，不修改依赖/安全工具。77不覆盖、不发布；按既有版本helper递增78，再做一次官方路径打包。若同类再次失败停止同层重试、完整链分析。

- 最终固定源 f7d6460985a50fb9becc3e397e137e234e232a74 / preview.78：源码独立PASS，两P2关闭。完整逻辑297/297（p044-all-fixed.txt），干净build dirty=false（p044-build-final.txt），最终静音旅程17/17（p044-journey-release-final.txt）及AW23/23（p044-aw-release-final.txt）PASS。78官方NSIS打包成功；77只保留中间失败证据，不发布、不覆盖。
- 包源独立PASS：119个build文件与ASAR逐SHA256一致，main/renderer/headless静音均匹配；ASAR版本、build/stage source-version同f7d/dirty=false/78；真实安装版成品hidden+mute smoke退出0。五安装附件所有size/SHA256和setup SHA512匹配feed（release78-package-acceptance.json），不交付便携包。
- 已发布 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.78 。非draft/prerelease/nonlatest，annotated tag peeled固定f7d，canonical非force同步。五草稿资产全部uploaded后才推新tag并立即公开；公开前后asset IDs与size/digests一致，旧76五资产/发布日期/tag不改（release78-remote-draft.json、release78-remote-public.json、release78-old76-before.json、release78-upload-result.json）。tag首推hook只读ls-remote一次schannel握手失败，重新只读核对固定canonical与无tag后幂等推送同tag成功，没有绕hooks、改网络或禁TLS验证。
- 真实生产FocusUpdater/NSIS preview配置在隔离静音Electron以旧76检查：发布前current76，发布后available78，setup URL/size/SHA512与公开feed一致，autoDownload=false、autoInstallOnAppQuit=false，下载/安装0、errors[]（release78-before-update.json、release78-live-update.json）。用户仍在App设置手动下载和安装，没有替用户安装或重启。
- 发布Learning判断：none，沿用039先五资产后新tag立即公开、包源与原生更新路径；77瞬时占用owner不明不登记成根因教训。本机/合成和真实用户输入范围仍按上述限制，不宣称跨机预设同步或人手鼠标拖动验收。

- 最终公开交付独立PASS：固定原始远端JSON/草稿/包清单和原生76→78更新回执独立对比，五资产/source/tag/feed/安装链一致。reviewer额外只读GH查询遇api.github.com连接失败，结论依据已固定原始证据与独立本地重算，不宣称该时刻独立公网复验成功；未重试或改网络。仅卡/回执DONE文档提交，运行tag和五资产不动，无新Learning候选或未收口产品问题。
