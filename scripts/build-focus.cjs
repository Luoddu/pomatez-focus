// Uses the upstream pinned Rollup, TypeScript, CRA and esbuild toolchain.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function run(script, args, cwd = root, env = {}) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, script), ...args],
    {
      cwd,
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        INLINE_RUNTIME_CHUNK: "false",
        GENERATE_SOURCEMAP: "false",
        ...env,
      },
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(
  "node_modules/rollup/dist/bin/rollup",
  ["-c"],
  path.join(root, "app/shareables")
);
run("node_modules/typescript/bin/tsc", [
  "--project",
  "app/electron/tsconfig.json",
]);
run("node_modules/esbuild/bin/esbuild", [
  "app/electron/src/preload.ts",
  "--bundle",
  "--platform=node",
  "--external:electron",
  "--outfile=app/electron/build/preload.js",
]);
run(
  "node_modules/react-scripts/scripts/build.js",
  [],
  path.join(root, "app/renderer")
);
fs.cpSync(
  path.join(root, "app/renderer/build"),
  path.join(root, "app/electron/build"),
  { recursive: true }
);
fs.cpSync(
  path.join(root, "app/electron/src/assets"),
  path.join(root, "app/electron/build/assets"),
  { recursive: true }
);
console.log("Pomatez Focus desktop build complete.");
fs.copyFileSync(
  path.join(root, "LICENSE"),
  path.join(root, "app/electron/build/LICENSE.pomatez.txt")
);
