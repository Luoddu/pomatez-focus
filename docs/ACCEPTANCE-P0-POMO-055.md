# P0-POMO-055 注册检查修复验收

部分确认：现象与根因已精确复现，修改仅注册adapter及版本；最终冻结/独立复核/安装版发布待完成。真实NativeMessaging键和用户App/profile未写入，个人Edge首次加载仍由用户确认。

四处预检/授权/写集/资源/停止线引用TASK-P0-POMO-055。旧89的spawnSync reg.exe使用UTF8解码并正则找missing；实际无console子进程返回status1、中文OEM GBK字节（b4edcef3...），正确解码为“系统找不到指定的注册表项或值”，但UTF8乱码导致“无法核对浏览器注册权限”。真实项目key只读确认为不存在，没有把真实权限拒绝当缺失；PowerShell直接命令可显示英语不等于App隐藏子进程相同编码。

原生薄修：Windows内置PowerShell5.1.19041.6456/.NETFramework4.8.1 Release533325/CLR4.0.30319.42000，RegistryKey OpenSubKey缺失null与Security/UnauthorizedAccess异常分离，GetValue/Kind支持Unicode，CreateSubKey/SetValue固定HKCU。stdin manifest不作为命令文本，显式UTF8 JSON；没有改系统codepage/权限或安装第三方模块。官方RegistryKey.xml精确commit2d70033d6e5ee4ebd97203e1db09b8453c989306/blob a2578348454e907398a05f6cb7eb0bc50caeeb93，194550bytes，SHA与范围见ignored p055-official/manifest.json；代码采用该版本已有公开方法、实际本机API验证，不将最新新增overload推断到旧runtime。

已验证：p055-registry-first.txt 10/10包含7原controller生命周期及3新增typed注册检查；原生OEM缺失→旧解析误判→typed null；Unicode/空格/引号和特殊字符以stdin传输、脚本不含输入值；真正拒绝、坏JSON、未知REG类型拒。实际HKCU随机p055-UUID临时测试键：missing→中文/emoji目录安装→REG_SZ manifest精确回读→重复安装同扩展ID→foreign写拒→marker核对清理→再read null，全静默。测试未读写真实NativeMessaging/用户profile，不声称个人Edge已控制。

既有stage/owner guard和固定NativeMessaging/主机协议保持；临时typed注册与实际App/CMD/HTML完整链、最终包/公开/旧版更新证据待补。只有按钮调用时最多3个短命PowerShell查询/写入进程（10秒上限），没有监测轮询增加或逐秒注册调用。

Learning候选：本机hidden子进程编码导致localized错误分类反转，记录窄CLI编码边界；完成前由/root本模块单写/独立复核或明确拒绝。回滚源码revert，新preview修复，不替换89资产、不自动安装重启，不触碰根私有仓。
