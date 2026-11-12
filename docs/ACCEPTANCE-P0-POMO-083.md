# P0-POMO-083 两列统计卡片验收

目标/四源/边界/回滚见TASK-P0-POMO-083.md。原121单列变为两个独立纵向卡片栏：左科研/趋势/每日收获，右合计/作息/热力；901px以上两列，900px以下单列。保留统计数据算法与filter，空区间显示零值合计及空记录说明。去掉鼓励段落、装饰标签和图标；本周目标差值/达成及数据口径保留。

已验证：标准生产构建通过；隐藏静音隔离Electron合成夹具，2280/1440/1080竖屏为两列，760为一列；全部无横溢出，8周完整，趋势图210px；旧鼓励文案不存在；月切换、上一区间、科研分类和返回正常。已目视查看artifacts/stats-cards-1440.png/1080.png，六张卡片分栏正常、标题/数字无裁切；验证脚本位于忽略artifacts/stats-layout-desktop.cjs，不含个人记录。

Learning-Review none：已验证结果是常规展示重排，没有新的跨任务机制教训。最终交付如下。


最终0b2dadc干净生产构建成功；同一隔离脚本重跑四尺寸，补齐季、年、上年空态及零合计断言，PASS。截图已刷新为最终无图标文案。review_local_editing只读复核冻结diff/脚本/截图，最终PASS，早期截图差异及缺少空态测试意见均已关闭。

成品verify-package122：84个build文件与ASAR逐字节一致，隐藏隔离启动退出0；NSIS解包ASAR哈希与成品一致。安装包82,925,886字节，SHA256 44fba50dfebb1e2eb8fa6d447c734af56a8e90170536a9222341448884c30170。本地stage及第二次alreadyPrepared=true回读通过，不从GitHub重下载、不代用户安装或重启。

公开release442435968非draft prerelease、非Latest： https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.122 。release122-remote-draft/public.json确认五资产大小/摘要、固定annotated标签对应0b2dadc、旧121资产未变及Latest未变。实际上一版121 ASAR/source5940a3e原更新器：发布前current121、发布后available122，feed与本地同源包一致，errors=[]、downloads=0、autoDownload/autoInstallOnAppQuit=false。原始证据在忽略artifacts/release122-*；没有真实飞书写入。

收口绿灯：公开源码与固定交付相同，仅本卡及验收文档收口，无重叠写者；后续文档提交不改标签/安装包。Learning判断同前，暂无新候选；回滚按任务卡以新版本恢复布局，不替换公开122资产。
