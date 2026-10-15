# P0-POMO-061 开机自启动验收
状态：REVIEW；唯一任务状态见TASK-P0-POMO-061.md。
现状与官方/复用/同类验收四源见执行卡。采用固定Electron34.5.8原生get/setLoginItemSettings公开API，未增加依赖/后台服务/计划任务；用户显式开关才写本App HKCU Run启动项，设备独立不进入飞书偏好。普通打开保留显示，--start-in-tray托盘启动，重复自启动不抢焦点，手动重复打开仍唤起。
原生证据：artifacts/p061-startup-native-bggMwP/native.log/result.json；实际Electron34.5.8、真实中文空格exe路径、随机唯一测试AppID/name，8原生+4控制器全部通过、controllerErrors=[]、cleaned=true，两次disable也通过。仅测试owned项，未改真实farm startup项/用户profile/凭证，无网络或重启电脑。
原生初验发现并修复：launchItems.args因Chromium GetArgs排除--switch返回[]，旧strictargs判冲突；根据同版browser_win.cc619-623以openAtLogin完整命令匹配+本项name/user/path/enabled判定，并保留TaskManagerdisabled区别。unit模拟真实空args结果9/9PASS；全逻辑415/415PASS，完整Electron/renderer TS PASS。独立源码初审conditionalPASS，实际nonheadless tray/manual路由fixture及最终干净构建待复验。
Learning：recorded - 模块Learning.md新增LEARN-P0-POMO-061-01，依据原生失败→公开固定版源码→正确路径原生PASS；不写根Learning/长期Memory。
回滚：用户关闭开关移除本App启动项；原96发行保留；无记录/数据迁移。开发/便携/非Windows拒写，未知输入或OS读回不符不得报告成功。
