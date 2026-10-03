import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  holidayDay,
  holidayMessage,
  routineSummary,
  companionGreeting,
  companionPromptSlot,
  timeZoneKind,
} from "../app/renderer/src/focus/wellbeing.js";
import {
  JOURNAL_KEY,
  loadJournal,
  saveJournal,
  mergeJournal,
} from "../app/renderer/src/focus/journal.js";
const at = (s) => Date.parse(s + "+08:00");
test("companion slots separate morning, 22 and 23; daytime and pre-8 never encourage work", () => {
  assert.equal(companionPromptSlot(at("2026-09-15T07:59:00")), null);
  assert.equal(
    companionPromptSlot(at("2026-09-15T08:00:00")),
    "morning"
  );
  assert.equal(
    companionPromptSlot(at("2026-09-15T09:29:59")),
    "morning"
  );
  assert.equal(companionPromptSlot(at("2026-09-15T09:30:00")), null);
  assert.equal(companionPromptSlot(at("2026-09-15T21:59:00")), null);
  assert.equal(companionPromptSlot(at("2026-09-15T22:00:00")), "22");
  assert.equal(companionPromptSlot(at("2026-09-15T23:00:00")), "23");
  assert.equal(companionPromptSlot(at("2026-09-15T23:59:00")), "23");
  assert.match(
    companionGreeting(at("2026-10-03T23:00:00"), 0).text,
    /23点|睡/
  );
  assert.match(
    companionGreeting(at("2026-10-03T23:30:00"), 0).text,
    /休息/
  );
  assert.match(
    companionGreeting(at("2026-10-03T09:00:00"), 0).text,
    /休息/
  );
  assert.doesNotMatch(
    companionGreeting(at("2026-10-03T09:00:00"), 0).text,
    /先种/
  );
});
const rec = (start, end, extra = {}) => ({
  status: "saved",
  startedAt: at(start),
  endedAt: at(end),
  elapsedSeconds: (at(end) - at(start)) / 1000,
  completedCount: 1,
  ...extra,
});
test("official holiday leave and make-up workdays are separate; unknown years are not inferred", () => {
  assert.equal(holidayDay("2026-10-03").rest, true);
  assert.equal(holidayDay("2026-10-10").rest, false);
  assert.equal(holidayDay("2026-09-25").name, "中秋节");
  assert.equal(holidayDay("2026-09-24"), null);
  assert.equal(holidayDay("2027-10-01"), null);
  assert.match(holidayMessage(holidayDay("2026-10-03"), 0), /安心休息/);
  assert.match(
    holidayMessage(holidayDay("2026-10-03"), 2),
    /记得给休息留位置/
  );
});
test("morning uses actual 08:00–09:30 segments; pauses, accepted cap, overnight and night are separated", () => {
  const r = rec("2026-09-15T07:30:00", "2026-09-15T10:00:00", {
    acceptedSeconds: 3600,
    segments: [
      {
        start: at("2026-09-15T07:30:00"),
        end: at("2026-09-15T08:30:00"),
      },
      {
        start: at("2026-09-15T09:30:00"),
        end: at("2026-09-15T10:00:00"),
      },
    ],
  });
  const result = routineSummary([r]);
  assert.equal(result.morningSeconds, 1200);
  assert.equal(result.morningDays, 1);
  assert.equal(result.restSeconds, 1200);
  const overnight = routineSummary([
    rec("2026-09-15T23:00:00", "2026-09-16T08:30:00"),
  ]);
  assert.equal(overnight.restSeconds, 8.5 * 3600);
  assert.equal(overnight.morningSeconds, 1800);
  assert.equal(
    routineSummary([{ ...r, status: "active" }]).morningSeconds,
    0
  );
});
test("rest takes priority over holiday or work encouragement; 09:30 is not early morning", () => {
  assert.equal(
    companionGreeting(at("2026-10-03T23:30:00"), 0).kind,
    "rest"
  );
  assert.equal(
    companionGreeting(at("2026-09-15T07:59:59"), 0).kind,
    "rest"
  );
  assert.equal(
    companionGreeting(at("2026-09-15T08:00:00"), 0).kind,
    "morning"
  );
  assert.equal(
    companionGreeting(at("2026-09-15T09:30:00"), 0).kind,
    "day"
  );
  assert.equal(timeZoneKind(15), "rest");
  assert.equal(timeZoneKind(16), "morning");
  assert.equal(timeZoneKind(18), "morning");
  assert.equal(timeZoneKind(19), "day");
  assert.equal(timeZoneKind(47), "rest");
});
test("journal persists before success, survives reload, deduplicates, scopes Base, and preserves conflict/corrupt bytes", () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => values.set(k, v),
    };
  const note = {
    id: randomUUID(),
    sourceKey: "a".repeat(64),
    at: Date.now(),
    author: "我",
    text: "synthetic thought",
    synced: false,
  };
  saveJournal(storage, [note]);
  assert.deepEqual(loadJournal(storage), [note]);
  const other = {
    ...note,
    id: randomUUID(),
    sourceKey: "b".repeat(64),
  };
  const result = mergeJournal(
    [note, other],
    [{ ...note, synced: true }]
  );
  assert.equal(result.length, 2);
  assert.equal(result.find((n) => n.id === note.id).synced, true);
  assert.throws(
    () => mergeJournal(result, [{ ...note, text: "conflict" }]),
    /不同内容/
  );
  assert.throws(
    () =>
      saveJournal(
        {
          ...storage,
          setItem: () => {
            throw Error("disk full");
          },
        },
        [note]
      ),
    /disk full/
  );
  values.set(JOURNAL_KEY, "corrupt");
  assert.throws(() => loadJournal(storage));
  assert.equal(values.get(JOURNAL_KEY), "corrupt");
});
