const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  touchBarState,
  createTouchBarController,
} = require("../src/touch-bar.cjs");
const snapshot = (short, weekly, extra = {}) => ({
  data: {
    buckets: [
      {
        id: "codex",
        windows: [
          { minutes: 300, remaining: short },
          { minutes: 10080, remaining: weekly },
        ],
      },
    ],
  },
  ...extra,
});

test("Touch Bar preserves remaining percentages, quota colours and unavailable windows", () => {
  const view = touchBarState(snapshot(51, 19));
  assert.equal(view.short.label, "5h 51% left");
  assert.equal(view.short.color, "#32e58e");
  assert.equal(view.weekly.label, "Weekly 19% left");
  assert.equal(view.weekly.color, "#ff4e56");
  assert.equal(touchBarState(snapshot(20, null)).short.color, "#ffce38");
  assert.equal(touchBarState(snapshot(20, null)).weekly.label, "Weekly —");
});

test("selected quota and stale snapshots are reflected in Touch Bar", () => {
  const state = snapshot(90, 90, {
    selectedBucketId: "other",
    error: "Offline",
  });
  state.data.buckets.push({
    id: "other",
    windows: [{ minutes: 300, remaining: 35 }],
  });
  const view = touchBarState(state);
  assert.equal(view.short.label, "5h 35% left");
  assert.equal(view.short.color, "#ffce38");
  assert.equal(view.status, "Stale");
  assert.match(view.short.accessibilityLabel, /stale/);
  assert.equal(view.weekly.label, "Weekly —");
  assert.equal(touchBarState({ error: "Offline" }).status, "Unavailable");
  assert.equal(touchBarState({ loading: true }).refreshEnabled, false);
});

test("windows own independent bars, controls invoke actions, and disable removes both bars", () => {
  class Item {
    constructor(options) {
      Object.assign(this, options);
    }
  }
  class FakeTouchBar extends Item {}
  FakeTouchBar.TouchBarLabel =
    FakeTouchBar.TouchBarButton =
    FakeTouchBar.TouchBarSpacer =
      Item;
  const full = {
    setTouchBar(bar) {
      this.bar = bar;
    },
  };
  const mini = {
    setTouchBar(bar) {
      this.bar = bar;
    },
  };
  let refreshes = 0,
    selectedView;
  const controller = createTouchBarController(
    FakeTouchBar,
    [
      { window: full, mode: "full" },
      { window: mini, mode: "mini" },
    ],
    {
      refresh: () => refreshes++,
      setViewMode: (mode) => {
        selectedView = mode;
      },
    },
  );
  controller.setEnabled(true);
  assert.notEqual(full.bar, mini.bar);
  controller.update(snapshot(78, 42));
  assert.equal(full.bar.items[0].label, "5h 78% left");
  assert.equal(mini.bar.items[2].label, "Weekly 42% left");
  full.bar.items[4].click();
  assert.equal(refreshes, 1);
  full.bar.items[5].click();
  assert.equal(selectedView, "mini");
  mini.bar.items[5].click();
  assert.equal(selectedView, "full");
  controller.update({ loading: true });
  assert.equal(full.bar.items[4].enabled, false);
  controller.setEnabled(false);
  assert.equal(full.bar, null);
  assert.equal(mini.bar, null);
});
