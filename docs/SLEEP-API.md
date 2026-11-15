# 睡眠打卡接口 v1

供同一Windows用户、同一电脑上的Hermes调用。用户通过微信说“我要睡了/我起床了”，由Hermes识别后调用本工具；本交付没有注册Hermes、读微信或部署到其他电脑。需要含本接口的农场运行中（托盘即可）。没有HTTP端口、云同步或密钥。运行目录不能放网盘/NAS双向同步。

## 入口与目标

源码：将一行JSON送入 `node scripts/sleep-client.cjs` 的stdin；stdout返回一个JSON，成功退出0，失败退出1。安装包包含 `build/assets/sleep-client.cjs` 和既有 `journey-client.cjs`；接入时从同版ASAR提取这两个文件到同一目录，再运行 `node sleep-client.cjs`。固定release/source SHA及两文件hash，不混用旧版本。Node不能直接读取ASAR。客户端复用现有Journey单实例传输，但scope固定为sleep，写入仅由农场主进程处理。

固定目标为UTC+08:00（不受设备时区改变影响），23:30前就寝，07:40至08:00含边界起床。目标只用于统计，不关闭软件或设置闹钟。早于07:40不算目标窗口达标，也不自动判断为坏习惯。没有睡眠时长奖励。

所有日期按**起床日**归档：11月15日23:30就寝和11月16日07:50起床属于11月16日；11月16日00:30就寝也属于11月16日。就寝用“当天中午到次日中午”的夜晚分界；午睡不属于这个接口。时间须完整ISO8601，含秒和 `+08:00` 或 `Z`。未来时间不允许作为已发生打卡。

## 协议

公共字段：`protocol:1`、`requestId`为小写UUID，每个逻辑请求一个。客户端自动补`scope:"sleep"`。拒绝未知字段。不接收命令、URL、任意文件路径或自由文本内容。

先read得到该日revision，没有记录时为null。每次写入必须传expectedRevision，冲突返回CONFLICT；重新读取后向用户确认更正意图，不能静默覆盖。**同一写请求重试必须完整复用原JSON及requestId**，成功重试返回replayed:true、原appliedRevision与当前entry，即使后来已更正也不会回写旧值。新消息重复打卡已有字段返回ALREADY_RECORDED。

读取：
```json
{"protocol":1,"requestId":"10000000-0000-4000-8000-000000000001","op":"read","day":"2026-11-16"}
```

就寝（首次记录expectedRevision为null；今晚通常归档明天）：
```json
{"protocol":1,"requestId":"10000000-0000-4000-8000-000000000002","op":"check_in","kind":"bedtime","at":"2026-11-15T23:30:00+08:00","expectedRevision":null}
```

起床（expectedRevision换成上一条返回的entry.revision）：
```json
{"protocol":1,"requestId":"10000000-0000-4000-8000-000000000003","op":"check_in","kind":"wake","at":"2026-11-16T07:50:00+08:00","expectedRevision":"替换为read返回的UUID"}
```

check_in的at可省略，使用农场收到请求时的时间；若微信延迟或用户说“昨晚”，Hermes必须传用户确认的实际时间，不能把送达时刻当作实际时间。重试省略at的原请求仍定位首次已提交时间。

补记/更正（至少指定bedtimeAt或wakeAt之一，未给字段保留，null表示清除此项；初次补记expectedRevision:null）：
```json
{"protocol":1,"requestId":"10000000-0000-4000-8000-000000000004","op":"correct","day":"2026-11-16","bedtimeAt":"2026-11-15T23:40:00+08:00","wakeAt":"2026-11-16T08:00:00+08:00","expectedRevision":"替换为read返回的UUID"}
```

统计：
```json
{"protocol":1,"requestId":"10000000-0000-4000-8000-000000000005","op":"stats","through":"2026-11-16","days":30}
```

read的day默认今天；stats的through默认今天、days默认30，允许1–366，禁止未来统计截止日。历史日期范围2000–2099；缺失read返回revision:null，读取不创建空记录。

## 返回与展示口径

entry含day/revision/bedtimeAt/wakeAt/updatedAt/complete/reportedRestMinutes/bedtimeOnTarget/wakeOnTarget。时间统一返回UTC ISO字符串，展示时转UTC+08:00。缺失为null，不当作0分钟。reportedRestMinutes为两次**自报打卡的休息时段**，四舍五入到分钟，不代表入睡时刻、实际睡眠时长或医疗测量。先起床打卡也可保存，之后补就寝；两者齐全才计算时段。

stats返回按日rows及summary：完整夜晚数、缺失/部分夜晚数、完整记录平均休息时段、两种目标达标天数、当前连续及区间最佳连续。**连续统计仅在请求区间内计算**，days=30时最大30，不宣称全历史纪录。缺失/未达标会中断连续；当天08:00前尚未起床打卡为pending，起床连续回看前一天，避免刚过午夜就归零。早睡连续针对归档日起床前那一晚，今晚记录属于明天，read明天可看。更正后重新计算；历史成绩不会被清空。

响应包含goals和measure:self-reported-rest-window。仅提供数据接口，本版不制作图表、不发微信消息、不做云端互锁。

## 错误与保存

INVALID、CONFLICT、ID_REUSED、ALREADY_RECORDED、CORRUPT、SAVE_FAILED、LIMIT、TRANSPORT等。出错exit1；TIMEOUT/TRANSPORT/SAVE_FAILED可能属于未知提交结果，保留原requestId重试，不换ID。单次输入30KB，统计366天，去重回执总上限20000条、存储16MiB；达到上限拒新写，仍可查询，不静默遗忘回执。无需每天维护或清理。

数据位于当前用户农场profile中的 `sleep-checkins-v1.json`，记录与去重回执一起原子替换；损坏保留并报错，不覆盖初始化。更正保留旧请求摘要/版本回执，但不提供完整历史值审计或删除接口。既有专注/旅程/休息日志不变。数据是本机自报记录，未同步飞书。回滚旧版会忽略此文件，不应删除它。

信任边界与Journey接口一致：Windows当前用户及管理员可信，不是抵御同用户恶意软件的沙箱。无权限扩大，无远程请求入口。

## Hermes最小包装

接入端应暴露sleep_read、sleep_check_in、sleep_correct、sleep_stats四个窄工具；使用参数数组启动Node，shell:false/windowsHide:true，超时15秒，stdin JSON/stdout JSON；不把微信文本拼到Shell。先保存逻辑请求ID，再执行，超时复用原请求；只有明确“现在睡/起床了”或用户确认的补记才写，计划/讨论不打卡。更正必须先读revision。

部署电脑上应以合成隔离profile验证打卡→重试→更正→查询，再接真实记录。接口本机验收不能替代德楼电脑与微信Hermes的最终联调。
