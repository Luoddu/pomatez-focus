# P0-POMO-040 桌面置顶提醒验收

## 范围与基线

已验证：基线32b7f00561ef1c8e51ff990adbd4a5ce8e559982实时等于公开主线，单clone、无并发写者。任务范围、四处预检、资源、回滚及只读review契约见TASK-P0-POMO-040.md。根仓、用户浏览器、个人AW/profile未写入。正常发布不自动安装或重启用户App。

## 机制与实现

原main.ts通过show恢复普通农场窗口，提醒是ScientificRest.tsx页面portal；原窗口alwaysOnTop=false。改用无父窗口的独立BrowserWindow，沙箱/隔离preload仅提供提醒key/line和两个动作；显示使用setAlwaysOnTop(true,pop-up-menu)、showInactive、moveTop。动作窄IPC只允许当前提醒自身mainFrame，返回原农场计时所有者执行，匹配完成回执后关闭/返回农场；没有新计时器或第二统计源。重复、过期动作和无匹配完成回执被拒绝，失败保留重试；关闭督促/断连/挂起/日期清空/重载/退出清理窗口。原农场置顶状态不变。

固定官方Electron34.5.8原文：https://raw.githubusercontent.com/electron/electron/v34.5.8/docs/api/browser-window.md ，忽略证据artifacts/p040-official/browser-window.md，SHA256 ae7aeb1ed91fcbd963b1abbd3c23424a169d5f5b0b3378ca4981a4ef3714442f，L639–643、L971–1005（Web工具规范化行号不同）。使用公开API薄适配，没有Win32运行依赖、浏览器注入或服务。Win32 GetWindow只在有界验收中读取合成测试窗口关系，GW_HWNDPREV=3，NULL/重复或200次停止，来源https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindow 。

## 原始测试

| 命令 | 结果 | 原始证据 / SHA256 |
| --- | --- | --- |
| node scripts/test-focus-all.cjs | 269/269 PASS | p040-logic.txt / 773213adaccf162f1f3e7aee2717973d8dd64dcb94d650cdec08c318febbcef1 |
| node scripts/test-rest-reminder-desktop.cjs | 7组正反 PASS | p040-native-final.txt / 4374f88382f7d03e5c33be782b6f3ba4c0712a4db1df386212e01f10f13a0fe0 |
| node scripts/test-activitywatch-desktop.cjs | 18组真实生产UI PASS | p040-ui-ready.txt / 04975514a58ca8798148b0ed04451da284186a0c3453a23130dd4616c630c1aa |
| node scripts/test-desktop.cjs | 21组及实际进程重启 PASS | p040-desktop.txt / 23b257c7699fe30ad27143ecc5dce1f609e7184d1e90feb1b47560ff9ab3e003 |
| node scripts/test-portrait-desktop.cjs | 14组 PASS | p040-portrait.txt / a63aa10076e36e12a2fcfafb1b31d0529e45b18d251c495fc35d6a5f8c012df0 |
| node scripts/test-rest-reminder-visible.cjs | 普通/最大化/全屏合成视频窗口实际Win32层级 PASS | p040-zorder.txt / 1a1b4a59710a6719138ba5d164fd49e9dd23a4dd038abadac965846049bbdda2 |

全部原始文件在忽略artifacts；没有个人网页标题、网址或用户记录。本次真实显示测试证明提醒位于三种合成窗口上方，完成后销毁；不是在用户真实Edge视频上触发，因此不声称实测了个人Edge视频。提醒自身capturePage非空，p040-native-reminder.png / 38f556e0cb70a8b8aab94fc7aee3a80a7ba5f3914efaecfb37d36f7b547e7b2a，标题/一行/两按钮已直接查看。主窗口不置顶，计时动作复用同一active.id；农场close-to-tray后的实际30秒poll仍能提醒。269逻辑测试未改策略；21桌面测试验证原手动确认/暂停/重启恢复仍可用。

测试时序修正：一次UI测试在合成30秒poll刚创建新窗口、preload尚未读取state时点击disabled按钮，executeJavaScript报Script failed to execute。根因定位到测试只等monitor.reminder，未等新窗口加载/按钮可用；测试helper加读取就绪等待后全链路18组PASS，不修改业务、窗口层级或系统。旧截图surface问题未复试。

Learning判断：本检查点是固定官方置顶API的项目适配及正确等待异步UI准备，不形成新的经多任务验证的普遍教训；不新增Learning条目。已知发布链路教训LEARN-P0-POMO-039-01继续适用，详见既有Learning.md；不写根Learning。

## 封版与交付

待冻结commit、独立复核、干净重建、包源比对、安装版五资产及真实71客户端更新检测后补充。版本72准备完成；不以此表示已发布或安装。
