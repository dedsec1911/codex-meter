const { band } = require("./gauge.js");

const COLORS = {
  green: "#32e58e",
  yellow: "#ffce38",
  red: "#ff4e56",
  unknown: "#9cabbc",
};

function touchBarState(state) {
  const buckets = state.data?.buckets || [];
  const bucket =
    buckets.find((item) => item.id === state.selectedBucketId) ||
    buckets.find((item) => item.id === "codex") ||
    buckets[0];
  const quota = (minutes, name) => {
    const remaining = bucket?.windows.find(
      (window) => window.minutes === minutes,
    )?.remaining;
    const known = typeof remaining === "number" && Number.isFinite(remaining);
    const percentage = known
      ? Math.round(Math.max(0, Math.min(100, remaining)))
      : null;
    return {
      label: `${name} ${known ? `${percentage}% left` : "—"}`,
      color: COLORS[band(known ? remaining : null)],
      accessibilityLabel: `${name} remaining ${known ? `${percentage} percent` : "unavailable"}${state.error && known ? ", stale" : ""}`,
    };
  };
  return {
    short: quota(300, "5h"),
    weekly: quota(10080, "Weekly"),
    status: state.error
      ? state.data
        ? "Stale"
        : "Unavailable"
      : state.loading
        ? "Refreshing…"
        : "",
    refreshEnabled: !state.loading,
  };
}

function createTouchBarController(TouchBar, windows, actions) {
  const records = windows.map(({ window, mode }) => {
    const short = new TouchBar.TouchBarLabel({ label: "5h —" });
    const weekly = new TouchBar.TouchBarLabel({ label: "Weekly —" });
    const status = new TouchBar.TouchBarLabel({ label: "" });
    const refresh = new TouchBar.TouchBarButton({
      label: "Refresh",
      click: actions.refresh,
    });
    const switchView = new TouchBar.TouchBarButton({
      label: mode === "full" ? "Mini" : "Details",
      click: () => actions.setViewMode(mode === "full" ? "mini" : "full"),
    });
    // Each window owns its own TouchBar and items. Leave Esc and Control Strip alone.
    const bar = new TouchBar({
      items: [
        short,
        new TouchBar.TouchBarSpacer({ size: "small" }),
        weekly,
        new TouchBar.TouchBarSpacer({ size: "flexible" }),
        refresh,
        switchView,
        status,
      ],
    });
    return { window, bar, short, weekly, status, refresh };
  });
  return {
    setEnabled(enabled) {
      for (const record of records)
        record.window.setTouchBar(enabled ? record.bar : null);
    },
    update(state) {
      const view = touchBarState(state);
      for (const record of records) {
        for (const key of ["short", "weekly"]) {
          record[key].label = view[key].label;
          record[key].textColor = view[key].color;
          record[key].accessibilityLabel = view[key].accessibilityLabel;
        }
        record.status.label = view.status;
        record.status.textColor = state.error ? COLORS.yellow : COLORS.unknown;
        record.refresh.enabled = view.refreshEnabled;
      }
      return view;
    },
  };
}

module.exports = { touchBarState, createTouchBarController };
