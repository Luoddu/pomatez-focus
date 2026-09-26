// Portrait display layout test: real Electron main/preload/production
// renderer, always hidden. Resizes the real window across the orientation
// boundary and asserts the CSS media-query layout switches both ways.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
if (
  process.env.POMATEZ_HEADLESS !== "1" ||
  !process.env.POMATEZ_PROFILE
)
  throw Error("Hidden isolated profile required");
const root = path.resolve(__dirname, ".."),
  artifacts = path.join(root, "artifacts");
fs.mkdirSync(artifacts, { recursive: true });
const downloads = path.join(artifacts, "test-downloads", randomUUID());
fs.mkdirSync(downloads, { recursive: true });
app.setPath("downloads", downloads);
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const errors = [];
const check = (name, fn) => {
  fn();
  checks.push(name);
};
const deadline = setTimeout(() => {
  console.error("Portrait desktop test timed out");
  app.exit(2);
}, 45000);
const dayMs = 24 * 60 * 60 * 1000;
const seedRecord = (daysAgo, hour, title, quadrant, projectType) => ({
  id: randomUUID(),
  task: {
    id: `synthetic-${title}`,
    title,
    source: "local",
    quadrant,
    projectType,
  },
  startedAt: Date.now() - daysAgo * dayMs - hour * 3600000,
  endedAt: Date.now() - daysAgo * dayMs - hour * 3600000 + 1500000,
  plannedSeconds: 1500,
  elapsedSeconds: 1500,
  acceptedSeconds: 1500,
  completedCount: 1,
  status: "saved",
  sync: "local",
});
const seedRecords = [
  seedRecord(5, 4, "模拟任务甲", "iu", "delivery"),
  seedRecord(1, 5, "规划下一周任务", "uni"),
  seedRecord(1, 3, "整理待办事项", "unu"),
  seedRecord(3, 6, "阅读学习资料", "uni"),
];
app
  .whenReady()
  .then(async () => {
    let win;
    for (let n = 0; n < 100; n++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await wait(100);
    }
    assert.ok(win);
    win.on("show", () => errors.push("Unexpected visible window"));
    win.webContents.on("console-message", (_event, level, message) => {
      if (level >= 3) errors.push(message);
    });
    const js = (code) => win.webContents.executeJavaScript(code, true);
    // Seed saved records across three days before React mounts, so the
    // stats/heatmap/records panels render real content (same technique as
    // tests/desktop.cjs).
    win.webContents.debugger.attach("1.3");
    await win.webContents.debugger.sendCommand("Page.enable");
    const script = await win.webContents.debugger.sendCommand(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source: `localStorage.setItem('pomatez-focus-v1',${JSON.stringify(
          JSON.stringify({ active: null, records: seedRecords })
        )})`,
      }
    );
    const reloaded = new Promise((r) =>
      win.webContents.once("did-finish-load", r)
    );
    win.webContents.reload();
    await reloaded;
    await wait(500);
    await win.webContents.debugger.sendCommand(
      "Page.removeScriptToEvaluateOnNewDocument",
      { identifier: script.identifier }
    );
    win.webContents.debugger.detach();
    // Programmatic resize may exceed the host work area; content size is what
    // media queries see, so drive the viewport directly.
    win.setContentSize(1080, 1840);
    await wait(250);
    assert.equal(
      await js(
        "document.querySelectorAll('.record-day.is-folded .record').length"
      ),
      0
    );
    await js(
      "document.querySelectorAll('.day-glass').forEach(b=>b.click())"
    );
    await wait(100);
    const portrait = await js(`(()=>{
      const cs=getComputedStyle(document.querySelector('.content'));
      const grid=getComputedStyle(document.querySelector('.stat-grid'));
      const farm=document.querySelector('.farm-field').getBoundingClientRect();
      const bar=getComputedStyle(document.querySelector('.action-bar'));
      const stats=[...document.querySelectorAll('.stat')];
      const statHeights=stats.map(s=>Math.round(s.getBoundingClientRect().height));
      const statAlign=getComputedStyle(stats[0]).textAlign;
      const fonts=stats.map(s=>getComputedStyle(s.querySelector('strong')).fontSize);
      const cell=document.querySelector('.hm-cell').getBoundingClientRect();
      const hm=document.querySelector('.hm-grid').getBoundingClientRect();
      const sc=document.querySelector('.hm-scroll').getBoundingClientRect();
      const recs=getComputedStyle(document.querySelector('.records'));
      const recEl=document.querySelector('.records');
      const rc=document.querySelector('.right-col');
      const sections=[...rc.querySelectorAll(':scope > .side-section')];
      const r=sections.map(s=>s.getBoundingClientRect());
      const rcRect=rc.getBoundingClientRect();
      const days=[...document.querySelectorAll('.record-day')];
      const lastH4=days[days.length-1].querySelector('h4').textContent;
      const previousH4=days[days.length-2].querySelector('h4').textContent;
      const invite=days[days.length-1].querySelector('.record-invite');
      const categoryRecord=document.querySelector('.record .r-icon[title^="所属项目：项目交付"]');
      const pileFruit=document.querySelector('.farm-pile ellipse[fill="url(#farm-tomato-delivery)"]');
      const quadrantChip=document.querySelector('.quad-iu .chip:not(.selected)');
      return {direction:cs.flexDirection,
        columns:grid.gridTemplateColumns.split(' ').length,
        farmHeight:farm.height,barPosition:bar.position,
        statHeights,statAlign,fonts:[...new Set(fonts)],
        cellSize:Math.round(cell.width),
        hmFill:hm.width/sc.width,
        recordColumns:Math.round((recEl.clientWidth-24+14)/(days[0].getBoundingClientRect().width+14)),
        recordDays:days.length,
        recordScrollable:recEl.scrollWidth>recEl.clientWidth,
        recordAtRight:Math.abs(recEl.scrollLeft-(recEl.scrollWidth-recEl.clientWidth))<=16,
        recordScrollLeft:recEl.scrollLeft,recordScrollMax:recEl.scrollWidth-recEl.clientWidth,
        lastIsToday:days[days.length-1].classList.contains('is-today'),
        rightDisplay:getComputedStyle(rc).display,
        sideBySide:Math.abs(r[0].top-r[1].top)<=2&&r[1].left>r[0].left+50,
        recordsFullWidth:Math.abs(r[2].width-rcRect.width)<=2&&r[2].top>r[0].top+50,
        taskFont:getComputedStyle(document.querySelector('.task:not(.complete) .task-name')).fontSize,
        doneFont:(document.querySelector('.task.complete .task-name')?getComputedStyle(document.querySelector('.task.complete .task-name')).fontSize:null),
        chipHeight:Math.round(document.querySelector('.chip').getBoundingClientRect().height),
        categoryRecordTone:categoryRecord?.querySelector('stop')?.getAttribute('stop-color')||null,
        pileShowsDelivery:!!pileFruit,
        quadrantChipTone:quadrantChip?getComputedStyle(quadrantChip).backgroundColor:null,
        lastH4,previousH4,inviteText:invite?invite.textContent:null,
        todayEmpty:days[days.length-1].querySelectorAll('.record').length===0};
    })()`);
    check(
      "portrait stacks panels in one column with paired overview and heatmap",
      () => {
        assert.equal(portrait.direction, "column");
        assert.equal(portrait.columns, 2);
        assert.equal(portrait.rightDisplay, "grid");
        assert.equal(
          portrait.sideBySide,
          true,
          JSON.stringify(portrait)
        );
        assert.equal(
          portrait.recordsFullWidth,
          true,
          JSON.stringify(portrait)
        );
      }
    );
    check("portrait quadrants scale up for readability", () => {
      assert.equal(portrait.taskFont, "20px");
      assert.equal(portrait.doneFont, "19px");
      assert.ok(portrait.chipHeight >= 40, JSON.stringify(portrait));
    });
    check(
      "quadrant chips keep quadrant colors while harvests use project colors",
      () => {
        assert.equal(portrait.quadrantChipTone, "rgb(253, 236, 234)");
        assert.equal(portrait.categoryRecordTone, "#f2cd73");
        assert.equal(portrait.pileShowsDelivery, true);
      }
    );
    check(
      "portrait keeps the farm visible and the action bar sticky",
      () => {
        assert.ok(portrait.farmHeight >= 200, JSON.stringify(portrait));
        assert.equal(portrait.barPosition, "sticky");
      }
    );
    check(
      "portrait stats are equal-height centered cards with one font tier",
      () => {
        assert.equal(
          new Set(portrait.statHeights).size,
          1,
          JSON.stringify(portrait)
        );
        assert.equal(portrait.statAlign, "center");
        assert.equal(
          portrait.fonts.length,
          1,
          JSON.stringify(portrait.fonts)
        );
      }
    );
    check("portrait heatmap cells fill the available panel", () => {
      assert.ok(portrait.cellSize >= 20, JSON.stringify(portrait));
      assert.ok(portrait.hmFill >= 0.8, JSON.stringify(portrait));
    });
    check("portrait records flow into three day-card columns", () => {
      assert.equal(portrait.recordColumns, 3);
      assert.ok(portrait.recordDays >= 4, JSON.stringify(portrait));
      assert.equal(
        portrait.recordScrollable,
        true,
        JSON.stringify(portrait)
      );
      assert.equal(
        portrait.recordAtRight,
        true,
        JSON.stringify(portrait)
      );
      assert.equal(
        portrait.lastIsToday,
        true,
        JSON.stringify(portrait)
      );
    });
    check("today card is at the right with a seeded invite", () => {
      assert.ok(
        portrait.lastH4.startsWith("今天 · 周"),
        portrait.lastH4
      );
      assert.equal(portrait.todayEmpty, true);
      assert.ok(
        portrait.inviteText && portrait.inviteText.length >= 8,
        JSON.stringify(portrait)
      );
      assert.ok(
        /^昨天 · 周[日一二三四五六]/.test(portrait.previousH4),
        portrait.previousH4
      );
      assert.ok(
        portrait.previousH4.includes("共 2 个番茄"),
        portrait.previousH4
      );
    });
    fs.writeFileSync(
      path.join(artifacts, "portrait-preview.png"),
      (await win.capturePage()).toPNG()
    );
    await js(
      `document.querySelector('button[aria-label="专注统计"]').click()`
    );
    await wait(500);
    const statsPortrait = await js(`(()=>{
      const page=document.querySelector('.stats-page');
      const hero=document.querySelector('.stats-trend').getBoundingClientRect();
      const rows=[...document.querySelectorAll('.stats-summary .st-row')];
      const a=rows[0].getBoundingClientRect(),b=rows[1].getBoundingClientRect();
      return {insufficient:Boolean(document.querySelector('.stats-trend-insufficient')),
        heroFits:hero.left>=0&&hero.right<=innerWidth,
        summaryTwoColumns:Math.abs(a.top-b.top)<2&&b.left>a.left+20,
        horizontalOverflow:page.scrollWidth>page.clientWidth+2};
    })()`);
    check(
      "portrait stats show an honest short-history state and compact summary without horizontal overflow",
      () => {
        assert.equal(
          statsPortrait.insufficient,
          true,
          JSON.stringify(statsPortrait)
        );
        assert.equal(
          statsPortrait.heroFits,
          true,
          JSON.stringify(statsPortrait)
        );
        assert.equal(
          statsPortrait.summaryTwoColumns,
          true,
          JSON.stringify(statsPortrait)
        );
        assert.equal(
          statsPortrait.horizontalOverflow,
          false,
          JSON.stringify(statsPortrait)
        );
      }
    );
    win.webContents.invalidate();
    await wait(200);
    fs.writeFileSync(
      path.join(artifacts, "portrait-stats-preview.png"),
      (await win.capturePage()).toPNG()
    );
    await js(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='返回').click()`
    );
    await wait(100);
    win.setContentSize(1600, 900);
    await wait(250);
    const landscape = await js(`(()=>{
      const cs=getComputedStyle(document.querySelector('.content'));
      const grid=getComputedStyle(document.querySelector('.stat-grid'));
      const a=document.querySelector('.left-col').getBoundingClientRect();
      const b=document.querySelector('.right-col').getBoundingClientRect();
      const cell=document.querySelector('.hm-cell').getBoundingClientRect();
      const recs=getComputedStyle(document.querySelector('.records'));
      const stats=[...document.querySelectorAll('.stat strong')];
      const rc=getComputedStyle(document.querySelector('.right-col'));
      const sections=[...document.querySelectorAll('.right-col > .side-section')].map(s=>s.getBoundingClientRect());
      const days=[...document.querySelectorAll('.record-day')];
      return {direction:cs.flexDirection,
        columns:grid.gridTemplateColumns.split(' ').length,
        sideBySide:a.right<=b.left,rightWidth:b.width,
        cellSize:Math.round(cell.width),recordsDisplay:recs.display,
        fonts:[...new Set(stats.map(s=>getComputedStyle(s).fontSize))],
        statAlign:getComputedStyle(document.querySelector('.stat')).textAlign,
        rightDisplay:rc.display,
        stacked:sections[1].top>=sections[0].bottom-2,
        taskFont:getComputedStyle(document.querySelector('.task:not(.complete) .task-name')).fontSize,
        doneFont:(document.querySelector('.task.complete .task-name')?getComputedStyle(document.querySelector('.task.complete .task-name')).fontSize:null),
        chipHeight:Math.round(document.querySelector('.chip').getBoundingClientRect().height),
        lastH4:days[days.length-1].querySelector('h4').textContent,
        previousH4:days[days.length-2].querySelector('h4').textContent,
        todayInvite:Boolean(days[days.length-1].querySelector('.record-invite'))};
    })()`);
    check("landscape keeps the original side-by-side layout", () => {
      assert.equal(landscape.direction, "row");
      assert.equal(landscape.columns, 2);
      assert.equal(landscape.sideBySide, true);
      assert.ok(
        Math.abs(landscape.rightWidth - 380) <= 2,
        JSON.stringify(landscape)
      );
    });
    check(
      "landscape keeps original heatmap cells, records list and stat style",
      () => {
        assert.equal(landscape.cellSize, 13);
        assert.equal(landscape.recordsDisplay, "block");
        assert.ok(
          ["left", "start"].includes(landscape.statAlign),
          landscape.statAlign
        );
        assert.deepEqual(
          landscape.fonts.sort(),
          ["22px", "28px"],
          JSON.stringify(landscape.fonts)
        );
      }
    );
    check(
      "landscape keeps stacked right column and original quadrant scale",
      () => {
        assert.equal(landscape.rightDisplay, "flex");
        assert.equal(
          landscape.stacked,
          true,
          JSON.stringify(landscape)
        );
        assert.equal(landscape.taskFont, "16px");
        assert.equal(landscape.doneFont, "15px");
        assert.equal(landscape.chipHeight, 34);
      }
    );
    check(
      "landscape also shows today invite, weekday and day totals",
      () => {
        assert.ok(
          landscape.lastH4.startsWith("今天 · 周"),
          landscape.lastH4
        );
        assert.equal(landscape.todayInvite, true);
        assert.ok(
          landscape.previousH4.includes("共 2 个番茄"),
          landscape.previousH4
        );
      }
    );
    fs.writeFileSync(
      path.join(artifacts, "landscape-preview.png"),
      (await win.capturePage()).toPNG()
    );
    check("no visible test window or renderer errors", () => {
      assert.equal(win.isVisible(), false);
      assert.deepEqual(errors, []);
    });
    fs.writeFileSync(
      path.join(artifacts, "portrait-test.json"),
      JSON.stringify({ passed: checks.length, checks }, null, 2)
    );
    console.log(JSON.stringify({ passed: checks.length, checks }));
    clearTimeout(deadline);
    app.quit();
  })
  .catch((e) => {
    console.error(e.stack);
    clearTimeout(deadline);
    app.exit(1);
  });
