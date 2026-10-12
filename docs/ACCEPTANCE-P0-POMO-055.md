# P0-POMO-055 注册检查修复验收

已验证：注册adapter修复、冻结源码、隔离完整暂停链、90安装包与公开更新链通过。真实NativeMessaging键和用户App/profile未写入，个人Edge首次加载仍由用户确认。

四处预检/授权/写集/资源/停止线引用TASK-P0-POMO-055。旧89的spawnSync reg.exe使用UTF8解码并正则找missing；实际无console子进程返回status1、中文OEM GBK字节（b4edcef3...），正确解码为“系统找不到指定的注册表项或值”，但UTF8乱码导致“无法核对浏览器注册权限”。真实项目key只读确认为不存在，没有把真实权限拒绝当缺失；PowerShell直接命令可显示英语不等于App隐藏子进程相同编码。

原生薄修：Windows内置PowerShell5.1.19041.6456/.NETFramework4.8.1 Release533325/CLR4.0.30319.42000，RegistryKey OpenSubKey缺失null与Security/UnauthorizedAccess异常分离，GetValue/Kind支持Unicode，CreateSubKey/SetValue固定HKCU。stdin manifest不作为命令文本，显式UTF8 JSON；没有改系统codepage/权限或安装第三方模块。官方RegistryKey.xml精确commit2d70033d6e5ee4ebd97203e1db09b8453c989306/blob a2578348454e907398a05f6cb7eb0bc50caeeb93，194550bytes，SHA与范围见ignored p055-official/manifest.json；代码采用该版本已有公开方法、实际本机API验证，不将最新新增overload推断到旧runtime。

已验证：p055-registry-first.txt 10/10包含7原controller生命周期及3新增typed注册检查；原生OEM缺失→旧解析误判→typed null；Unicode/空格/引号和特殊字符以stdin传输、脚本不含输入值；真正拒绝、坏JSON、未知REG类型拒。实际HKCU随机p055-UUID临时测试键：missing→中文/emoji目录安装→REG_SZ manifest精确回读→重复安装同扩展ID→foreign写拒→marker核对清理→再read null，全静默。测试未读写真实NativeMessaging/用户profile，不声称个人Edge已控制。

既有stage/owner guard和固定NativeMessaging/主机协议保持。只有按钮调用时最多3个短命PowerShell查询/写入进程（10秒上限），没有监测轮询增加或逐秒注册调用。

Learning已记录：LEARN-P0-POMO-055-01于实现commit 8a786f76bb4a2c81201743b1bc60fc123f9186bb同批登记，独立复核接受；限定已验证隐藏CLI编码与typed API边界，不泛化所有Windows编码。最后发布检查点没有新候选：只验证已用固定源发布流程，不引入新工程机制。回滚源码revert，新preview修复，不替换89资产、不自动安装重启，不触碰根私有仓。

冻结实现8a786f76bb4a2c81201743b1bc60fc123f9186bb，preview.90，构建dirty=false。p055-all.txt回归338/338；p055-build.txt构建成功。p055-native-desktop.txt及p055-browser-desktop.json完整主App/typed HKCU临时注册→CMD/Electron Node→native协议→原始content script→真实合成HTML video.pause与回执5/5；生产IPC非法策略/无人安装拒、blocked重放拒、断连释放仍通。temporaryMarkerKeyCleaned=true、productionRegistryWrites=0、realEdgeProfileWrites=0，全静默。

release90-package-acceptance.json：185个构建文件与成品ASAR逐字节一致，包含nativeRegistry；成品exe静默隔离启动PASS。安装包83838349 bytes，SHA256 da4b45f1f68b01ef835acac6c08c7d8ebd95b5dee98d28c24569ecbf01993939；安装包/blockmap/preview.yml/source-version.json/SHA256SUMS.txt共5资产，feed SHA512/大小吻合。

已发布 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.90 ，非draft prerelease、不设Latest。release90-remote-public.json远端五资产大小/digest、固定tag源码8a786和草稿资产ID一致；旧89资产/发布时间保持原样。首次upload在draft创建瞬间返回release not found，先查list/API确认唯一draft id410087411、资产0后才继续上传，没有重建版本或重复副作用。稳定Latest仍preview.51。实际旧89 ASAR冻结验证版本/source，release90-before-update.json为current；release90-live-update.json真实旧89 FocusUpdater→90为available，files与发布feed完全一致，errors=[]，autoDownload/autoInstallOnAppQuit=false，downloadEvents/installEvents=0。

独立review_scientific_rest已回读源码、官方SHA、338回归、5项实链并独立重算成品185文件/五资产哈希，分层PASS；最终独立回读公开原始JSON/脚本和89→90更新结果，确认可封版PASS。个人正式Edge加载、实际B站播放器暂停不是本次合成测试结论，需用户手动更新App、再次安装配套、在Edge加载扩展后验收；不以此阻断已授权修复版的发布完成。
