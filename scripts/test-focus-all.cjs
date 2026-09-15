const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
// Adapter tests load emitted JS; compile it even in a fresh checkout.
const compile = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "--project", "app/electron/tsconfig.json"], { cwd: root, stdio: "inherit", windowsHide: true });
if (compile.error) throw compile.error;
if (compile.status !== 0) process.exit(compile.status ?? 1);
const files = fs.readdirSync(path.join(root, "tests")).filter((name) => /\.test\.(cjs|mjs)$/.test(name));
const result = spawnSync(process.execPath, ["--test", ...files.map((name) => `tests/${name}`)], { cwd: root, stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
