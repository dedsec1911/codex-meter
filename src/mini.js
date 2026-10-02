const $ = (id) => document.getElementById(id);
function render(state) {
  const buckets = state.data?.buckets || [];
  const bucket =
    buckets.find((b) => b.id === state.selectedBucketId) ||
    buckets.find((b) => b.id === "codex") ||
    buckets[0];
  $("bucket-name").textContent =
    bucket && bucket.id !== "codex" ? bucket.name : "CODEX METER";
  $("short-gauge").innerHTML = meterGauge.gauge(
    bucket?.windows.find((w) => w.minutes === 300)?.remaining ?? null,
  );
  $("weekly-gauge").innerHTML = meterGauge.gauge(
    bucket?.windows.find((w) => w.minutes === 10080)?.remaining ?? null,
  );
  document.body.classList.toggle("stale", !!state.error);
  $("mini-status").textContent = state.error
    ? state.data
      ? "Stale · open details"
      : "Unavailable · open details"
    : state.loading
      ? "Refreshing…"
      : state.data
        ? `${state.refreshSeconds ? `Every ${state.refreshSeconds}s` : "Manual"} · remaining`
        : "Connecting…";
  $("mini-status").title =
    state.error ||
    "Drag this mini meter anywhere. Open details for reset times and settings.";
  $("refresh").disabled = state.loading;
}
$("expand").addEventListener("click", () => window.meter.setViewMode("full"));
$("hide").addEventListener("click", () => window.meter.hideMini());
$("refresh").addEventListener("click", () => window.meter.refresh());
window.meter.onUsage(render);
window.meter.getUsage().then(render);
