const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
if (
  process.env.POMATEZ_HEADLESS !== "1" ||
  !process.env.POMATEZ_PROFILE
)
  throw Error("Isolated hidden profile required");
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 15000);
app
  .whenReady()
  .then(async () => {
    let w;
    for (let i = 0; i < 100; i++) {
      w = BrowserWindow.getAllWindows()[0];
      if (
        w &&
        !w.webContents.isLoadingMainFrame() &&
        w.webContents.getURL().startsWith("file:")
      )
        break;
      await wait(50);
    }
    await wait(300);
    const js = (c) => w.webContents.executeJavaScript(c, true);
    if (process.env.POMATEZ_TEST_PHASE === "start") {
      await js(
        `[...document.querySelectorAll('button')].find(b=>b.textContent==='开始专注').click()`
      );
      await wait(1000);
    } else {
      const data = await js(
        `JSON.parse(localStorage.getItem('pomatez-focus-v1'))`
      );
      assert.equal(data.active.status, "paused");
      assert.ok(
        data.active.elapsedSeconds > 0.5 &&
          data.active.elapsedSeconds < 3
      );
      console.log(
        "Actual process restart: preserved focus and excluded offline gap"
      );
    }
    assert.equal(w.isVisible(), false);
    clearTimeout(timeout);
    app.quit();
  })
  .catch((e) => {
    console.error(e.stack);
    clearTimeout(timeout);
    app.exit(1);
  });
