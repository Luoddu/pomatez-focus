const { spawnSync } = require("node:child_process");
const path = require("node:path"),
  fs = require("node:fs"),
  os = require("node:os");
const root = path.resolve(__dirname, "..");
const env = {
  ...process.env,
  POMATEZ_HEADLESS: "1",
  POMATEZ_PROFILE: fs.mkdtempSync(
    path.join(os.tmpdir(), "pomo-aw-desktop-")
  ),
};
delete env.ELECTRON_RUN_AS_NODE;
const result = spawnSync(
  require("electron"),
  [path.join(root, "tests/activitywatch-desktop.cjs")],
  {
    cwd: root,
    env,
    windowsHide: true,
    stdio: "inherit",
    timeout: 120000,
  }
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
