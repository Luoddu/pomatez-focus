import { test } from "node:test";
import assert from "node:assert/strict";

// Mock Web Audio + localStorage before importing the module under test.
// 模块内会缓存 AudioContext 单例，因此用全局数组累计所有振荡器，
// 每个用例按起点切片取本段新增。
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const played = [];
class FakeParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeOsc {
  constructor() {
    this.frequency = { value: 0 };
  }
  connect(node) {
    return node;
  }
  start(t) {
    this.startedAt = t;
    played.push(this);
  }
  stop(t) {
    this.stoppedAt = t;
  }
}
class FakeGain {
  constructor() {
    this.gain = new FakeParam();
  }
  connect(node) {
    return node;
  }
}
class FakeContext {
  constructor() {
    this.currentTime = 10;
    this.state = "running";
    this.destination = {};
    FakeContext.count++;
  }
  createOscillator() {
    return new FakeOsc();
  }
  createGain() {
    return new FakeGain();
  }
  resume() {
    return Promise.resolve();
  }
}
FakeContext.count = 0;
globalThis.window = { AudioContext: FakeContext };

const {
  isSoundEnabled,
  setSoundEnabled,
  playTimeUp,
  playRestEnd,
} = await import("../app/renderer/src/focus/sound.ts");

test("sound toggle defaults on, persists off, and never touches the records key", () => {
  assert.equal(isSoundEnabled(), true);
  setSoundEnabled(false);
  assert.equal(isSoundEnabled(), false);
  assert.equal(store.get("pomatez-focus-sound-v1"), "0");
  setSoundEnabled(true);
  assert.equal(isSoundEnabled(), true);
  assert.equal(store.get("pomatez-focus-sound-v1"), "1");
  assert.equal(store.has("pomatez-focus-v1"), false);
});

test("disabled sound creates no audio context and plays nothing", () => {
  setSoundEnabled(false);
  const oscBefore = played.length,
    ctxBefore = FakeContext.count;
  playTimeUp();
  playRestEnd();
  assert.equal(played.length, oscBefore);
  assert.equal(FakeContext.count, ctxBefore);
  setSoundEnabled(true);
});

test("time-up chime is an ascending three-note sine phrase within 0.7s", () => {
  const before = played.length;
  playTimeUp();
  const oscs = played.slice(before);
  assert.equal(oscs.length, 3);
  const freqs = oscs.map((o) => o.frequency.value);
  assert.ok(freqs[0] < freqs[1] && freqs[1] < freqs[2]);
  const span = Math.max(...oscs.map((o) => o.stoppedAt)) - 10;
  assert.ok(span > 0.4 && span <= 0.7, `span ${span}`);
});

test("rest-end cue is a descending phrase within 0.5s", () => {
  const before = played.length;
  playRestEnd();
  const oscs = played.slice(before);
  assert.equal(oscs.length, 2);
  assert.ok(oscs[0].frequency.value > oscs[1].frequency.value);
  const span = Math.max(...oscs.map((o) => o.stoppedAt)) - 10;
  assert.ok(span > 0.25 && span <= 0.5, `span ${span}`);
});

test("missing AudioContext support fails silent", () => {
  const saved = globalThis.window;
  globalThis.window = {};
  playTimeUp();
  playRestEnd();
  globalThis.window = saved;
});
