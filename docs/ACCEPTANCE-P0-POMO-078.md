# P0-POMO-078 验收

执行卡 [TASK-P0-POMO-078.md](TASK-P0-POMO-078.md) 记录四源、范围和回滚。截图说明个人表当时处于项目读取中。个人飞书请求缓慢的具体原因未知。源码确认旧表单每次打开才发目录请求，旧右键入口只处理番茄完成。

项目目录在连接就绪时预读，同一来源共享在途请求和一分钟内的结果。等待、空目录和失败有各自状态，失败可重试。合成桌面走通等待、失败、重试、选择、原待整理 ID 入队，也通过四象限番茄格、已完成任务标题、失败后重新读取和项目保存。项目保存是显式的即时更新，原整理创建仍经既有队列。

Bitable 写入通过来源和任务表、项目表及稳定记录 ID 校验。保存前对比飞书原关联，然后只 PUT 任务所属项目，回读后才更新看板。回执丢失时重试读到目标值即可确认，合成测试证实仅一次 PUT。跨源、表改变、项目缺失、写前发现新归属均拦截。计划记录、任务标题、计划日无差异。GET 与 PUT 不是原子操作，同时修改仍可能覆盖。能力依据为 [固定 SDK 的单行更新契约](https://github.com/larksuite/node-sdk/blob/394c83092395a51402ee408b751d7f9fb05f5518/code-gen/projects/bitable.ts#L1460-L1603)。

478 项单元测试通过。最终构建的项目入口测试通过。通用桌面 21 项、冷重启和竖屏 14 项通过。旧历史分类用例在 117 等待云端改色时超时，用 116 的已公开 ASAR 隔离复现同一断点。该旧用例等待时长短于当前五分钟同步窗口，原测试未改。现行五进程 quiet-sync 回归全部通过。证据见 artifacts/p078-unit.txt、p078-desktop-final.txt、p078-desktop-regression.txt、p078-category-baseline.txt、p078-quiet-regression.txt。测试隐藏静音，只使用合成数据。

review_task_projects 独立只读复核冻结提交 3295c6a753528aed7f6a20ff758092c3b19a09ad。首次指出 GET 到 PUT 的并发窗口，按上文明确的能力边界复核通过。无新增 Learning，复用既有同步防护和发行流程，未查实个人现场根因。

117 Windows NSIS 86,012,962 字节，SHA256 e8cd126fa774ac4b2fabf92cc838b271f98dc9cbfb1f85ad06134d8420610260。成品内 282 文件逐字节匹配冻结构建，隐藏启动及更新 feed 校验通过。本机 staging 首次写入及同字节回读通过。发行 432290889 的五资产核对通过，固定 annotated tag 对应 3295c6a。实际 116 更新器发现 117，errors=[]，下载与安装均为零。证据在 artifacts/release117-*。用户自行在应用设置重启加载。 [117 发布](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.117)
