const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs"),
  path = require("node:path");
// Transpile the production helper with existing TS, reusing the production stats
// module under Node's TS support. Avoid a mirrored count implementation.
const source = path.resolve(
  __dirname,
  "../app/renderer/src/focus/restProgress.ts"
);
const code = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exportsForTest = {};
new Function("require", "exports", code)(
  (name) => require(path.resolve(path.dirname(source), name + ".ts")),
  exportsForTest
);
const { dailyRestProgress } = exportsForTest;
const at = (d, h = 12) => new Date(2026, 9, d, h).getTime();
const rec = (d, completedCount, status = "saved", extra = {}) => ({
  startedAt: at(d),
  completedCount,
  acceptedSeconds: 1500,
  status,
  ...extra,
});
test("daily confirmed records share the calendar convention; edits/merged history update count", () => {
  const records = [
    rec(7, 5),
    rec(7, 6, "saved", { sync: "pending" }),
    rec(6, 20),
    rec(7, 50, "active"),
    rec(7, 50, "review"),
    rec(7, 50, "paused"),
    rec(8, 20),
  ];
  assert.deepEqual(dailyRestProgress(records, at(7)), {
    day: "2026-10-07",
    completedCount: 11,
  });
  const changed = records.map((r, i) =>
    i === 1 ? { ...r, completedCount: 7 } : r
  );
  assert.equal(dailyRestProgress(changed, at(7)).completedCount, 12);
  assert.equal(
    dailyRestProgress(
      [...changed, rec(7, 1, "saved", { cloudSynced: true })],
      at(7)
    ).completedCount,
    13
  );
  assert.equal(dailyRestProgress([], at(7)).completedCount, 0);
});
test("local midnight resets count and uses start day for sessions crossing midnight", () => {
  const cross = rec(7, 12, "saved", {
    startedAt: at(7, 23),
    endedAt: at(8, 1),
  });
  assert.equal(
    dailyRestProgress([cross], at(7, 23)).completedCount,
    12
  );
  assert.deepEqual(dailyRestProgress([cross], at(8, 0)), {
    day: "2026-10-08",
    completedCount: 0,
  });
});
