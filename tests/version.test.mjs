import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const {
  FLOOR,
  previewOf,
  pickNext,
  bumpVersion,
  assertNoExistingArtifact,
} = createRequire(import.meta.url)("../scripts/next-version.cjs");

test("previewOf parses dotted, dashed, bare and CJK-prefixed names", () => {
  assert.equal(previewOf("0.1.0-preview.22"), 22);
  assert.equal(previewOf("Pomatez-Focus-v0.1.0-preview.20-win-x64-setup.exe"), 20);
  assert.equal(previewOf("番茄农场-preview.19.exe"), 19);
  assert.equal(previewOf("番茄农场-preview19.lnk"), 19);
  assert.equal(previewOf("作战农场-next12.exe"), null);
  assert.equal(previewOf("番茄农场.exe"), null);
});

test("bumpVersion rewrites all three version spots idempotently", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nextver-"));
  const files = {
    "app/electron/package.json": '{ "version": "0.1.0-preview.22" }',
    "app/renderer/src/focus/components/SettingsPanel.tsx":
      '版本 <span className="ver">0.1.0-preview.22</span>',
    "design/farm-ui.html": '版本 <span class="ver">0.1.0-preview.18</span>',
  };
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  const changed = bumpVersion(dir, 25);
  assert.equal(changed.length, 3);
  for (const rel of Object.keys(files))
    assert.match(
      fs.readFileSync(path.join(dir, rel), "utf8"),
      /0\.1\.0-preview\.25/
    );
  assert.match(
    fs.readFileSync(path.join(dir, "app/electron/package.json"), "utf8"),
    /"version": "0\.1\.0-preview\.25"/
  );
  assert.deepEqual(bumpVersion(dir, 25), []);
});

test("assertNoExistingArtifact refuses a same-version file but passes when absent", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nextver-"));
  const dist = path.join(dir, "app", "electron", "dist");
  fs.mkdirSync(dist, { recursive: true });
  assertNoExistingArtifact(dir, 25);
  fs.writeFileSync(
    path.join(dist, "Pomatez-Focus-v0.1.0-preview.25-win-x64-portable.exe"),
    "x"
  );
  assert.throws(() => assertNoExistingArtifact(dir, 25), /拒绝覆盖/);
  assertNoExistingArtifact(dir, 26);
});

test("version floor does not pretend to prove remote source inclusion", () => {
  assert.equal(FLOOR, 0);
});

test("pickNext keeps a fresh manifest version and only skips collisions", () => {
  // 手动/上次 bump 到 25 但尚未打包：历史最大 24 → 沿用 25，不再 +1
  assert.equal(pickNext(25, 24), 25);
  // manifest 与历史撞号（历史已有 25 的分支或产物）→ 跳到 26
  assert.equal(pickNext(25, 25), 26);
  assert.equal(pickNext(22, 24), 25);
  assert.equal(pickNext(null, 24), 25);
});
