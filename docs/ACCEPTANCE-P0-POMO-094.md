# P0-POMO-094 验收回执

状态：源码接口、正式包、公开更新与旧版发现133已验证；最终复核见后文。任务范围与四源预检见TASK-P0-POMO-094.md，不重复建立状态源。

- baseline 7bc332b1938a5db1659fe700a896401252acb163，源码冻结10c2bfd20b7c079e0be76caeb0f05de21f299e3f；版本准备133。原开发分支与用户profile未改。只读远端校验一致，独立worktree绿灯。
- TypeScript编译与完整build:focus通过；最终全逻辑553/553通过（artifacts/p094-all-tests-final.log），其中睡眠15项（p094-unit-final.log）。
- 真实隐藏Electron接口11项通过（p094-desktop-final.log）：stdin/stdout脚本、双实例并发去重、就寝/起床、更正、旧revision拒绝、重试返回当前值、统计、落盘回执、重启回放、关闭App拒绝且不自启。原Journey完整4项回归通过（p094-journey-regression.log）。所有profile均合成，没有真实记录/飞书/微信写入或网络监听。
- 原子保存失败保留原字节，重试正常；损坏文件拒绝保留；非字符串requestId在客户端及存储入口拒绝且零写入，合法UUID仍通；时间带时区、真实日期、非未来与正序校验；缺失不是0；7:40/8:00含边界；跨午夜、历史补记、更正后重算、午夜pending起床连续均验证。
- 独立review_sleep_api对冻结源码及原始证据复核PASS，独立重跑15专项。初始发现数组requestId被RegExp隐式转换会出现落盘但客户端报错，已严格类型校验修复；ES5 Error子类原型已恢复。真实重启测试首次误用旧status文件存在作为ready导致ESRCH，已改为当前instance匹配，产品生命周期无补丁。
- Learning none：复用LEARN-P0-POMO-054-01；此次严格类型与Error原型修复无新增跨任务教训。旧请求保留hash/版本回执，不提供旧值完整审计；固定UTC+8与区间内连续统计均在协议明确。德楼Hermes/微信未联调，云端互锁与图表不在范围。
- 回滚：使用132或回退本任务源码，保留sleep-checkins-v1.json。未迁移既有记录，未重启/安装个人App。


## 最终交付

正式发行source 9daad0398e79b8c6cd200e97c83822ede3ed8639 / preview.133（clean）。独立包复核PASS：80个build文件与ASAR逐字节一致；NSIS直接解出的ASAR SHA256 ece2f4ae90b43222b2d6b1b6191bbbd163510cdb3e2229f4e900ff0ca199094c与已验成品一致。成品原生hidden启动及包自带sleep/journey客户端写入、重试、统计通过。安装包75,520,694字节，SHA256 d99a95c3cded966619a3fa52256349e72631b6fde0639ae74d77c1ca7e90a498。sleep客户端SHA256 f5c120d119d0027c7d2b59714fcfb4cec1d83275fa5e0afc4205d1cbcf65ceca；配套journey客户端618537152fddd0c6f617c1057128d848c21c403a66f648d73b3bb9bf04b8b30c。

公开[preview.133](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.133)，Release445817803，draft=false/prerelease=true、非Latest。五资产由草稿到公开ID不变，大小及GitHub SHA256 digest与本地一致；annotated tag peeled为固定9daad源。Latest保持preview51；没有替换旧版本或发布便携资产。真实已安装132 ASAR updater发布前current132、发布后available133，正确安装包大小/SHA512、errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。未自动安装/重启/准备个人App更新目录，本地NSIS保留供用户自行使用。

### 已知基线测试失配（非本次回归）

通用desktop21项及真实重启、portrait14项通过；旧category-review-desktop.cjs:190仍失败，后续断言未执行，不能写全部desktop PASS。其6.4秒内等待云端分类立即改变，与现有QuietSync 300000ms契约冲突。以原已安装clean132/source a67037e1包在相同合成fixture复现同一190行超时；本次renderer除版本文本无改动。现行test-quiet-sync-desktop.cjs五阶段14项正反通过，含299秒不写/300秒写、手动同步、重启、途中修改、失败保留。独立review确认基线失配不阻断睡眠接口发行。旧测试修订由后续分类/同步任务owner处理，本任务不修改范围外功能。

原始证据位于忽略artifacts：p094-all-tests-final.log、p094-desktop-final.log、p094-journey-regression.log、p094-desktop-regression.log、p094-category-baseline.log及对应脚本、p094-quiet-sync.log、p094-packaged.json、p094-release-assets.json、p094-remote-draft/public.json、p094-tag-readback.txt、p094-update-before/after.log。NSIS验证首次假设嵌套app-64.7z不成立，本机7zip直接解出resources/app.asar；依据真实产物改校验路径，没有重打或替换发行物。草稿按tag API查询404后改用既有draft ID读取，没有重建或重传。

Learning none仍引用本回执前述判断。回滚使用132并保留独立sleep文件。德楼设备部署/微信Hermes注册、长期真实打卡效果均未验收，不属于本次接口完成声明。

最终review_sleep_api只读复核PASS，可DONE：五资产ID/大小/SHA256、固定tag、非Latest公开prerelease、132真实updater发现133均确认。代码接口与文档交付完成，用户App未自动安装。
