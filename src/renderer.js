const $ = (id) => document.getElementById(id);
let state, selected;
function resetText(seconds) {
  if (seconds == null) return "Reset time unavailable";
  const left = seconds * 1000 - Date.now();
  const date = new Date(seconds * 1000);
  if (left <= 0) return "Reset due · waiting for fresh usage";
  const minutes = Math.ceil(left / 60000),
    hours = Math.floor(minutes / 60),
    days = Math.floor(hours / 24);
  const duration = days
    ? `${days}d ${hours % 24}h`
    : hours
      ? `${hours}h ${minutes % 60}m`
      : `${minutes}m`;
  return `Resets in ${duration} · ${date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}
function render(next) {
  state = next;
  $("interval").value = String(next.refreshSeconds ?? 15);
  $("interval-note").textContent =
    next.refreshSeconds > 0 && next.refreshSeconds < 10
      ? "Frequent refreshes start more Codex processes and network requests."
      : "Changes save automatically.";
  const seconds = next.refreshSeconds ?? 15;
  $("hint").textContent =
    `${seconds === 0 ? "Manual refresh" : `Updates every ${seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}`} · Close to keep in tray`;
  $("refresh").disabled = next.loading;
  $("status").className =
    `dot ${next.error ? "error" : next.data ? "live" : ""}`;
  $("error").hidden = !next.error;
  $("error").textContent = next.error || "";
  const buckets = next.data?.buckets || [];
  if (buckets.some((b) => b.id === next.selectedBucketId))
    selected = next.selectedBucketId;
  if (!buckets.some((b) => b.id === selected))
    selected = buckets.find((b) => b.id === "codex")?.id || buckets[0]?.id;
  $("bucket").replaceChildren(
    ...buckets.map((b) => {
      const option = document.createElement("option");
      option.value = b.id;
      option.textContent = b.name;
      return option;
    }),
  );
  $("bucket").value = selected || "";
  $("bucket").hidden = buckets.length < 2;
  const bucket = buckets.find((b) => b.id === selected);
  $("plan").textContent = bucket?.plan
    ? `${bucket.plan.toUpperCase()} PLAN`
    : "LOCAL SESSION";
  $("windows").replaceChildren(
    ...(bucket?.windows || []).map((w) => {
      const card = document.createElement("section");
      card.className = `card ${meterGauge.band(w.remaining)}`;
      const top = document.createElement("div");
      top.className = "top";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent =
        w.minutes === 300
          ? "5 hour limit"
          : w.minutes === 10080
            ? "Weekly limit"
            : w.minutes == null
              ? "Usage window"
              : `${w.minutes / 60} hour limit`;
      const value = document.createElement("span");
      value.className = "value";
      value.textContent =
        w.remaining == null ? "—" : `${Math.round(w.remaining)}%`;
      const small = document.createElement("small");
      small.textContent = "left";
      value.append(small);
      top.append(label, value);
      const bar = document.createElement("progress");
      bar.max = 100;
      bar.value = w.remaining || 0;
      bar.setAttribute("aria-label", label.textContent + " remaining");
      bar.hidden = w.remaining == null;
      const reset = document.createElement("p");
      reset.className = "reset";
      reset.textContent = resetText(w.resetsAt);
      card.append(top, bar, reset);
      return card;
    }),
  );
  $("empty").hidden = !next.data || !!bucket?.windows.length;
  $("updated").textContent = next.loading
    ? "Refreshing…"
    : next.data
      ? `${next.error ? "Stale · " : ""}Updated ${new Date(next.data.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
      : "Session unavailable";
}
$("bucket").addEventListener("change", (event) => {
  selected = event.target.value;
  window.meter.selectBucket(selected);
});
$("mini-mode").addEventListener("click", () =>
  window.meter.setViewMode("mini"),
);
$("refresh").addEventListener("click", () => window.meter.refresh());
$("interval").addEventListener("change", async (event) => {
  try {
    await window.meter.setRefreshInterval(Number(event.target.value));
  } catch {
    $("interval-note").textContent =
      "Could not save refresh interval. Please try again.";
  }
});
window.meter.onUsage(render);
window.meter.getUsage().then(render);
setInterval(() => {
  if (state) render(state);
}, 30000);
