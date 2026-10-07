const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { spawn } = require("node:child_process");
const {
  ActivityWatchRuntime,
} = require("../app/electron/build/focus/activitywatchRuntime");
const {
  localRequest,
} = require("../app/electron/build/focus/activitywatch");
const defaults = {
  platform: "win32",
  candidates: ["fixed-aw-qt.exe"],
  exists: () => true,
  running: async () => false,
  wait: async () => {},
};
test("available service avoids any launcher or process query", async () => {
  let launches = 0,
    queries = 0;
  const r = new ActivityWatchRuntime({
    ...defaults,
    probe: async () => ({ version: "v0.13.2", hostname: "TEST" }),
    running: async () => {
      queries++;
      return false;
    },
    launch: async () => {
      launches++;
    },
  });
  await r.ensure();
  assert.equal(launches, 0);
  assert.equal(queries, 0);
});
test("suspend/quit during a probe prevents a later startup", async () => {
  let allow = true,
    launches = 0,
    resolve;
  const probe = new Promise((r) => {
    resolve = r;
  });
  const runtime = new ActivityWatchRuntime({
    ...defaults,
    allowed: () => allow,
    probe: () => probe,
    launch: async () => {
      launches++;
    },
  });
  const pending = runtime.ensure();
  allow = false;
  resolve(null);
  await assert.rejects(pending, /已暂停/);
  assert.equal(launches, 0);
});
test("concurrent cold ensure starts installed manager once and waits for info", async () => {
  let launched = false,
    launches = 0;
  const r = new ActivityWatchRuntime({
    ...defaults,
    probe: async () => {
      if (!launched) throw Error("offline");
      return { version: "test", hostname: "TEST" };
    },
    launch: async (file) => {
      assert.equal(file, "fixed-aw-qt.exe");
      launches++;
      launched = true;
    },
  });
  await Promise.all([r.ensure(), r.ensure(), r.ensure()]);
  assert.equal(launches, 1);
  await r.ensure();
  assert.equal(launches, 1);
});
test("existing launcher and missing install fail without duplicate launch, later healthy refresh works", async () => {
  let up = false,
    launches = 0;
  for (const o of [
    { running: async () => true },
    { exists: () => false },
  ]) {
    const r = new ActivityWatchRuntime({
      ...defaults,
      ...o,
      probe: async () => {
        if (!up) throw Error("offline");
        return { version: "test", hostname: "TEST" };
      },
      launch: async () => {
        launches++;
      },
    });
    await assert.rejects(r.ensure(), /已在运行|未找到/);
    up = true;
    await r.ensure();
    up = false;
  }
  assert.equal(launches, 0);
});
test("failed spawn or delayed readiness is bounded and does not respawn in one ensure", async () => {
  let launches = 0,
    probes = 0;
  const r = new ActivityWatchRuntime({
    ...defaults,
    probe: async () => {
      probes++;
      throw Error("offline");
    },
    launch: async () => {
      launches++;
    },
  });
  await assert.rejects(r.ensure(), /尚未就绪/);
  assert.equal(launches, 1);
  assert.equal(probes, 13);
  const failed = new ActivityWatchRuntime({
    ...defaults,
    probe: async () => {
      throw Error("offline");
    },
    launch: async () => {
      throw Error("spawn failed");
    },
  });
  await assert.rejects(failed.ensure(), /spawn failed/);
  const other = new ActivityWatchRuntime({
    ...defaults,
    platform: "darwin",
    probe: async () => {
      throw Error("offline");
    },
  });
  await assert.rejects(other.ensure(), /启动本机/);
});
test("real synthetic manager → server child → loopback info chain, concurrent startup and warm reuse", async () => {
  const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "pomo-aw-runtime-")
    ),
    portFile = path.join(dir, "port"),
    stopFile = path.join(dir, "stop");
  let child,
    launches = 0;
  const r = new ActivityWatchRuntime({
    ...defaults,
    wait: () => new Promise((resolve) => setTimeout(resolve, 100)),
    probe: async () => {
      if (!fs.existsSync(portFile)) throw Error("not yet");
      return localRequest(
        "/info",
        undefined,
        Number(fs.readFileSync(portFile, "utf8")),
        300
      );
    },
    launch: async () => {
      launches++;
      child = spawn(
        process.execPath,
        [
          path.join(__dirname, "fixtures/aw-runtime-launcher.cjs"),
          portFile,
          stopFile,
        ],
        { stdio: "ignore", windowsHide: true }
      );
      await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
    },
  });
  try {
    await Promise.all([r.ensure(), r.ensure()]);
    assert.equal(launches, 1);
    assert.ok(child.pid);
    await r.ensure();
    assert.equal(launches, 1);
  } finally {
    fs.writeFileSync(stopFile, "stop");
    if (child && child.exitCode === null)
      await new Promise((resolve) => child.once("exit", resolve));
  }
  assert.equal(child.exitCode, 0);
});
