# P0-POMO-046 preview.80 安装版发布

- IN_PROGRESS；隔离模块状态源；owner /root。用户明确“推送”，按AGENTS和DEVELOPMENT授权公开源码、Windows NSIS preview发布及前版真实更新检测；不自动安装或重启用户App，不交付便携包，不改Mac。
- 基线74f2f06fa9b308e30a5613c79fe5063419e6953c，运行源633ed8a独立复核PASS；实时fetch/check:sync确认canonical c4fee83bb570ebe2a6fb008c5ed527e8d9afbd50已包含、maxPreview78、clean。单worktree分支task/p0-pomo-046-release80，串行独占本clone及artifacts/release80和隔离测试profile，绿灯；无用户AW/Edge/数据库/服务控制。
- 写集仅本卡、docs/ACCEPTANCE-P0-POMO-046.md、CHANGELOG.md；版本helper必要时electron/package.json、SettingsPanel.tsx。ignored artifacts只合成测试、发布证据和五安装资产，不纳入用户配置、身份、记录、机器路径或私人截图。禁止修改产品逻辑、根控制面、第三方包和网络配置。
- 四处预检：①P045源码DONE/304逻辑/旅程20/AW25/overview7/portrait14/desktop21+恢复及633独立PASS；本次干净build须绑定最终发布HEAD。②固定electron-builder/app-builder-lib25.1.8、Electron34.5.8、electron-updater6.8.3沿用原发布公开NSIS目标和GitHub preview配置，不改变第三方语义；P044官方NsisTarget机制与成品/真实更新证据复用。③repo-sync/next-version/build/task-commit/push及ignored verify-package78/verify-release78/check-public-update78复用；Learning039要求草稿五资产先齐、新tag立即公开、旧版真实验证，042不适用未改采集。④P044安装ASAR全文件比对/成品静默smoke/五资产SHA256与feed SHA512/真实旧版更新链复用；补跑所需category桌面验收，测试一律headless+mute。
- 正反验收：正常新源clean build与ASAR一致/NSIS成品可启动，陈旧dirty/同号产物由既有guard拒绝；五uploaded资产大小和SHA256正确、setup/feed版本size/SHA512一致，旧78标签和资产不变、不替换旧包；canonical非force同步可用，远端前进时guard拒绝未包含源码；新tag固定确切source，草稿先核验后公开nonlatest prerelease；真实旧78更新器发现available79且正确setup地址，0下载/安装、不触用户profile；已有科研监督和旅程源码已验收，本次不改其策略。
- 执行：version prepare、显式源准备提交、最终clean build、同package-focus全部前置guard后使用固定官方CLI仅NSIS target、成品比对/静默smoke、独立只读review、push-focus、草稿上传五资产校验后annotated tag与立即公开、真实旧78检测、公开/旧资产比对、回执DONE文档原子提交与源码同步。允许既有review_scientific_rest一次有界包源/五资产/真实更新原始证据只读复核，不写入、不操作用户App、不再分派；不新建Agent。
- 预算/停止：本轮前台发布；短时进程结束即停，无长期后台。只读瞬时故障最多自动重试一次；同因unknown两次停对应步骤。若再次NSIS outfile失败遵P044 STOP_PATCH_CASCADE，先完整链分类，不同层追加补丁；外部写入先复核目标/状态，不盲重放。公开前后及提交前status/worktree/实时canonical复核，实质冲突只暂停对应步骤。
- 回滚：发布前保留旧78可安装版本；新源码可显式revert，旧tag/包不改；发布后修复用新版本，不复用79替换。Learning none：复用已验证发布路径，未形成新增跨任务工程教训；独立复核/最终回执再判断。
