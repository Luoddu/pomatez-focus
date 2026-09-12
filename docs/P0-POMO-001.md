# P0-POMO-001 — preview.17 公开源码快照

- 角色：模块实现与发布；状态源为本卡，验收见 ACCEPTANCE.md。
- 授权：用户明确要求导出打码截图后推送至自己的 GitHub。仅推送 Luoddu/pomatez-focus 的 codex/feishu-focus；不发布安装包、不触碰上游远端。
- 基线：公开提交 511633f61d2a221c2d2cba4c04560129aebc5efa。导出最新开发源码，以单独提交衔接公开历史，不推送带有私人截图的开发中间提交。
- 允许写集：README.md、.gitattributes、app/ 中本版变更、package.json、tests/ 本版回归、scripts/gen-logo.cjs、scripts/shot-readme.cjs，以及 docs/ 当前使用说明、来源、验收、本卡和打码 desktop.png。实际提交必须使用显式文件清单。
- 不纳入：design/ 原始截图、私人任务示例、凭证、运行配置、用户数据、构建产物、临时工具、开发中间历史；不修改根项目共享控制文件。
- 独占资源：独立发布 worktree；测试使用隔离 profile 和隐藏窗口，不停止用户运行中的 App。
- 上下文：模块执行卡、版本控制约束、当前代码、README、现有验收与本地提交扫描器。第三方接口未变，不加载无关根架构与历史全文。
- 升级：远端发生并发改动、发现敏感数据、测试功能回归或目标分支变化时暂停相应发布步骤，查明原因。
- 并发复核：导出前、构建后、提交与推送前核对 HEAD、工作树与远端；不覆盖其他写者。
- 预算：不启用子 Agent、计划任务或持久后台；一轮构建与关联回归，失败按根因定位；发布只做一次明确快进推送，不盲目重放外部副作用。
- 验收：公开截图无法读出任务内容且布局可辨；私人历史不随推送进入远端且公开上游历史仍保留；打码不影响计时/同步功能且模拟测试通过；不写真实账户且隔离桌面流程仍可运行。
- 回滚：推送前可保留独立分支；推送后通过后续修正提交回滚，不 force、不改写共享历史。开发分支与用户安装目录不变。

## 四处自检

1. 当前现状：公开分支停留于 preview.1 时期；最新源码包含四象限、农场、原表回写、补记和手动同步；开发历史包含旧截图，需选择性导出。
2. 第三方：复用既有锁文件及 Electron 34.5.8/Pomatez v1.11.0，未改变第三方运行语义；来源与固定提交见 UPSTREAM.md。无需新增接口调研。
3. Learning/helper：复用现有显式路径提交、工作树/暂存区扫描以及 shot-readme 导出工具；不新增凭证或运行服务。
4. 同类验收：复用会话/飞书/计划/生成/周统计测试与 manual-sync-desktop 隔离桌面脚本；本次重跑结果写入 ACCEPTANCE.md。

Learning 判断：本次采用已有隐私导出和隔离提交机制，没有发现需要新设工程规则的可复用教训；不向根 Learning 写入模块发布状态。
## preview.17 Windows 下载包发布（2026-09-12）

用户追加明确授权：将新版便携包一起发布到 GitHub Releases。此前“不发布安装包”仅描述上一阶段范围，本阶段由本条取代。

- 基线：553c2cdc4b8718e418807090dc7d1f8180ff7355；公开源码已脱敏且构建/逻辑/桌面检查通过。
- 允许写集：本卡、README.md、ACCEPTANCE.md、CHANGELOG-FOCUS.md、docs/RELEASE-preview.17.md；本地忽略的 dist/artifacts 产物及发布工具输出。允许创建 v0.1.0-preview.17 预发布和上传 portable EXE、SHA256SUMS.txt；不改旧 Release、不推送开发历史。
- 独占运行资源：当前独立发布 worktree 和随机隔离 smoke profile；隐藏运行，不关闭用户 App。
- 四处自检：现状为源码 preview.17/可下载包 preview.1；固定 electron-builder 25.1.8 和既有 package-focus helper；GitHub CLI create --help 明确 target、draft、prerelease 和资产上传流程；复用既有归档检查与隐藏便携启动 smoke。
- 验收：新下载包可启动且无真实账户访问，包内无个人任务/配置且 MIT LICENSE 保留，远端标签指向本版源码且上传资产大小/摘要与本地一致。
- 预算：一轮打包、归档与启动验证；一份预发布；失败查明原因并核对远端状态后再决定恢复，不重复创建。
- 回滚：保留旧版 Release；新包有问题时发布说明并通过后续修正版替换，不 force 改写 Git 历史。
- Learning：使用既有打包、隔离验证与发布流程，未产生新的跨任务工程教训。