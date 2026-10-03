# P0-POMO-033 验收与交接

状态：DONE，已验证产品实现与 Windows 发布。本卡对应 `TASK-P0-POMO-033.md`，基线 `fbeb3d4b406987886995ad49ed58cb775b81790c`。修改范围仅番茄农场模块；无真实凭证读取、真实飞书业务写入或用户 App 安装/重启。

## 四源及并发

四处自检原始结论见执行卡：现状组件/同步链路、固定官方 bitable 源码与 2026 政府通知、既有 helper/Learning、同类合成验收。原生表和记录 API 薄适配，无依赖升级、平行任务源或根系统接入。Habitica 与 Super Productivity 只提供产品模式参考。

首次写入、测试、提交前核对 status/worktree 与基线至实时 origin 差异；模块当前工作树独占，其他历史 worktree 没有命中写集的活动写者。fetch/check:sync 确认公开主线仍为基线，绿灯继续。真实安装与桌面快捷方式不在本轮写集。

## 正反验收

| 用户行为 | 已验证结果 | 对应负例 |
| --- | --- | --- |
| 补记选择科研分类 | 本地立即保存覆盖分类，主进程回执、云快照保持一致 | 任务关联、1500 秒与完成数不改变；原改色/修改流程仍通过 |
| 调整两个周目标 | 科研在前红色，总目标金色；目标修改各自独立 | 达标后科研仍红色，不串总目标；旧科研测试可继续选普通任务 |
| 查月历/统计 | 官方放假与调休上班有不同标记，假日 0 番茄显示安心休息 | 2027 不伪造日期；假日休息不产生失败/扣分提示 |
| 查看晨间与休息 | 08:00–09:30 实际重叠分钟，23:30–08:00 单独分区 | 暂停排除、accepted 上限、跨日和边界均验证；夜间不发开工邀请 |
| 同步刚记录的成果 | 真正回执前低于100%，回读/刷新后才收篮 | 失败没有完成动画，原记录留本机；重试不重复；同步中继续专注可用 |
| 稻草人日记 | 本地写成功后再发请求，隐藏真实 Electron 完成回读/重试 | 断网没有轮询，UUID不变；切换计时/返回看板保留迟到回执；HTML只显示文字 |
| 跨电脑日记/澄留言 | 同一个 Base 的 API 读回一致；当天澄留言纯文本显示 | 跨 Base 拒写，App 不伪装为澄写入；字段/内容冲突不覆盖；夜间覆盖工作留言 |
| 小屏编辑 | 480×640 保存按钮可滚动到并命中，无横向溢出 | 原小屏/竖屏、记录修改和取消流程保持可用 |

## 命令和原始结果

- `npm run test:focus:all`：**240/240**；本机原始 `artifacts/companion-logic.log`。
- `npm run build:focus`：完整 Electron/renderer **PASS**；`artifacts/companion-build.log`。
- 既有 desktop 隐藏静音 runner：**21/21 + 实际进程重启恢复**；`artifacts/companion-core-desktop.log`。
- portrait/category-review：**14/14、8/8**；`artifacts/companion-portrait.log`、`companion-category.log`。
- quick-entry/research：**12/12、8 组通过**；`artifacts/companion-quick.log`、`companion-research.log`。
- `node scripts/test-companion-desktop.cjs`：**12/12**；真实 main/preload/renderer，隐藏静音、独立合成 profile，`artifacts/companion-desktop.json`。其中两条离线日记同时排队时不会因未尝试第二条而自动反复重试第一条；显式重试后全部保存且 UUID 唯一。
- 通过 CDP 捕获并人工查看合成看板、日记、统计截图，确认红金目标、日记按钮与列表、假日提示和晨间分区可读；没有私人任务或凭证，原图仅本机测试产物。

用例故障已定位：初始红色断言使用了另一色值，修正为现有科研色；实际日记失败后按钮因 ref 变化不触发渲染保持禁用，改为明确的 React busy 状态；跨组件卸载回执合入最新持久内容并串行处理。代码审阅补上多条待传日记的失败停止条件，实测没有自动循环。修复后完整相关链路通过。没有绕过桥接信任校验、没有隐藏失败。

## Learning、范围与回滚

Learning-Review：none。复用 LEARN-P1-UI-123-01 的固定意图/UUID和回执核验、现有本地优先投影，以及 React state 控制界面更新；无新的第三方运行机制或可跨根任务新增治理教训，不修改根 Learning。

接口和字段见 `FARM-COMPANION.md`。首次真实保存时才创建“农场日记”；本轮 API 测试是模拟，**尚未在用户真实表执行创建或日记同步验收**。已有连接缺权限时保留本机并显示错误。澄尚未接入，留言读取契约不代表根系统已可用。2026 以外假日未维护；未连接记录不自动绑定新 Base。

回滚到旧包或回滚本任务源码提交；不删除私人日记键/日记表，旧版忽略新增内容。计时和成果格式兼容。下一步由用户安装新版、在已有连接中记录一条日记，观察本机保存与飞书回读；跨机沿用相同 Base。

## Windows 发布回执

- 源码 `0ea360ed6615824af7baa7ed608dc312d54c4e03` 已非强制推送公开主线；版本 `0.1.0-preview.67`。
- 干净源码重新完整构建，再 `npm run package:focus`，包内来源 dirty=false/version/head 与实际源码完全一致。隐藏静音、独立 profile 启动打包后的可执行程序，返回0且输出 `Pomatez Focus ready (hidden)`。
- [preview.67 Release](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.67) 六资产全部上传；远端 state=uploaded、大小及 SHA-256 digest 与本机一致。更新 `preview.yml` 的版本、setup SHA-512和大小均对应本次安装包。
- 发布 tag 经 `git ls-remote` 确认固定源码 commit；未重写旧 tag 或资产。
- 使用实际 FocusUpdater 与官方 NsisUpdater 同一配置，在独立 profile 模拟当前 preview.66，对公开 GitHub feed 执行只读检查：phase=available、detected=preview.67，未下载或安装。本机原始结果 `artifacts/companion-public-update.log`。
- 打包、推送和发布前实际远端仍包含基线；未见活动写集重叠。后续验收文档提交不移动发布 tag。用户从 App“检查更新”即可手动安装。
