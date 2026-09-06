# Pomatez Focus

一个可置顶的桌面番茄小窗，连接飞书里的今日番茄计划。基于 [Pomatez](https://github.com/zidoro/pomatez) v1.11.0 薄改，采用熟悉的圆形计时与浅色界面。

**当前版本：0.1.0-preview.2 · Windows x64 预览版。** 桌面计时与飞书记录同步已验证；飞书看板的图表需要按说明在飞书界面配置。尚未完成独立用户体验验收，不作为稳定版发布。

<img src="docs/images/desktop.png" alt="Pomatez Focus 桌面界面，使用演示任务" width="900" />

## 使用方式

1. 在 [Releases](https://github.com/Luoddu/pomatez-focus/releases) 下载 Windows portable 文件，双击启动。无需部署服务器。
2. 选择任务，点击“开始专注”；右上角可置顶或切换小窗。
3. 到点后会发出提示音并继续记录额外时间。点击“结束”，选择只计基础时间、计入额外时间，或手动修正实际分钟。
4. 自行填写完成番茄数，再保存记录。默认完成数为 **0**；不按时间推算完成数，不自动勾选飞书任务。

不认可这次专注时，点击确认页的“放弃本次记录”：不保存、不计入统计，也不同步到飞书。此入口只放弃尚未保存的这次专注，不删除历史记录。

展开界面左侧计时，右侧同时显示今日／累计番茄、专注时长和按日期分组的记录。窗口使用 Windows 原生最小化、最大化／还原和关闭控件；应用内保留置顶与小窗切换。

提前结束也能保存，例如做了 12 分钟就保留 12 分钟。暂停不计时。退出后恢复的会话处于暂停状态，关机期间不计时。休息由用户手动开始，单独计时，不计入专注记录。

<img src="docs/images/compact.png" alt="可置顶的小窗" width="340" />

## 飞书联动

在“飞书连接”填写自建应用凭证和多维表格链接。支持“计划日 + 关联任务 + 已完成”的番茄计划表，读取电脑本地日期的未完成记录。

确认的专注会话写入单独的“专注会话”表。先本地保存，再尝试同步；断网保留待同步记录，重复点击不会重复写入同一会话。实际分钟与手动完成数可在飞书中汇总。

[连接、字段映射与看板配置说明](docs/FEISHU.md)

## 开发与验证

使用 Node.js **24**、Yarn classic **1.22.22**。保留上游锁文件，未升级依赖图。

```sh
yarn install --frozen-lockfile --ignore-scripts
node node_modules/electron/install.js
node scripts/build-focus.cjs
node --test tests/session.test.mjs tests/feishu.test.cjs
node scripts/test-desktop.cjs
node scripts/package-focus.cjs
```

构建产物位于 `app/electron/dist`。桌面测试使用独立临时配置和隐藏窗口，不显示测试界面或开发者工具。`test-desktop` 包含实际进程退出再启动的恢复检查。构建使用上游固定的 Electron 34.5.8 / TypeScript / React / CRA 工具链；这也是预览版的维护限制，后续运行时升级需要单独验证。

## 数据与限制

- 本地记录保存在用户的 `pomatez-focus` 应用数据目录。关闭按钮收起到托盘；退出请使用托盘菜单。可在“专注记录”导出 JSON 到下载目录。
- 飞书凭证由 Electron `safeStorage` 使用操作系统加密保存，不写入源代码、普通配置文件或日志。Windows 上它主要隔离其他用户，不能防御同一登录用户下的恶意程序。
- 不上传遥测，不启用自动更新、开机启动或 Discord RPC。无需开放端口。
- 单用户、单电脑使用。跨午夜的会话归到开始日期；没有自动判断你是否离开电脑。是否计入额外时间仍由你决定。
- 本版不会回写原计划的完成复选框；该复选框继续在飞书手动管理。
- 飞书列表读取目前上限 50,000 条，不适合超大型 Base。看板组件尚需手动配置。
- Windows 包未签名；当前只验证 Windows x64。保留的上游 Tauri/macOS/Linux 代码与工作流不代表本分支已支持对应平台。

[验证范围](docs/ACCEPTANCE.md) · [修改记录](docs/CHANGELOG-FOCUS.md) · [上游来源](docs/UPSTREAM.md)

## 许可证与致谢

[MIT](LICENSE)。感谢 Pomatez 原作者及社区贡献者。本项目是独立社区分支，与滴答清单、飞书没有官方隶属关系。界面参考常见番茄专注交互，不使用滴答清单专有图像或商标素材。
