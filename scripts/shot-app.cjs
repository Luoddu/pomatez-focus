// Drives the built renderer (file://, no focusApi -> demo data) through the
// real interaction flow and captures design/shots/app-*.png evidence.
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const html = path.join(root, "app", "renderer", "build", "index.html");
const outDir = path.join(root, "artifacts", "ui-shots");
fs.mkdirSync(outDir, { recursive: true });
app.setPath(
  "userData",
  fs.mkdtempSync(path.join(os.tmpdir(), "farm-shots-"))
);
app.commandLine.appendSwitch("force-device-scale-factor", "1");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = setTimeout(() => {
  console.error("shot-app timed out");
  app.exit(2);
}, 90000);

app
  .whenReady()
  .then(async () => {
    const win = new BrowserWindow({
      show: false,
      width: 1280,
      height: 800,
      useContentSize: true,
      webPreferences: { offscreen: true, sandbox: true },
    });
    const errors = [];
    win.webContents.on("console-message", (_e, level, message) => {
      if (level >= 3) errors.push(message);
    });
    const js = (code) => win.webContents.executeJavaScript(code, true);
    const click = (text) =>
      js(
        `(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(
          text
        )}||b.textContent===${JSON.stringify(
          text
        )});if(!e)throw Error('Missing button ${text}');e.click()})()`
      );
    const shot = async (name) => {
      await win.webContents.executeJavaScript(
        "document.fonts ? document.fonts.ready.then(()=>true) : true",
        true
      );
      await wait(250);
      fs.writeFileSync(
        path.join(outDir, `app-${name}.png`),
        (await win.capturePage()).toPNG()
      );
      console.log(`captured app-${name}.png`);
    };
    const shotClip = async (name, selector) => {
      await wait(250);
      const rect = await js(
        `(()=>{const r=document.querySelector(${JSON.stringify(
          selector
        )}).getBoundingClientRect();return {x:Math.floor(r.left),y:Math.floor(r.top),width:Math.ceil(r.width),height:Math.ceil(r.height)}})()`
      );
      fs.writeFileSync(
        path.join(outDir, `app-${name}.png`),
        (await win.capturePage(rect)).toPNG()
      );
      console.log(`captured app-${name}.png`);
    };
    const results = [];
    // 「结束」需二次确认：第一次进入确认态，再点「确认结束」才真正结束
    const finish2 = async () => {
      await click("结束");
      await wait(120);
      await click("确认结束");
    };

    await win.loadURL(pathToFileURL(html).href);
    await wait(800);
    if (!(await js(`Boolean(document.querySelector('.focus-app'))`)))
      throw Error("FocusApp did not mount");
    // 无 focusApi 时不得出现横幅或 toast
    results.push({
      check: "demo mode mounts without banner or toast",
      pass: await js(
        `!document.querySelector('.banner') && !document.querySelector('.toast')`
      ),
    });
    // 显示名改名：作战农场 → 番茄农场（仅展示层）
    results.push({
      check: "window title renamed to 番茄农场",
      pass: await js(`document.title==='番茄农场'`),
    });
    // board：选中另一枚 chip 再截图
    await js(
      `(()=>{const c=[...document.querySelectorAll('.chip')].find(x=>!x.classList.contains('selected'));if(!c)throw Error('no unselected chip');c.click()})()`
    );
    await wait(120);
    results.push({
      check: "chip click selects its plan row",
      pass: await js(
        `document.querySelectorAll('.chip.selected').length===1`
      ),
    });
    await shot("board");

    // 已收 x/y 进度格：部分完成、未收获、全完成绿勾三种态
    results.push({
      check: "task rows show harvest badges with progress cells",
      pass: await js(
        `(()=>{const h=[...document.querySelectorAll('.harvest-mini')];const fig=h.find(x=>x.textContent.includes('已收 1/3'));const metal=h.find(x=>x.textContent.includes('已收 0/2'));return Boolean(fig)&&Boolean(metal)&&fig.querySelectorAll('.cell').length===3&&fig.querySelectorAll('.cell.on').length===1&&metal.querySelectorAll('.cell.on').length===0})()`
      ),
    });
    results.push({
      check: "fully done group shows green check badge and no chips",
      pass: await js(
        `(()=>{const b=[...document.querySelectorAll('.harvest-mini.done')].find(x=>x.textContent.includes('已收 2/2 ✓'));if(!b)return false;const task=b.closest('.task');return Boolean(task)&&!task.querySelector('.chip')&&task.querySelector('.task-name').textContent.includes('回复工作邮件')&&task.querySelectorAll('.cell.on').length===2})()`
      ),
    });
    // 字号层级：未完成任务名大于已完成；象限标题 pill 增大
    results.push({
      check: "unfinished task names are larger than finished ones",
      pass: await js(
        `(()=>{const open=[...document.querySelectorAll('.task:not(.complete) .task-name')].find(x=>x.textContent.includes('阅读学习资料'));const done=document.querySelector('.task.complete .task-name');if(!open||!done)return false;return parseFloat(getComputedStyle(open).fontSize)>parseFloat(getComputedStyle(done).fontSize)})()`
      ),
    });
    results.push({
      check: "quadrant title pills use the enlarged font size",
      pass: await js(
        `parseFloat(getComputedStyle(document.querySelector('.quad-head .pill')).fontSize)>=14`
      ),
    });
    // 周目标 chip：目标值强调 + 进度填充层
    results.push({
      check: "week goal chip emphasizes the goal over the progress number",
      pass: await js(
        `(()=>{const c=document.querySelector('.weekgoal-chip');if(!c)return false;const g=c.querySelector('.wg-goal'),n=c.querySelector('.wg-now');if(!g||!n)return false;const gs=getComputedStyle(g),ns=getComputedStyle(n);return parseFloat(gs.fontSize)>parseFloat(ns.fontSize)&&Number(gs.fontWeight)>Number(ns.fontWeight)})()`
      ),
    });
    results.push({
      check: "week goal chip shows progress as a clean bottom bar",
      pass: await js(
        `(()=>{const f=document.querySelector('.weekgoal-chip .wg-fill');if(!f)return false;const w=parseFloat(f.style.width);const cs=getComputedStyle(f);return w>0&&w<=100&&cs.height==='3px'&&cs.bottom==='2px'&&cs.transition.includes('width')})()`
      ),
    });
    // 悬浮任务行浮现 ±；全完成组 − 置灰、＋ 可用
    // 布局零位移验收：悬浮前后所有任务行/任务名/已收计数/chip 几何必须完全一致
    const layoutSnapshot = `JSON.stringify([...document.querySelectorAll('.task, .task-name, .harvest-mini, .chip')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.x*100),Math.round(r.y*100),Math.round(r.width*100),Math.round(r.height*100)]}))`;
    const layoutBeforeHover = await js(layoutSnapshot);
    await js(
      `(()=>{const t=[...document.querySelectorAll('.task')].find(x=>x.querySelector('.task-name')?.textContent.includes('阅读学习资料'));if(!t)throw Error('no metal task');t.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))})()`
    );
    await wait(150);
    results.push({
      check: "hover adjust overlay does not shift any task layout",
      pass: (await js(layoutSnapshot)) === layoutBeforeHover,
    });
    results.push({
      check: "adjust buttons render as an out-of-flow overlay",
      pass: await js(
        `getComputedStyle(document.querySelector('.adjust-btns')).position==='absolute'`
      ),
    });
    results.push({
      check: "hover reveals minus and plus buttons on the task row",
      pass: await js(
        `(()=>{const t=[...document.querySelectorAll('.task')].find(x=>x.querySelector('.task-name')?.textContent.includes('阅读学习资料'));if(!t)return false;const b=t.querySelectorAll('.adjust-btn');return b.length===2&&!b[0].disabled&&!b[1].disabled})()`
      ),
    });
    await shotClip("board-adjust-hover", '[data-quadrant="inu"]');
    // 模拟真实鼠标轨迹：先离开金相行（relatedTarget 指向回复工作邮件行）再进入
    await js(
      `(()=>{const m=[...document.querySelectorAll('.task')].find(x=>x.querySelector('.task-name')?.textContent.includes('阅读学习资料'));const p=[...document.querySelectorAll('.task')].find(x=>x.querySelector('.task-name')?.textContent.includes('回复工作邮件'));m.dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:p}));p.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,relatedTarget:m}))})()`
    );
    await wait(150);
    results.push({
      check: "minus disabled and plus enabled on a fully done group",
      pass: await js(
        `(()=>{const t=[...document.querySelectorAll('.task')].find(x=>x.querySelector('.task-name')?.textContent.includes('回复工作邮件'));if(!t)return false;const b=t.querySelectorAll('.adjust-btn');return b.length===2&&b[0].disabled&&!b[1].disabled})()`
      ),
    });
    await shotClip("board-done-group", '[data-quadrant="iu"]');
    // 未连接飞书点 ＋：明确错误 toast，chip 不变
    const chipsBefore = await js(`document.querySelectorAll('.chip').length`);
    await js(
      `(()=>{const t=[...document.querySelectorAll('.task')].find(x=>x.querySelector('.task-name')?.textContent.includes('回复工作邮件'));t.querySelector('.adjust-btn:not(:disabled)').click()})()`
    );
    await wait(200);
    results.push({
      check: "adjust without connection shows error toast and adds no chip",
      pass:
        (await js(
          `(()=>{const t=document.querySelector('.toast.error');return Boolean(t)&&t.textContent.includes('连接飞书')})()`
        )) &&
        (await js(`document.querySelectorAll('.chip').length`)) ===
          chipsBefore,
    });
    await shot("board-adjust-toast");
    await js(`document.querySelector('.toast-close')?.click()`);
    await wait(150);
    await js(
      `(()=>{const t=[...document.querySelectorAll('.task')].find(x=>x.querySelector('.task-name')?.textContent.includes('回复工作邮件'));t.dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}))})()`
    );
    await wait(120);
    results.push({
      check: "adjust buttons hide after mouse leaves",
      pass: await js(`!document.querySelector('.adjust-btns')`),
    });
    results.push({
      check: "layout is identical again after the overlay hides",
      pass: (await js(layoutSnapshot)) === layoutBeforeHover,
    });

    // chip 右键菜单：单选项「标记完成」；未连接飞书点击报错且 chip 保留
    const chipsBeforeMenu = await js(
      `document.querySelectorAll('.chip').length`
    );
    await js(
      `(()=>{const c=document.querySelector('[data-quadrant="inu"] .chip');if(!c)throw Error('no chip');c.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:200,clientY:200}))})()`
    );
    await wait(150);
    results.push({
      check: "right-click on a pending chip shows the complete menu",
      pass: await js(
        `(()=>{const m=document.querySelector('.ctx-menu .ctx-item');return Boolean(m)&&m.textContent.includes('标记完成')})()`
      ),
    });
    await shot("board-chip-menu");
    await js(`document.querySelector('.ctx-menu .ctx-item').click()`);
    await wait(200);
    results.push({
      check: "complete without connection shows error toast and keeps the chip",
      pass:
        (await js(
          `(()=>{const t=document.querySelector('.toast.error');return Boolean(t)&&t.textContent.includes('连接飞书')})()`
        )) &&
        (await js(`document.querySelectorAll('.chip').length`)) ===
          chipsBeforeMenu &&
        (await js(`!document.querySelector('.ctx-menu')`)),
    });
    await js(`document.querySelector('.toast-close')?.click()`);
    await wait(150);
    // 点空白处关闭菜单
    await js(
      `(()=>{const c=document.querySelector('[data-quadrant="inu"] .chip');c.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:200,clientY:200}))})()`
    );
    await wait(150);
    await js(`document.querySelector('.ctx-overlay')?.click()`);
    await wait(150);
    results.push({
      check: "menu closes when clicking elsewhere",
      pass: await js(`!document.querySelector('.ctx-menu')`),
    });

    // ⟳ 已并入「生成今日番茄」（静默分支含纯重读），工具行整行删除；无象限任务归入 unu
    results.push({
      check: "generate stays in overview title row; separate refresh button removed",
      pass: await js(
        `!document.querySelector('.board-toolbar')&&Boolean(document.querySelector('.side-title-actions .gen-btn'))&&!document.querySelector('.refresh-btn')`
      ),
    });
    results.push({
      check: "quadrant container has no internal scrollbar",
      pass: await js(
        `(()=>{const q=document.querySelector('.quadrants');return getComputedStyle(q).overflowY==='visible'&&q.scrollHeight<=q.clientHeight+1})()`
      ),
    });
    results.push({
      check: "uncategorized card removed; uncategorized tasks join unu",
      pass: await js(
        `!document.querySelector('[data-quadrant="uncat"]')&&!document.body.textContent.includes('未分类')&&Boolean(document.querySelector('[data-quadrant="unu"] .chip'))`
      ),
    });
    // 未连接飞书时点击生成按钮给出常驻错误 toast（不自动消失、带关闭 ×）
    await js(
      `(()=>{document.querySelector('.side-title-actions .gen-btn').click()})()`
    );
    await wait(200);
    results.push({
      check: "generate without connection shows persistent error toast",
      pass: await js(
        `(()=>{const t=document.querySelector('.toast.error');return Boolean(t)&&t.textContent.includes('连接飞书')&&Boolean(t.querySelector('.toast-close'))&&!document.querySelector('.banner')})()`
      ),
    });
    await shot("toast-error");
    await wait(3300);
    results.push({
      check: "error toast stays until dismissed",
      pass: await js(`Boolean(document.querySelector('.toast.error'))`),
    });
    await js(`document.querySelector('.toast-close')?.click()`);
    await wait(150);
    results.push({
      check: "error toast closes on x",
      pass: await js(`!document.querySelector('.toast')`),
    });
    // 细滚动条样式已注入
    results.push({
      check: "thin translucent scrollbar rules injected",
      pass: await js(
        `[...document.styleSheets].some(s=>{try{return [...s.cssRules].some(r=>r.selectorText&&r.selectorText.includes('::-webkit-scrollbar'))}catch{return false}})`
      ),
    });

    // 番茄月历：色阶格子与悬停 tooltip；番茄地：阶段文案
    results.push({
      check: "heatmap card with colored day cells",
      pass: await js(
        `Boolean(document.querySelector('.heatmap'))&&document.querySelectorAll('.hm-cell[data-count]:not([data-count=""]):not([data-count="0"])').length>=10`
      ),
    });
    await js(
      `(()=>{const c=[...document.querySelectorAll('.hm-cell')].find(x=>Number(x.dataset.count)>0);c.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))})()`
    );
    await wait(150);
    results.push({
      check: "heatmap hover shows tooltip with count and minutes",
      pass: await js(
        `(()=>{const t=document.querySelector('.heatmap-tip');return Boolean(t)&&t.textContent.includes('个番茄')&&t.textContent.includes('分钟')})()`
      ),
    });
    await shot("board-heatmap-tip");
    await js(
      `(()=>{const c=[...document.querySelectorAll('.hm-cell')].find(x=>Number(x.dataset.count)>0);c.dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}))})()`
    );
    results.push({
      check: "farm field shows weekly growth caption and cumulative harvest pile",
      pass: await js(
        `(()=>{const f=document.querySelector('.farm-field');if(!f)return false;const t=f.textContent;return t.includes('本周已收')&&t.includes('累计收获')&&t.includes('周日翻篇')&&Boolean(f.querySelector('.farm-pile'))&&f.querySelector('.farm-pile-text').textContent.includes('累计收获')})()`
      ),
    });
    // 象限着色：果筐堆按累计象限分布混色（红/黄/青渐变里至少看到黄和青）
    results.push({
      check: "harvest pile mixes quadrant gradient tones from cumulative records",
      pass: await js(
        `(()=>{const p=document.querySelector('.farm-pile');return Boolean(p)&&p.innerHTML.includes('url(#farm-tomato-inu)')&&p.innerHTML.includes('url(#farm-tomato-uni)')&&p.innerHTML.includes('url(#farm-tomato-iu)')})()`
      ),
    });
    // 柔化色板 + 哑光径向渐变：场景内有 6 只番茄渐变 defs，色值来自新色板
    results.push({
      check: "farm tomatoes render as radial gradients from the softened palette",
      pass: await js(
        `(()=>{const s=document.querySelector('.farm-scene');if(!s)return false;if(s.querySelectorAll('radialGradient').length<6)return false;const h=s.innerHTML;return h.includes('#f2cd73')&&h.includes('#63c3d2')&&h.includes('#e57368')&&[...s.querySelectorAll('.farm-pile ellipse')].some(c=>(c.getAttribute('fill')||'').startsWith('url('))})()`
      ),
    });
    // 哑光化：无白色高光点（fill #fff + opacity .45 的椭圆/圆），
    // 渐变中心 stop 就是主色（不再是 45% 白混合色）
    results.push({
      check: "tomatoes are matte with no glossy highlight dots",
      pass: await js(
        `(()=>{const s=document.querySelector('.farm-scene');if(!s)return false;const glossy=[...s.querySelectorAll('ellipse,circle')].some(e=>e.getAttribute('fill')==='#fff'&&e.getAttribute('opacity')==='.45');const first=s.querySelector('#farm-tomato-iu stop');return !glossy&&first&&first.getAttribute('stop-color')==='#e57368'})()`
      ),
    });
    // 形态微差：果筐堆果实是椭圆且 rx 至少 3 种取值（确定性伪随机，不闪变）
    results.push({
      check: "pile tomatoes carry deterministic shape variation",
      pass: await js(
        `(()=>{const es=[...document.querySelectorAll('.farm-pile ellipse')].filter(e=>(e.getAttribute('fill')||'').startsWith('url('));if(es.length<3)return false;const rx=new Set(es.map(e=>e.getAttribute('rx')));const ry=new Set(es.map(e=>e.getAttribute('ry')));return rx.size>=3&&ry.size>=3&&es.every(e=>e.closest('g').getAttribute('transform')&&e.closest('g').getAttribute('transform').startsWith('rotate('))})()`
      ),
    });
    // 天空实时性：非 mock 页面走 live 通道，小时数与北京时间一致；
    // 时间跳变 + 窗口聚焦后立即重算（60s 定时器的即时验证路径）
    results.push({
      check: "sky runs in live mode and matches Beijing hour",
      pass: await js(
        `(()=>{const s=document.querySelector('.farm-scene');if(!s||s.dataset.sky!=='live')return false;const h=((Date.now()+28800000)/3600000)%24;const d=Math.abs(parseFloat(s.dataset.skyHour)-h);return d<0.2||24-d<0.2})()`
      ),
    });
    const skyHourBefore = await js(
      `document.querySelector('.farm-scene').dataset.skyHour`
    );
    await js(
      `(()=>{const d=Date.now.bind(Date);window.__skyRealNow=d;Date.now=()=>d()+3*3600e3;window.dispatchEvent(new Event('focus'))})()`
    );
    await wait(200);
    results.push({
      check: "sky state recomputes when the clock jumps and window refocuses",
      pass: await js(
        `(()=>{const s=document.querySelector('.farm-scene');const d=parseFloat(s.dataset.skyHour)-parseFloat(${JSON.stringify(
          skyHourBefore
        )});return Math.abs(d-3)<0.1||Math.abs(d+21)<0.1})()`
      ),
    });
    await js(
      `(()=>{Date.now=window.__skyRealNow;window.dispatchEvent(new Event('focus'))})()`
    );
    await wait(200);
    // 排版：果筐堆在土壤带左侧留白，不再压地面
    results.push({
      check: "harvest pile sits in the margin left of the soil band",
      pass: await js(
        `(()=>{const p=document.querySelector('.farm-pile').getBoundingClientRect();const g=document.querySelector('.farm-ground').getBoundingClientRect();return p.right<=g.left+1})()`
      ),
    });
    // 专注记录圆点按象限着色：至少出现 3 种象限色 class
    results.push({
      check: "record list icons carry quadrant tone classes",
      pass: await js(
        `(()=>{const set=new Set([...document.querySelectorAll('.r-icon')].map(e=>(e.className.match(/tone-(iu|inu|uni|unu|free)/)||[])[1]).filter(Boolean));return set.size>=3})()`
      ),
    });
    // chip 强化：放大到 34px、加粗、按象限淡色底 + 象限色描边/数字色
    results.push({
      check: "chips are enlarged, bold, and quadrant-toned",
      pass: await js(
        `(()=>{const c=document.querySelector('.chip:not(.selected)');if(!c)return false;const r=c.getBoundingClientRect();const cs=getComputedStyle(c);return r.height>=33&&Number(cs.fontWeight)>=600&&/tone-(iu|inu|uni|unu)/.test(c.className)&&cs.borderColor!=='rgb(255, 255, 255)'})()`
      ),
    });
    results.push({
      check: "scarecrow replaced the wooden sign",
      pass: await js(
        `Boolean(document.querySelector('.farm-scarecrow'))&&Boolean(document.querySelector('.farm-fence'))&&!(document.querySelector('.farm-field')?.textContent.includes('作战农场'))`
      ),
    });
    await shotClip("farm-closeup", ".farm-field");
    results.push({
      check: "farm tooltip hides after mouse leaves",
      pass: await js(`!document.querySelector('.heatmap-tip')`),
    });

    // 周目标 chip：默认 60，悬浮开 popover；把目标改为本周已收数即达成
    results.push({
      check: "week goal chip shows this-week progress over default 60",
      pass: await js(
        `(()=>{const c=document.querySelector('.weekgoal-chip');return Boolean(c)&&/^周目标 [1-9]\\d*\\/60$/.test(c.textContent)})()`
      ),
    });
    const weekTotal = await js(
      `Number(document.querySelector('.weekgoal-chip').textContent.match(/周目标 (\\d+)\\//)[1])`
    );
    await js(
      `document.querySelector('.weekgoal').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`
    );
    await wait(150);
    results.push({
      check: "week goal popover opens on hover with prefilled input",
      pass: await js(
        `(()=>{const p=document.querySelector('.weekgoal-pop');return Boolean(p)&&p.querySelector('input').value==='60'})()`
      ),
    });
    await shot("board-weekgoal");
    await js(
      `(()=>{const i=document.querySelector('.weekgoal-pop input');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'${weekTotal}');i.dispatchEvent(new Event('input',{bubbles:true}))})()`
    );
    await js(`document.querySelector('.weekgoal-pop button').click()`);
    await wait(300);
    results.push({
      check: "saving a reached goal marks chip met, stores only this week key, and toasts",
      pass: await js(`(()=>{
        const c=document.querySelector('.weekgoal-chip');
        const stored=JSON.parse(localStorage.getItem('pomatez-focus-weekgoal-v1')||'{}');
        const keys=Object.keys(stored);
        const t=document.querySelector('.toast');
        return Boolean(c)&&c.classList.contains('met')
          &&c.textContent==='周目标 ${weekTotal}/${weekTotal}'
          &&keys.length===1&&stored[keys[0]]===${weekTotal}
          &&/^\\d{4}-\\d{2}-\\d{2}$/.test(keys[0])
          &&Boolean(t)&&t.textContent.includes('本周目标达成');
      })()`),
    });
    results.push({
      check: "met week column glows gold and carries a tomato badge",
      pass: await js(
        `Boolean(document.querySelector('.hm-badge'))&&document.querySelectorAll('.hm-cell.hm-goal-met').length>0`
      ),
    });
    // 月历周合计：有记录的周标注总数，无记录周不标，当前周（最右列）也标
    results.push({
      check: "heatmap labels week totals, skips empty weeks, includes current week",
      pass: await js(
        `(()=>{const slots=[...document.querySelectorAll('.hm-badge-slot')];const totals=[...document.querySelectorAll('.hm-week-total')];if(!slots.length||!totals.length)return false;if(totals.length>=slots.length)return false;if(!totals.every(t=>/^[1-9]\\d*$/.test(t.textContent)))return false;const last=slots[slots.length-1].querySelector('.hm-week-total');return Boolean(last)&&Number(last.textContent)>0})()`
      ),
    });
    // 「共 N 个番茄」分级：demo 里 5-9 个的日期带 mid，今天（2 个）不带档
    results.push({
      check: "day total tiers: mid tone on 5-9 tomato days, none on a light today",
      pass: await js(
        `(()=>{const mid=[...document.querySelectorAll('.day-total.mid')];if(!mid.length||!mid.every(e=>{const n=Number(e.textContent.match(/共 (\\d+) 个番茄/)?.[1]);return n>=5&&n<=9}))return false;const today=document.querySelector('.record-day .day-total');return Boolean(today)&&!today.className.includes('mid')&&!today.className.includes('high')})()`
      ),
    });
    results.push({
      check: "export button is not rendered while add/manual-sync stay",
      pass: await js(
        `![...document.querySelectorAll('button')].some(b=>b.textContent==='导出')&&[...document.querySelectorAll('button')].some(b=>b.textContent==='补记')`
      ),
    });
    await shotClip("board-heatmap-weektotals", ".heatmap");
    await shot("board-weekgoal-met");
    await js(
      `document.querySelector('.weekgoal').dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}))`
    );
    await js(`document.querySelector('.toast-close')?.click()`);
    await wait(150);
    results.push({
      check: "week goal popover closes after mouse leaves",
      pass: await js(`!document.querySelector('.weekgoal-pop')`),
    });

    await click("开始专注");
    await wait(500);
    results.push({
      check: "timing view with ring and current task card",
      pass: await js(
        `Boolean(document.querySelector('.ring'))&&Boolean(document.querySelector('.current-task'))`
      ),
    });
    await shot("timing");

    await click("暂停");
    await wait(200);
    await click("继续");
    await wait(200);
    // 「结束」二次确认：第一次只进入确认态，不进 review；3 秒未点自动还原
    await click("结束");
    await wait(150);
    results.push({
      check: "finish needs a confirming second click",
      pass: await js(
        `(()=>{const b=[...document.querySelectorAll('.timing-buttons button')].find(x=>x.textContent==='确认结束？');return Boolean(b)&&b.classList.contains('btn-danger-confirm')&&!document.querySelector('.review-card')&&Boolean(document.querySelector('.ring'))})()`
      ),
    });
    await shot("timing-finish-confirm");
    await wait(3300);
    results.push({
      check: "finish confirm state reverts after 3s",
      pass: await js(
        `(()=>{const t=[...document.querySelectorAll('.timing-buttons button')].map(b=>b.textContent);return t.includes('结束')&&!t.includes('确认结束？')})()`
      ),
    });
    await finish2();
    await wait(300);
    results.push({
      check: "review card shown after confirmed finish",
      pass: await js(`Boolean(document.querySelector('.review-card'))`),
    });
    // 误点结束的回退路径：返回继续计时 → 暂停中的计时屏，分钟数保留
    results.push({
      check: "review offers return-to-timing after the four main actions",
      pass: await js(
        `(()=>{const t=[...document.querySelectorAll('.review-actions button')].map(b=>b.textContent);return ['记录番茄','保存并休息 5 分钟','保存并开始下一个','放弃本次','返回继续计时'].every(x=>t.includes(x))&&t.indexOf('返回继续计时')>t.indexOf('放弃本次')})()`
      ),
    });
    await click("返回继续计时");
    await wait(300);
    results.push({
      check: "return-to-timing restores paused timer with elapsed kept",
      pass:
        (await js(
          `(()=>{const a=JSON.parse(localStorage.getItem('pomatez-focus-v1')).active;return a&&a.status==='paused'&&a.endedAt===undefined&&a.elapsedSeconds>0})()`
        )) &&
        (await js(
          `(()=>{const n=document.querySelector('.ring-note');return Boolean(n)&&n.textContent.includes('已暂停')&&!document.querySelector('.review-card')})()`
        )),
    });
    await shot("timing-returned");
    // 返回后再结束：重新进入结束确认屏继续原流程
    await finish2();
    await wait(300);
    // 完成番茄数快选：按钮数 = floor(实际分钟/番茄时长)+1 再 +1 个 0 档，默认选中自动累计值
    results.push({
      check: "review count quick-select replaces stepper with auto default",
      pass: await js(
        `(()=>{const b=[...document.querySelectorAll('.quick-counts .count-btn')];return b.length>=2&&b[0].textContent==='0'&&b[0].classList.contains('selected')&&!document.querySelector('.review-card .stepper')})()`
      ),
    });
    await js(
      `(()=>{[...document.querySelectorAll('.quick-counts .count-btn')].find(b=>b.textContent==='1').click()})()`
    );
    await wait(150);
    results.push({
      check: "quick-select click changes selected count",
      pass: await js(
        `(()=>{const b=[...document.querySelectorAll('.quick-counts .count-btn')];return b[1].classList.contains('selected')&&!b[0].classList.contains('selected')})()`
      ),
    });
    results.push({
      check: "save-and-next enabled when next pomodoro exists",
      pass: await js(
        `(()=>{const b=[...document.querySelectorAll('.review-actions button')].find(x=>x.textContent==='保存并开始下一个');return b&&!b.disabled})()`
      ),
    });
    await shot("review");

    const before = await js(
      `JSON.parse(localStorage.getItem('pomatez-focus-v1')).records.length`
    );
    // count-up 起点：保存前的今日番茄数与周目标进度数字
    const todayStatBefore = await js(
      `Number(document.querySelector('[data-stat="今日番茄"] strong').textContent)`
    );
    const wgNowBefore = await js(
      `Number(document.querySelector('.weekgoal-chip .wg-now').textContent)`
    );
    await click("记录番茄");
    await wait(300);
    const after = await js(
      `JSON.parse(localStorage.getItem('pomatez-focus-v1')).records.length`
    );
    results.push({ check: "save appends one record", pass: after === before + 1 });
    results.push({
      check: "save shows info toast",
      pass: await js(
        `(()=>{const t=document.querySelector('.toast');return Boolean(t)&&!t.classList.contains('error')&&t.textContent.includes('已保存')})()`
      ),
    });
    await shot("board-saved");
    // count-up 动效结束态：概览数字与 chip 进度最终都落到新值
    await wait(700);
    results.push({
      check: "today tomatoes stat counts up to the new total",
      pass:
        (await js(
          `Number(document.querySelector('[data-stat="今日番茄"] strong').textContent)`
        )) ===
        todayStatBefore + 1,
    });
    results.push({
      check: "week goal progress number counts up in sync",
      pass:
        (await js(
          `Number(document.querySelector('.weekgoal-chip .wg-now').textContent)`
        )) ===
        wgNowBefore + 1,
    });
    await shotClip("board-weekgoal-closeup", ".weekgoal");
    await shotClip("board-stats-countup", ".stat-grid");
    // 信息类 toast 约 3 秒自动消失
    await wait(3400);
    results.push({
      check: "info toast auto-dismisses",
      pass: await js(`!document.querySelector('.toast')`),
    });

    // 保存并开始下一个：保存后自动开始同任务的第 2 个番茄
    await click("开始专注");
    await wait(400);
    await finish2();
    await wait(300);
    await click("保存并开始下一个");
    await wait(400);
    results.push({
      check: "save-and-next appends record and starts pomodoro 2",
      pass:
        (await js(
          `JSON.parse(localStorage.getItem('pomatez-focus-v1')).records.length`
        )) ===
          after + 1 &&
        (await js(
          `document.querySelector('.current-task')?.textContent.includes('第 2 个番茄')`
        )),
    });
    await shot("timing-next");

    // 第 2 个番茄没有后续：保存并开始下一个应禁用
    await finish2();
    await wait(300);
    results.push({
      check: "save-and-next disabled without next pomodoro",
      pass: await js(
        `(()=>{const b=[...document.querySelectorAll('.review-actions button')].find(x=>x.textContent==='保存并开始下一个');return b&&b.disabled})()`
      ),
    });
    // 保存并休息 5 分钟：记录 +1，操作条出现绿色休息进度条，开始按钮禁用
    await click("保存并休息 5 分钟");
    await wait(400);
    results.push({
      check: "save-and-rest appends record and shows rest bar",
      pass:
        (await js(
          `JSON.parse(localStorage.getItem('pomatez-focus-v1')).records.length`
        )) ===
          after + 2 &&
        (await js(
          `document.querySelector('.rest-bar')?.textContent.includes('休息中')`
        )) &&
        (await js(`document.querySelector('.btn-begin').disabled`)),
    });
    await shot("board-rest");

    // 休息是内存态：刷新后清除，再测手动补记
    await win.loadURL(pathToFileURL(html).href);
    await wait(800);
    const totalBefore = await js(
      `Number(document.querySelector('[data-stat="总番茄"] strong').textContent)`
    );
    const todayBefore = await js(
      `document.querySelector('.hm-cell.today').dataset.count`
    );
    await click("补记");
    await wait(250);
    await js(
      `(()=>{const i=document.getElementById('manual-minutes');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'30');i.dispatchEvent(new Event('input',{bubbles:true}))})()`
    );
    await wait(150);
    await click("保存补记");
    await wait(300);
    results.push({
      check: "manual entry appends record and bumps totals",
      pass:
        (await js(
          `JSON.parse(localStorage.getItem('pomatez-focus-v1')).records.length`
        )) ===
          after + 3 &&
        (await js(
          `Number(document.querySelector('[data-stat="总番茄"] strong').textContent)`
        )) ===
          totalBefore + 1 &&
        (await js(`document.querySelector('.hm-cell.today').dataset.count`)) ===
          String(Number(todayBefore) + 1),
    });
    results.push({
      check: "heatmap transposed to week columns x weekday rows",
      pass: await js(
        `(()=>{const g=document.querySelector('.hm-grid');if(!g)return false;const cols=getComputedStyle(g).gridTemplateColumns.split(/\\s+/).length-1;return cols>=12&&document.querySelectorAll('.hm-cell').length===7*cols&&document.querySelectorAll('.hm-dow').length===7&&[...document.querySelectorAll('.hm-month')].some(x=>x.textContent.includes('月'))&&Boolean(document.querySelector('.hm-cell.today'))})()`
      ),
    });
    results.push({
      check: "heatmap cells show small day counts only when count > 0",
      pass: await js(
        `(()=>{const cells=[...document.querySelectorAll('.hm-cell')];const withCount=cells.filter(c=>Number(c.dataset.count)>0);return withCount.length>0&&withCount.every(c=>c.textContent===c.dataset.count)&&cells.filter(c=>!c.dataset.count||c.dataset.count==='0').every(c=>c.textContent==='')})()`
      ),
    });
    await shotClip("heatmap-closeup", ".heatmap");
    await shot("board-manual");
    // 等补记的信息 toast 自动消失后再进大视口复查
    await wait(3200);

    // 大视口复查：1920×1080 下 board/timing 的文字层级与密度
    await js(`document.querySelector('.toast-close')?.click()`);
    win.setContentSize(1920, 1080);
    await wait(400);
    results.push({
      check: "no horizontal overflow at 1920 wide board",
      pass: await js(
        `document.documentElement.scrollWidth<=document.documentElement.clientWidth`
      ),
    });
    await shot("board-wide");
    await click("开始专注");
    await wait(500);
    await shot("timing-wide");
    await finish2();
    await wait(300);
    await click("放弃本次");
    await wait(300);
    win.setContentSize(1280, 800);
    await wait(300);

    // 放弃不新增记录
    await click("开始专注");
    await wait(300);
    await finish2();
    await wait(300);
    await click("放弃本次");
    await wait(300);
    results.push({
      check: "discard adds no record",
      pass:
        (await js(
          `JSON.parse(localStorage.getItem('pomatez-focus-v1')).records.length`
        )) ===
        after + 3,
    });

    await js(`document.querySelector('[aria-label="设置"]').click()`);
    await wait(250);
    results.push({
      check: "settings panel shows connection form and about",
      pass: await js(
        `Boolean(document.querySelector('.settings-col .field-grid'))&&document.body.textContent.includes('基于开源项目 pomatez')`
      ),
    });
    // 提示音开关：默认开启，点击关闭并写入独立 key（不动专注记录键）
    results.push({
      check: "sound toggle visible and enabled by default",
      pass: await js(
        `(()=>{const b=document.querySelector('.sound-toggle');return Boolean(b)&&b.getAttribute('aria-pressed')==='true'&&b.textContent==='已开启'})()`
      ),
    });
    await js(`document.querySelector('.sound-toggle').click()`);
    await wait(150);
    results.push({
      check: "sound toggle persists off to its own key",
      pass: await js(
        `(()=>{const b=document.querySelector('.sound-toggle');return b.textContent==='已关闭'&&localStorage.getItem('pomatez-focus-sound-v1')==='0'&&Boolean(JSON.parse(localStorage.getItem('pomatez-focus-v1')).records)})()`
      ),
    });
    await js(`document.querySelector('.sound-toggle').click()`);
    await wait(150);
    results.push({
      check: "sound toggle restores on",
      pass: await js(
        `document.querySelector('.sound-toggle').textContent==='已开启'&&localStorage.getItem('pomatez-focus-sound-v1')==='1'`
      ),
    });
    // 滑到底部，让提示音开关与版本号同框留证
    await js(
      `document.querySelector('.settings-scroll').scrollTop=document.querySelector('.settings-scroll').scrollHeight`
    );
    await wait(200);
    await shot("settings-sound");
    await js(`document.querySelector('.settings-scroll').scrollTop=0`);
    await wait(150);
    await shot("settings");
    await js(`document.querySelector('[aria-label="设置"]').click()`);
    await wait(200);

    // mini：开始新番茄后切换小窗（无主进程时 windowMode 本地回退）
    await click("开始专注");
    await wait(300);
    await js(`document.querySelector('[aria-label="切换小窗"]').click()`);
    await wait(200);
    win.setContentSize(360, 220);
    await wait(300);
    results.push({
      check: "compact mini view renders",
      pass: await js(
        `document.querySelector('.focus-app').classList.contains('compact')&&Boolean(document.querySelector('.mini-body .ring'))`
      ),
    });
    await shot("mini");
    await js(`document.querySelector('[aria-label="切换小窗"]').click()`);
    await wait(300);
    results.push({
      check: "no horizontal overflow at 1280 board",
      pass: await js(
        `document.documentElement.scrollWidth<=document.documentElement.clientWidth`
      ),
    });

    // 番茄园白天/夜晚特写：?farmNow=<ms> 驱动 mock 北京时间；
    // mini 流程留下的是进行中的计时：先「结束→放弃本次」再清存储，
    // 否则旧页面计时器会在导航前把活动会话写回 localStorage
    await finish2();
    await wait(300);
    await click("放弃本次");
    await wait(200);
    await js(`localStorage.clear()`);
    // mini 截图后窗口仍是 360x220，先恢复大视口再拍番茄园特写
    win.setContentSize(1280, 800);
    await wait(300);
    // 高窗口填充验证：农场卡片 flex 生长吃掉四象限下方空白，
    // 地面层保持 720:150 锚底不拉伸
    win.setContentSize(1280, 1000);
    await wait(400);
    results.push({
      check: "farm scene grows to fill the tall board window",
      pass: await js(
        `(()=>{const s=document.querySelector('.farm-scene');if(!s)return false;const r=s.getBoundingClientRect();const land=document.querySelector('.farm-land').getBoundingClientRect();return r.height>180&&Math.abs(land.bottom-r.bottom)<2})()`
      ),
    });
    await shot("board-tall");
    win.setContentSize(1280, 800);
    await wait(300);

    // 生成进度 UI：file:// 无 focusApi，用 ?genMock=1 按真实阶段顺序本地模拟
    await win.loadURL(`${pathToFileURL(html).href}?genMock=1`);
    await wait(800);
    await click("生成今日番茄");
    await wait(300);
    results.push({
      check: "generate click shows spinner, stage text and locks the button",
      pass: await js(
        `(()=>{const b=document.querySelector('.gen-btn');const p=document.querySelector('.gen-progress');return Boolean(b&&b.disabled&&b.querySelector('.gen-spinner'))&&Boolean(p&&p.textContent.includes('正在'))})()`
      ),
    });
    // 防重入：进行中按钮 disabled，再点是 no-op（不重启阶段序列）
    await js(`document.querySelector('.gen-btn').click()`);
    await shot("board-generating");
    await wait(2400);
    results.push({
      check: "stage text advances to write progress x/y",
      pass: await js(
        `(()=>{const p=document.querySelector('.gen-progress');return Boolean(p)&&/正在写入 \\d+\\/8…/.test(p.textContent)})()`
      ),
    });
    await wait(2600);
    results.push({
      check: "generate mock finishes with toast and cleared stage text",
      pass: await js(
        `(()=>{const b=document.querySelector('.gen-btn');return Boolean(b)&&!b.disabled&&!document.querySelector('.gen-progress')&&document.body.textContent.includes('模拟生成完成')})()`
      ),
    });
    const atBeijing = (hour) => {
      const d = new Date(Date.now() + 8 * 3600e3);
      d.setUTCHours(hour, 0, 0, 0);
      return d.getTime() - 8 * 3600e3;
    };
    // 清晨 06:00：日出橙色温，太阳贴着左侧地平线
    await win.loadURL(
      `${pathToFileURL(html).href}?farmNow=${atBeijing(6)}`
    );
    await wait(800);
    results.push({
      check: "Beijing dawn shows a low left sun on warm tint and mock mode",
      pass: await js(
        `(()=>{const s=document.querySelector('.farm-sun');const sc=document.querySelector('.farm-scene');return Boolean(s)&&!document.querySelector('.farm-moon')&&sc.dataset.sky==='mock'&&parseFloat(s.style.left)<15&&parseFloat(s.style.top)>50})()`
      ),
    });
    await shotClip("farm-dawn", ".farm-field");
    // 正午 12:00：太阳接近天顶
    await win.loadURL(
      `${pathToFileURL(html).href}?farmNow=${atBeijing(12)}`
    );
    await wait(800);
    results.push({
      check: "Beijing noon shows the sun near the top",
      pass: await js(
        `(()=>{const s=document.querySelector('.farm-sun');return Boolean(s)&&parseFloat(s.style.top)<15&&parseFloat(s.style.left)>40&&parseFloat(s.style.left)<60})()`
      ),
    });
    await shotClip("farm-noon", ".farm-field");
    await win.loadURL(
      `${pathToFileURL(html).href}?farmNow=${atBeijing(14)}`
    );
    await wait(800);
    results.push({
      check: "farm shows a high sun on a Beijing afternoon",
      pass: await js(
        `Boolean(document.querySelector('.farm-sun'))&&!document.querySelector('.farm-moon')`
      ),
    });
    await shotClip("farm-day", ".farm-field");
    // 傍晚 18:00：日落橙色温，太阳低垂右侧
    await win.loadURL(
      `${pathToFileURL(html).href}?farmNow=${atBeijing(18)}`
    );
    await wait(800);
    results.push({
      check: "Beijing dusk shows a low right sun",
      pass: await js(
        `(()=>{const s=document.querySelector('.farm-sun');return Boolean(s)&&parseFloat(s.style.left)>80&&parseFloat(s.style.top)>45})()`
      ),
    });
    await shotClip("farm-dusk", ".farm-field");
    await win.loadURL(
      `${pathToFileURL(html).href}?farmNow=${atBeijing(23)}`
    );
    await wait(800);
    results.push({
      check: "farm shows moon and stars on a Beijing night",
      pass: await js(
        `Boolean(document.querySelector('.farm-moon'))&&!document.querySelector('.farm-sun')&&document.querySelectorAll('.farm-star').length>0`
      ),
    });
    await shotClip("farm-night", ".farm-field");

    // ── 象限空间自适应：?demoTasks= 注入合成分布（页面重载，不影响上面 demo 断言） ──
    // 场景 A：Q1 十七个任务、Q2 空 → Q1 占满行宽双列、Q2 收成细条；下排两空维持均分
    await win.setContentSize(1280, 800);
    await win.loadURL(`${pathToFileURL(html).href}?demoTasks=iu:17`);
    await wait(800);
    results.push({
      check: "borrow: full quadrant spreads, empty sibling shrinks to a slim strip",
      pass: await js(
        `(()=>{const q1=document.querySelector('.quad-iu'),q2=document.querySelector('.quad-inu');if(!q1.classList.contains('spread')||!q2.classList.contains('slim'))return false;const a=q1.getBoundingClientRect(),b=q2.getBoundingClientRect();const list=q1.querySelector('.task-list');return a.width>b.width*2&&b.width<280&&getComputedStyle(list).display==='grid'&&q2.textContent.includes('暂无任务')&&q2.textContent.includes('0 个任务')})()`
      ),
    });
    results.push({
      check: "borrow: spread quadrant lays tasks out in two columns",
      pass: await js(
        `(()=>{const t=[...document.querySelectorAll('.quad-iu .task')];if(t.length!==17)return false;const tops=t.map(x=>x.getBoundingClientRect().top);return Math.abs(tops[0]-tops[1])<2&&new Set(tops).size<=9})()`
      ),
    });
    results.push({
      check: "borrow: long task names still clamp with ellipsis in two columns",
      pass: await js(
        `[...document.querySelectorAll('.quad-iu .task-name')].some(e=>e.scrollHeight>e.clientHeight+1)`
      ),
    });
    results.push({
      check: "borrow: chips never overflow their task row while scrolling",
      pass: await js(
        `[...document.querySelectorAll('.quad-iu .task')].every(t=>{const r=t.getBoundingClientRect();const c=t.querySelector('.chips');return !c||c.getBoundingClientRect().bottom<=r.bottom+1})`
      ),
    });
    results.push({
      check: "borrow: both-empty row stays fifty fifty",
      pass: await js(
        `(()=>{const a=document.querySelector('.quad-uni').getBoundingClientRect(),b=document.querySelector('.quad-unu').getBoundingClientRect();return Math.abs(a.width-b.width)<24&&!document.querySelector('.quad-uni.slim')&&!document.querySelector('.quad-unu.slim')})()`
      ),
    });
    await shotClip("board-quadrant-borrow", ".quadrants");
    // 场景 B：同行两个都有任务 → 维持 50/50，无借用
    await win.loadURL(`${pathToFileURL(html).href}?demoTasks=iu:3,inu:2`);
    await wait(800);
    results.push({
      check: "no borrow when both quadrants in a row have tasks",
      pass: await js(
        `(()=>{const a=document.querySelector('.quad-iu').getBoundingClientRect(),b=document.querySelector('.quad-inu').getBoundingClientRect();return Math.abs(a.width-b.width)<24&&!document.querySelector('.quad.slim')&&!document.querySelector('.quad.spread')})()`
      ),
    });
    // 场景 C：38 个任务超满载 → 任务列表内滚，农场与开始专注始终在视口内（800 高标准窗 + 1080p）
    await win.loadURL(
      `${pathToFileURL(html).href}?demoTasks=iu:22,inu:6,uni:6,unu:4`
    );
    await wait(800);
    results.push({
      check: "overload: task lists scroll internally at 1280x800",
      pass: await js(
        `[...document.querySelectorAll('.quad .task-list')].some(e=>e.scrollHeight>e.clientHeight+1)`
      ),
    });
    const beginVisible = `(()=>{const r=document.querySelector('.btn-begin').getBoundingClientRect();const f=document.querySelector('.farm-field').getBoundingClientRect();return r.top>=0&&r.bottom<=window.innerHeight+1&&f.bottom<=window.innerHeight+1})()`;
    results.push({
      check: "overload: begin button and farm stay in viewport at 1280x800",
      pass: await js(beginVisible),
    });
    await shot("board-overload-800");
    await win.setContentSize(1920, 1080);
    await wait(400);
    results.push({
      check: "overload: begin button and farm stay in viewport at 1920x1080",
      pass: await js(beginVisible),
    });
    await shot("board-overload-1080");

    results.push({ check: "no renderer console errors", pass: !errors.length });
    if (errors.length) console.error("console errors:", errors);
    const failed = results.filter((r) => !r.pass);
    console.log(JSON.stringify({ results, failed: failed.length }, null, 2));
    win.destroy();
    clearTimeout(deadline);
    app.exit(failed.length ? 1 : 0);
  })
  .catch((e) => {
    console.error(e.stack || e);
    clearTimeout(deadline);
    app.exit(1);
  });
