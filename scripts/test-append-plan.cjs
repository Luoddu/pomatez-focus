const { spawnSync } = require("node:child_process"),
  path = require("node:path"),
  { randomUUID } = require("node:crypto");
const env = {
  ...process.env,
  POMATEZ_PROFILE: path.join(
    __dirname,
    "../artifacts/test-profiles",
    randomUUID()
  ),
};
delete env.ELECTRON_RUN_AS_NODE;
for (const phase of ["seed", "restart"]) {
  const r = spawnSync(
    require("electron"),
    [path.join(__dirname, "../tests/append-plan-desktop.cjs"), phase],
    { env, windowsHide: true, stdio: "inherit", timeout: 50000 }
  );
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}
