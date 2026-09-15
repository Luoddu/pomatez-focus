// Real main/preload/renderer with delayed synthetic Bitable v1 transport.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
const { Feishu } = require("../app/electron/build/focus/feishu.js");
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  __dirname,
  "../artifacts/test-profiles",
  randomUUID()
);
const labels = [
  "重要且紧急",
  "重要不紧急",
  "紧急不重要",
  "不紧急不重要",
];
const now = new Date();
const midnight = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate()
).getTime();
let release,
  offline = false;
const gate = new Promise((resolve) => {
  release = resolve;
});
const client = new Feishu(
  {
    appId: "synthetic",
    appSecret: "synthetic",
    appToken: "synthetic",
    planTable: "Plans",
    dateField: "Day",
    completedField: "Done",
    taskField: "Task",
  },
  async (method, route) => {
    if (route.startsWith("auth/"))
      return { tenant_access_token: "synthetic", expire: 7200 };
    assert.equal(method, "GET");
    const endpoint = route.split("?")[0];
    let items;
    if (endpoint.endsWith("/tables"))
      items = [{ name: "Plans", table_id: "plans" }];
    else if (endpoint.endsWith("/plans/fields"))
      items = [
        { field_name: "Day", type: 5 },
        { field_name: "Done", type: 7 },
        {
          field_name: "Task",
          type: 21,
          property: { table_id: "tasks" },
        },
      ];
    else if (endpoint.endsWith("/tasks/fields"))
      items = [
        {
          field_name: "Priority",
          type: 3,
          property: { options: labels.map((name) => ({ name })) },
        },
      ];
    else if (endpoint.endsWith("/plans/records"))
      items = labels.map((_, i) => ({
        record_id: `plan${i}`,
        fields: {
          Day: midnight,
          Task: [
            {
              record_ids: [`task${i}`],
              table_id: "tasks",
              text: "Fallback",
              type: "text",
            },
          ],
          番茄: "1",
        },
      }));
    else if (endpoint.endsWith("/tasks/records"))
      items = labels.map((label, i) => ({
        record_id: `task${i}`,
        fields: {
          任务名称: `Synthetic quadrant ${i}`,
          Priority: label,
        },
      }));
    else throw Error("Unexpected test route");
    return { data: { items, has_more: false } };
  }
);
FocusService.prototype.status = () => ({
  configured: true,
  quadrantField: client.quadrantFieldResolved,
});
FocusService.prototype.today = async () => {
  await gate;
  if (offline) throw Error("Synthetic offline");
  return client.today();
};
FocusService.prototype.sync = FocusService.prototype.setup = () => {
  throw Error("Writes forbidden in this test");
};
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = setTimeout(() => app.exit(2), 20000);
app.whenReady().then(async () => {
  try {
    let win;
    for (let i = 0; i < 100; i++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await wait(50);
    }
    assert.ok(win);
    assert.equal(win.isVisible(), false);
    const js = (code) => win.webContents.executeJavaScript(code, true);
    const counts = () =>
      js(
        `({classified:['iu','inu','uni','unu'].map(k=>document.querySelector('[data-quadrant="'+k+'"]').querySelectorAll('.chip').length),unknown:document.querySelectorAll('[data-quadrant="uncat"] .chip').length})`
      );
    await wait(100);
    assert.equal(
      await js("document.querySelectorAll('.chip').length"),
      0
    );
    assert.ok(
      await js("document.querySelector('[aria-label=\"刷新今日番茄\"]').disabled")
    );
    release();
    const expected = { classified: [1, 1, 1, 1], unknown: 0 };
    for (let i = 0; i < 100; i++) {
      if ((await counts()).classified.every((n) => n === 1)) break;
      await wait(50);
    }
    assert.deepEqual(await counts(), expected);
    await js(
      `document.querySelector('[aria-label="刷新今日番茄"]').click()`
    );
    await wait(200);
    assert.deepEqual(await counts(), expected);
    offline = true;
    await js(
      `document.querySelector('[aria-label="刷新今日番茄"]').click()`
    );
    await wait(200);
    assert.deepEqual(await counts(), expected);
    assert.ok(
      await js(
        "document.body.textContent.includes('Synthetic offline')"
      )
    );
    assert.equal(win.isVisible(), false);
    console.log(
      JSON.stringify({
        passed: 3,
        checks: [
          "delayed startup disables refresh and never shows demo plans",
          "rich links classify after load and refresh through real IPC",
          "failed refresh preserves classified plans and shows error",
        ],
      })
    );
    clearTimeout(deadline);
    app.exit(0);
  } catch (e) {
    console.error(e);
    clearTimeout(deadline);
    app.exit(1);
  }
});
