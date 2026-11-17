# P0-POMO-099 Wallpaper Engine 精确例外

- DONE（实现与发行；用户加载后实际壁纸运行待回读），owner /root，模块状态源本卡；基线adbe2b70e41c2625a35eef79048fc042730b1504，远端一致、树干净。用户明确允许壁纸作为游戏限制例外。独占本分支；不改根仓共享文件。
- 写集：focuserAdapter.ts、tests/strict-supervision.test.cjs、本卡与ACCEPTANCE-P0-POMO-099.md、版本准备输出/CHANGELOG；artifacts仅隔离测试/打包。不得改个人额度/记录、关闭严格模式、放开Steam、关闭正在专注的App或热替换ASAR。
- 四源：①已安装140严格开启；Wallpaper Engine实际在steamapps/common/wallpaper_engine，已安装matcher对32/64均true。②固定Focuser14cbfdb的block.rs:110-124精确路径/名称匹配，本地artifacts/p089/upstream；Wallpaper官方help.wallpaperengine.io/en/noshow/nowallpaper.html:110-115列核心进程，官方非版本化资料仅辅助，本机已安装文件列表核验额外bin组件。③复用windowsPath、GameGuard与既有身份重验，沿用Learning正反验收。④strict-supervision与game-guard测试。
- 方案：仅Steam库规范路径steamapps/common/wallpaper_engine下明确相对可执行文件例外；不按名称全局放行、不放整个目录、projects/workshop及其他游戏仍受原规则。显式平台名拦截优先。支持不同盘符Steam库，路径标准化/大小写一致。属于自有产品策略薄改，无新增依赖/采集/网络/持久状态。
- 验收：32/64、launcher及网页/UI组件放行；同名其他游戏目录、近似目录、未知exe、嵌套伪装、平台程序仍拦；真实GameGuard tick不得向例外发ask/terminate，真实游戏候选仍走30秒流程。完整回归、独立复核、固定源码包/真实旧更新器验证后按既有授权发布，准备本机包但不自动重启。当前用户App更新前不宣称已生效。
- 允许一个有界独立reviewer只读代码/测试/证据，不写live状态；无其他子任务。预算本轮前台；回滚140安装包，个人记录与严格配置不改；未知同因两次停止对应步骤。Learning检查点按实证判断。


