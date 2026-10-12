# 今日／明日旅程：本机工具接口 v1

Windows 当前用户运行中的番茄农场提供 stdin/stdout JSON 客户端。它通过 Electron 原生单实例通道递交请求；没有 HTTP、网络监听或后台服务。安排仍存在原来的 Journey localStorage 中。调用不启动番茄、不切换任务计时、不记录实际吃饭/睡觉/健身，不写飞书。

## 调用入口

先打开更新后的农场，等待任务和旅程加载完成。同电脑、同 Windows 用户的 Hermes 可运行：

```powershell
'{"protocol":1,"requestId":"b892880a-0263-4a53-b067-58e99bdc1ddf","op":"read","day":"2026-10-13"}' |
  node scripts/journey-client.cjs
```

上例从源码 checkout 调用。安装版也随包附带 `resources/app.asar/build/assets/journey-client.cjs`；Node 无法直接读取 ASAR，应从同版源码使用 `scripts/journey-client.cjs`，或用 ASAR 工具提取该单个客户端后以普通 Node 调用。Hermes 工具接入方应固定农场 release/source SHA 和该客户端哈希，不混用旧版。不需要浏览器插件、端口、API Key、Cookie、HTTP 或真实飞书凭证。

stdin 只接收一个 JSON（最多30KB），stdout 只输出一个 JSON；成功退出0，错误退出1。调用期间短暂启动第二个 Electron 进程递交 ID 后即退出，主农场不弹出/抢焦点。客户端最多等待12秒；主进程页面应答10秒。不运行时返回 TRANSPORT，不自动打开农场。

用户数据目录下 `journey-api/status.json` 用于发现当前实例。客户端默认 `%APPDATA%/pomatez-focus`，命令行不接受任意配置路径、执行命令或主机地址。该目录继承 Windows 当前用户 AppData 权限；同用户进程/管理员在本机信任域内。instance 标识仅防止跨重启误投，不是秘密或独立认证。不要把运行目录放到共享盘、NAS、公开目录；接口不用于远程用户或其他机器。测试专用 `call(request, profile)` 只用于隔离合成 profile，Hermes 使用默认入口。

## 读取结果

```json
{
  "requestId": "b892880a-0263-4a53-b067-58e99bdc1ddf",
  "protocol": 1,
  "day": "2026-10-13",
  "scope": "local",
  "revision": "59d4fef6-f54c-40bd-83ce-ae15a905846e",
  "appliedRevision": null,
  "replayed": false,
  "tasks": [{"id":"local::task-id","title":"复核关键问题"}],
  "lockedSlotIds": [],
  "journey": {"version":1,"scope":"local","day":"2026-10-13","stages":[]}
}
```

上例 Journey 仅示意外层字段；实际返回原有完整阶段、槽位、休息状态及结束参考时间。阶段和槽位使用现有稳定 UUID。`tasks[].id` 是稳定来源标识（source / sourceKey / 底层 taskId），与当日临时 planId 无关；直接复制该 ID，不根据标题找任务。重复标题可能对应不同 ID。仅提供当前来源可用任务，已完成/pending 行不纳入。

读取既有任意日期；不存在的历史日期返回 NOT_FOUND。今天/未来缺失安排首次读取用用户现有默认模板初始化并保存一次，之后 ID 保持稳定。日期使用本机日历，2000–2100有效日期。今天和未来可写，过去只读。参考时间只是图示整数小时0–24或null，不是强制日程。

## 修改安排

写入必须提供读取结果的 `revision`，一次1–100项操作，所有操作校验完成后统一保存；不能传任意 Journey 覆盖整个对象。

```json
{
  "protocol":1,
  "requestId":"2cb1bb9c-a977-4a74-bffd-c5fd9c649ba7",
  "op":"write",
  "day":"2026-10-13",
  "expectedRevision":"59d4fef6-f54c-40bd-83ce-ae15a905846e",
  "operations":[
    {"type":"assign","slotId":"从读取结果复制","taskId":"从tasks复制；清空用null"},
    {"type":"move","slotId":"从读取结果复制","stageId":"目标阶段ID","beforeSlotId":null},
    {"type":"stage","stageId":"目标阶段ID","time":12,"restActions":["meal","nap"]},
    {"type":"end","hour":24}
  ]
}
```

- assign：修改未完成、非当前计时槽位的任务；taskId为catalog ID或null。
- move：跨段或段内移动未完成槽位；beforeSlotId为目标段中的锚点ID，null表示段尾。总数和槽位ID不变。
- stage：修改阶段参考时间或休息序列，至少提供一个字段。休息枚举meal、nap、gym、night、break，最多8个。已实际触发的休息节点不能改变序列，以保护实际记录。
- end：结束参考小时0–24或null。

保存后通知原页面重载旅程，并返回存储回读的完整结果、新revision和appliedRevision。原有完成绑定、FocusSession历史、当前计时、实际休息日志保留；接口不接受改写这些字段。

## Hermes 最小工具包装

```python
import json, subprocess, uuid

CLIENT = "scripts/journey-client.cjs"  # 在固定版本源码目录执行

def farm_journey(request):
    # 工具调用前由接入方落实用户授权；不暴露通用Shell参数。
    p = subprocess.run(["node", CLIENT], input=json.dumps(request),
                       text=True, capture_output=True, timeout=15)
    return json.loads(p.stdout)

day = "2026-10-13"
current = farm_journey(dict(protocol=1, requestId=str(uuid.uuid4()), op="read", day=day))
slot = current["journey"]["stages"][0]["slots"][0]["id"]
payload = dict(protocol=1, requestId=str(uuid.uuid4()), op="write", day=day,
               expectedRevision=current["revision"],
               operations=[dict(type="assign", slotId=slot, taskId=current["tasks"][0]["id"])])
saved = farm_journey(payload)
```

建议Hermes提供 `journey_read(day)` 与 `journey_update(day, expectedRevision, requestId, operations)` 两个窄工具。上述只是调用样例；本次未注册Hermes工具、修改其权限或声称实际接通。

## 冲突、重试和失败

requestId使用小写UUID。首次读取可使用新ID；同一逻辑写入重试必须原封不动复用ID、版本和操作。相同请求已提交时返回replayed=true与**当前**安排及原appliedRevision，不再次写入；即使此后用户手动修改也不会重放旧安排。同ID不同内容返回ID_REUSED。

每次实际手动修改都会产生新revision，包括A→B→A；旧expectedRevision返回CONFLICT，接入方须重新读并重新判断，不能自动换版本强行重放。计时/来源/记录在处理中变化也返回CONFLICT。一次保存将安排、revision、去重回执原子写入同一个localStorage项；不存在半份安排。每日期最多256次接口写，满后LIMIT拒绝，不丢弃回执；正常页面编辑仍可用。

错误返回 `{"requestId":"...","error":{"code":"CONFLICT","message":"..."}}`。主要码：INVALID、NOT_READY、NOT_FOUND、READ_ONLY、LOCKED、TASK_UNAVAILABLE、CONFLICT、ID_REUSED、LIMIT、SAVE_FAILED、TIMEOUT、TRANSPORT。旧/损坏数据保留并报错，不自动覆盖。超时可能发生在提交后而回执未收到；用同ID重试确认，禁止另生成ID。关App会移除发现文件并停止接口；重启后仍保留Journey回执。

实现复用 Electron 34.5.8 官方 [second-instance / requestSingleInstanceLock](https://github.com/electron/electron/blob/v34.5.8/docs/api/app.md)，和项目Journey/taskRef/locked/moveSlot/validate/write校验。原始测试与发布证据见本任务验收。
