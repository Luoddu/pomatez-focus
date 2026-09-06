const { spawnSync } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/electron-builder/out/cli/cli.js"),
    "--win",
    "portable",
    "--x64",
    "--publish",
    "never",
    `--config.electronDist=${path.join(
      root,
      "node_modules/electron/dist"
    )}`,
  ],
  {
    cwd: path.join(root, "app/electron"),
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" },
  }
);
if (result.error) throw result.error;
process.exit(result.status === null ? 1 : result.status);
