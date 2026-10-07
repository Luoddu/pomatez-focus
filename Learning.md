# Learning.md - 番茄农场独立模块工程教训

<!-- LEARNING_SCHEMA_V1 -->

仅保存本独立仓库已验证、可用于后续农场任务的工程教训；任务状态只看模块执行卡。本文件不写入、不替代澄行根Learning及根路线图。

## LEARN-P0-POMO-039-01 - 草稿不能替代旧版更新链路验证

- Status: VALIDATED
- Source-Task: P0-POMO-039
- Evidence: docs/ACCEPTANCE-P0-POMO-039.md
- Applies-To: 后续番茄农场Windows preview标签和GitHub更新发布任务
- Lesson: 本仓此次公开annotated preview.71标签的虚拟条目出现在无鉴权releases.atom中，即使对应Release仍是草稿。固定electron-updater6.8.3从Atom选择同频道标签，请求该标签的preview.yml失败时回退同标签latest.yml，不会自动回退旧70；本次feed已在草稿中，但无鉴权请求404，真实旧版因此报错。不能用draft状态证明旧版更新可用，也不能泛化为所有GitHub草稿的行为。
- Required-Check: 创建公开preview标签后立即检查实际旧版更新器，记录Atom、选中版本及结果；交付时检查公开资产与真实旧版发现新版，不能以tag、draft或GitHub页面存在替代。保留身份、数据和不可变tag门禁，不用绕过hook或替换旧资产来掩盖失败。
- Supersedes: none
- Invalid-When: 更换更新器、频道或GitHub feed行为时须用新任务原始链路复验；本条不能用于断言未经测试的仓库或草稿全部可见。
