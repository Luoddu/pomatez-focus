# 共享娱乐额度服务

当前为P0-POMO-095本机验证候选，尚未部署NAS，也未完成真实跨电脑验收。

## 固定运行环境

Node **24.22.1** 自带 SQLite **3.53.4**，无npm运行依赖。node:sqlite当前为官方release-candidate API，固定版本而不自动升级。沿用官方DatabaseSync/参数绑定/SQLite事务；HTTPS为Node标准接口。

官方来源：
- https://nodejs.org/download/release/v24.22.1/docs/api/sqlite.html （154–249：稳定级别、同步数据库与绑定API）
- https://nodejs.org/download/release/v24.22.1/docs/api/http.html （服务器超时、关闭生命周期）
- https://www.sqlite.org/lang_transaction.html （38–55：单写事务与BEGIN IMMEDIATE；现行补充说明，非固定版快照）

仅授权设备可调用。一个服务实例代表一个个人账号；每台电脑使用不同随机64位十六进制连接码，映射到固定设备ID。连接码只由操作者在安全的部署环境注入，不能写普通JSON文件、文档、Git或日志。桌面连接使用系统safeStorage加密落盘。

## 操作者部署入口（尚未执行）

NAS条件确认后另做部署任务：检查Docker支持、持久本地卷、不在双向同步目录、TLS证书、设备可达地址、启动恢复与备份。不要把SQLite/WAL直接放到网络共享盘，也不要把此服务当作澄行控制面。

启动 `node services/shared-entertainment/server.cjs`，环境变量如下：

|变量|含义|
|---|---|
|POMATEZ_SHARED_DATABASE|现有本地数据目录下的绝对SQLite文件路径|
|POMATEZ_SHARED_DEVICE_TOKENS|进程环境中注入的令牌到设备ID映射；进程启动即移除环境副本，不打印|
|POMATEZ_SHARED_BIND|默认127.0.0.1；非回环必须有TLS，实际网络开放需批准|
|POMATEZ_SHARED_PORT|默认8787|
|POMATEZ_SHARED_TLS_CERT / POMATEZ_SHARED_TLS_KEY|证书和私钥的只读安全挂载路径|

桌面客户端只接受HTTPS，不跳过证书检查、不跟随重定向、不向网页暴露令牌。浏览器配套必须支持shared-entertainment-v1才可绑定。绑定后没有“换新服务清零”按钮；迁移需保留数据库及当前状态。

## 时间、额度与统计

- 日期统一北京时间，工作日默认900秒、周末3600秒，放行900秒、冷静120秒。正式部署前核对这些默认值；服务策略持久化，运行时变更配置不能默默改变旧额度。
- 20秒以内的全账号共享许可预先扣除。多机同时领取同一窗口不重复扣除，也不获得额外窗口。提前关闭最多损失本窗口未用部分；这是**已预留**，不是实际观看用时。断网不发新许可，原有放行和冷静倒计时继续，许可到期后限制娱乐。
- SQLite持久化日额度、绝对截止时间、幂等回执。正常数据库重启不清零。不得通过删除/恢复旧数据库进行日常重启；备份恢复需保守核对已核发窗口。
- 原有有效番茄门槛、工作日严格限制仍参与核准；本服务不提供远程执行/任务同步，也不放宽游戏限制。
- 使用统计只上传分类及区间，不上传视频标题、URL或任务名称。每设备当天已收到区间只合并不抹除；跨设备重叠时间在图表去重。只报告已上报记录，未采集、未上报或时钟异常的数据不冒充零使用。
- 客户端许可剩余时间用单调时钟计算；浏览器收到的许可再用单调时钟到期。服务时钟回退超过1秒拒绝核准，需要操作者修复。
- 暂不声称防管理员篡改、卸载扩展/关闭游戏守护或未知浏览器绕过；只验证已安装配套的正常客户端互锁。

验证：`node --test tests/shared-entertainment-server.test.cjs tests/shared-entertainment.test.cjs`（先编译Electron TypeScript）。合成TLS证书只在测试进程信任，不改系统证书库。
