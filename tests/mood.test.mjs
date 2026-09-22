import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// cloud.ts / session.ts 按打包器惯例省略扩展名，node 需要补扩展名解析。
register(new URL("./ts-extension-hook.mjs", import.meta.url));

const { confirmSession, isSpikyMood, moodLabel, MOOD_OPTIONS } = await import(
  "../app/renderer/src/focus/session.ts"
);
const { mergeCloudRecords } = await import(
  "../app/renderer/src/focus/cloud.ts"
);

const review = (extra = {}) => ({
  id: "s1",
  task: { id: "t", title: "写报告 · 第 1 个番茄", source: "local" },
  startedAt: Date.now() - 1500000,
  plannedSeconds: 1500,
  elapsedSeconds: 1500,
  status: "review",
  sync: "local",
  ...extra,
});

test("confirmSession：选了感受才写入 mood，不选则字段缺省", () => {
  const withMood = confirmSession(review(), 1500, 1, -2);
  assert.equal(withMood.mood, -2);
  assert.equal(withMood.status, "saved");
  const without = confirmSession(review(), 1500, 1);
  assert.equal("mood" in without, false); // 跳过 = 不落字段
  assert.equal(without.status, "saved");
});

test("confirmSession：越界/非整数感受被拒绝，正常保存不受影响", () => {
  assert.throws(() => confirmSession(review(), 1500, 1, -3), /感受评级/);
  assert.throws(() => confirmSession(review(), 1500, 1, 3), /感受评级/);
  assert.throws(() => confirmSession(review(), 1500, 1, 0.5), /感受评级/);
  // 正反成对：合法档位与省略仍然保存成功
  assert.equal(confirmSession(review(), 1500, 1, 2).mood, 2);
  assert.equal(confirmSession(review(), 1500, 1).completedCount, 1);
});

test("isSpikyMood：难受/很痛苦档带刺，平静及以上不带，未评不带", () => {
  assert.equal(isSpikyMood(-2), true);
  assert.equal(isSpikyMood(-1), true);
  assert.equal(isSpikyMood(0), false);
  assert.equal(isSpikyMood(1), false);
  assert.equal(isSpikyMood(2), false);
  assert.equal(isSpikyMood(undefined), false);
});

test("moodLabel / MOOD_OPTIONS：5 档从很痛苦到很愉快", () => {
  assert.equal(MOOD_OPTIONS.length, 5);
  assert.deepEqual(
    MOOD_OPTIONS.map((o) => o.label),
    ["很痛苦", "难受", "平静", "愉快", "很愉快"]
  );
  assert.equal(moodLabel(-2), "很痛苦");
  assert.equal(moodLabel(undefined), undefined);
});

test("mergeCloudRecords：远端高版本覆盖时保留本地已填的 mood", () => {
  const local = {
    ...review({ status: "saved", sync: "synced" }),
    mood: -1,
    acceptedSeconds: 1500,
    completedCount: 1,
    cloudSynced: true,
    revision: 1,
    task: {
      id: "t",
      title: "写报告 · 第 1 个番茄",
      source: "feishu",
      sourceKey: "synthetic",
    },
  };
  const incoming = {
    ...local,
    mood: undefined,
    revision: 2,
    task: {
      id: "t2",
      planId: "p2",
      title: "写报告 · 第 2 个番茄",
      source: "feishu",
      sourceKey: "synthetic",
    },
    previousTasks: [local.task],
  };
  delete incoming.mood;
  const merged = mergeCloudRecords([local], [incoming], "synthetic");
  assert.equal(merged.length, 1);
  assert.equal(merged[0].revision, 2);
  assert.equal(merged[0].mood, -1); // 本地感受不丢
  // 远端同版本或记录本身无 mood 时行为不变
  const clean = mergeCloudRecords(
    [],
    [{ ...incoming, id: "s2" }],
    "synthetic"
  );
  assert.equal("mood" in clean[0], false);
});
