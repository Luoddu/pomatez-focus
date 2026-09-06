# 来源与修改范围

基于 [zidoro/pomatez](https://github.com/zidoro/pomatez) 的 **v1.11.0**，固定提交 **c2727800c6272573590911e9ee81637b89e55d5f**，MIT 许可证。保留原始 LICENSE、Git 历史和上游贡献者归属。图标及原始资产来自上游；不使用滴答清单的商标或专有图像资源。

| 复用                                                           | 适配                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Electron 34.5.8，React 16，TypeScript / CRA / Rollup / esbuild | 保持锁定构建图，增加可复现的 focus 构建入口                                         |
| Pomatez 窗口、置顶、小窗、托盘生命周期模式                     | 仅保留专注所需的桌面入口，移除自动更新、Discord RPC、自动开发工具和全局快捷键的启动 |
| 单一 CounterProvider 计时入口                                  | 加入实际会话时长、暂停恢复、超时待确认和本地记录                                    |
| 开源项目结构与图标资产                                         | 新的简体中文紧凑界面、受限 IPC、Feishu Bitable 适配器                               |

上游没有“到点继续计时、结束时自选额外时间”的配置，原计时器会自动切换休息。本分支修改这一生命周期，不能仅靠加一个按钮完成。新界面减少了完整任务管理、主题、自动更新等本次不需要的入口；上游相关源码保留用于追溯，但不从新启动入口加载。旧集成依赖保留为开发依赖，避免在发布包中引入不用的 Discord 原生模块。

独立的数据目录和应用 ID 避免覆盖 Pomatez 原版。不会连接上游更新通道，也不会上传遥测。本分支当前只验证 Windows x64；保留的 Tauri/macOS/Linux 源码及旧工作流不代表这些平台已支持本分支。

滴答清单的交互参考：[番茄专注帮助](https://help.dida365.com/articles/6950408124297641984)。采用熟悉的圆形计时、浅底蓝色按钮和专注时间确认方式；这是独立社区分支，未获滴答清单官方背书。

Feishu 请求结构对照官方 [oapi-sdk-python v1.6.8](https://github.com/larksuite/oapi-sdk-python/tree/v1.6.8/lark_oapi/api/bitable/v1) 的 `create_app_table_request_body.py`、`req_table.py`、`create_app_table_record_request.py` 和列表模型。SaaS 服务没有可冻结的服务器版本；实际字段映射、空表省略 items、数字字段字符串回读均经过受控 live 验证和本地回归。
