// Version preparation is separate from building/packaging. Verify live ancestry
// first, then reserve above published tags and other local branch/artifact numbers.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const { assertReady } = require("./repo-sync.cjs");
const FLOOR = 0;
const LAUNCH_DIR = process.env.POMATEZ_LAUNCH_DIR;
const PREVIEW_RE = /preview[.\-_]?(\d+)/i;

function previewOf(text) {
  const m = PREVIEW_RE.exec(String(text));
  return m ? Number(m[1]) : null;
}

function scanExes(dir, found) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const n = previewOf(name);
    if (n != null)
      found.push({ n, where: path.join(dir, name) });
  }
}

function collect(root) {
  const found = [];
  const consider = (text, where) => {
    const n = previewOf(text);
    if (n != null) found.push({ n, where });
  };
  const git = (args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true, timeout: 30000 });
  // 当前分支 tip 的 package.json 就是"当前版本"本身，不算历史来源
  let headRef = "";
  try {
    headRef = git(["symbolic-ref", "-q", "HEAD"]).trim();
  } catch {
    /* detached HEAD */
  }
  const refs = git(["for-each-ref", "--format=%(refname)", "refs/heads/"])
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((ref) => ref !== headRef);
  for (const ref of refs) {
    try {
      const pkg = JSON.parse(
        git(["show", `${ref}:app/electron/package.json`])
      );
      consider(pkg.version, `branch ${ref}`);
    } catch {
      /* 该分支没有此文件 */
    }
  }
  const worktrees = git(["worktree", "list", "--porcelain"])
    .split(/\r?\n/)
    .filter((l) => l.startsWith("worktree "))
    .map((l) => l.slice(9));
  for (const dir of worktrees)
    scanExes(path.join(dir, "app", "electron", "dist"), found);
  if (LAUNCH_DIR) {
    scanExes(LAUNCH_DIR, found);
    scanExes(path.join(LAUNCH_DIR, "rollback"), found);
  }
  return found;
}

// 当前 package.json 的版本号不算"已用掉"的来源：它大于其余来源时视为
// 尚未打包的新号，直接沿用；只有与历史撞号（≤ 历史最大）才 +1 跳过。
// 本分支 tip 不算历史来源；其他分支和所有产物即使同号也必须保留，
// 不能因为恰好与当前号码相同就漏掉冲突。
function pickNext(current, otherMax) {
  return current != null && current > otherMax ? current : otherMax + 1;
}

function worktreeVersion(root) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.join(root, "app", "electron", "package.json"),
        "utf8"
      )
    );
    return previewOf(pkg.version);
  } catch {
    return null;
  }
}

function nextVersion(root) {
  const remote = assertReady(root);
  const current = worktreeVersion(root);
  const sources = collect(root);
  sources.push({ n: remote.maxPreview, where: "live origin preview tags" });
  const max = Math.max(FLOOR, ...sources.map((s) => s.n));
  return {
    next: pickNext(current, max),
    current,
    max,
    floor: FLOOR,
    sources,
  };
}

// 幂等 bump 三处版本展示位；已是目标号的文件跳过。返回实际改动的路径。
function bumpVersion(root, next) {
  const targets = [
    path.join(root, "app", "electron", "package.json"),
    path.join(
      root,
      "app",
      "renderer",
      "src",
      "focus",
      "components",
      "SettingsPanel.tsx"
    ),
    path.join(root, "design", "farm-ui.html"),
  ];
  const changed = [];
  for (const file of targets) {
    if (!fs.existsSync(file) && file.endsWith("farm-ui.html")) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = before.replace(
      /0\.1\.0-preview\.\d+/g,
      `0.1.0-preview.${next}`
    );
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed.push(file);
    }
  }
  return changed;
}

// 打包前拒绝覆盖：dist 中已存在同号产物则失败
function assertNoExistingArtifact(root, next) {
  const dist = path.join(root, "app", "electron", "dist");
  const clash = [];
  try {
    for (const name of fs.readdirSync(dist))
      if (previewOf(name) === next) clash.push(name);
  } catch {
    return;
  }
  if (clash.length)
    throw new Error(
      `dist 已存在 preview.${next} 产物（${clash.join(
        ", "
      )}），拒绝覆盖；请先移走或核对版本`
    );
}

if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const plan = nextVersion(root);
  if (process.argv.includes("--bump")) {
    assertNoExistingArtifact(root, plan.next);
    const changed = bumpVersion(root, plan.next);
    console.log(
      JSON.stringify({ ...plan, bumped: changed.map((f) => path.relative(root, f)) }, null, 2)
    );
  } else {
    console.log(JSON.stringify(plan, null, 2));
  }
}

module.exports = {
  FLOOR,
  previewOf,
  pickNext,
  nextVersion,
  bumpVersion,
  assertNoExistingArtifact,
};
