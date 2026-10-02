const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createScheduler,
  validInterval,
} = require("../src/refresh-settings.cjs");
test("interval changes replace the existing timer; manual mode and quit clear it", () => {
  const active = new Map();
  let id = 0,
    calls = 0;
  const scheduler = createScheduler(() => calls++, {
    setInterval(callback, ms) {
      active.set(++id, { callback, ms });
      return id;
    },
    clearInterval(key) {
      active.delete(key);
    },
  });
  scheduler.set(15);
  assert.equal(active.get(1).ms, 15000);
  active.get(1).callback();
  assert.equal(calls, 1);
  scheduler.set(1);
  assert.equal(active.size, 1);
  assert.equal(active.get(2).ms, 1000);
  scheduler.set(0);
  assert.equal(active.size, 0);
  scheduler.set(300);
  scheduler.stop();
  assert.equal(active.size, 0);
});
test("invalid intervals cannot replace the current timer", () => {
  let cleared = false;
  const scheduler = createScheduler(() => {}, {
    setInterval: () => 1,
    clearInterval: () => {
      cleared = true;
    },
  });
  scheduler.set(15);
  for (const value of [-1, 2, null, "15", NaN, Infinity]) {
    assert.equal(validInterval(value), false);
    assert.throws(() => scheduler.set(value), /Invalid/);
  }
  assert.equal(cleared, false);
});
