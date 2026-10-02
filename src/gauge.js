(function (root) {
  function band(remaining) {
    if (remaining == null || !Number.isFinite(remaining)) return "unknown";
    const percent = Math.round(Math.max(0, Math.min(100, remaining)));
    return percent >= 51 ? "green" : percent >= 20 ? "yellow" : "red";
  }
  function gauge(remaining, logo = false) {
    const known = remaining != null && Number.isFinite(remaining);
    const value = known ? Math.max(0, Math.min(100, remaining)) : 50;
    const point = (percent) => {
      const angle = Math.PI * (1 - percent / 100);
      return [100 + 74 * Math.cos(angle), 105 - 74 * Math.sin(angle)];
    };
    const arc = (start, end, color) => {
      const a = point(start),
        b = point(end);
      return `<path d="M${a.join(" ")} A74 74 0 0 1 ${b.join(" ")}" fill="none" stroke="${color}" stroke-width="17" stroke-linecap="butt"/>`;
    };
    const angle = value * 1.8 - 90;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" role="img" aria-label="${known ? Math.round(value) + " percent remaining" : "Usage unavailable"}">
      <defs><linearGradient id="face" x2="0.8" y2="1"><stop stop-color="#213446"/><stop offset="1" stop-color="#09111a"/></linearGradient></defs>
      ${logo ? '<rect x="3" y="3" width="194" height="164" rx="38" fill="url(#face)"/>' : ""}
      ${arc(0, 18, "#ff4e56")}${arc(21, 49, "#ffce38")}${arc(52, 100, "#32e58e")}
      ${[0, 20, 40, 60, 80, 100]
        .map((p) => {
          const a = Math.PI * (1 - p / 100);
          return `<path d="M${100 + 50 * Math.cos(a)} ${105 - 50 * Math.sin(a)} L${100 + 57 * Math.cos(a)} ${105 - 57 * Math.sin(a)}" stroke="#9cabbc" stroke-width="3" stroke-linecap="round"/>`;
        })
        .join("")}
      ${known ? `<g transform="rotate(${angle} 100 105)"><path d="M94 106 L100 35 L106 106Z" fill="#f1f8ff"/></g>` : ""}
      <circle cx="100" cy="105" r="12" fill="#122131" stroke="${known ? "#f1f8ff" : "#718294"}" stroke-width="4"/>
      ${logo ? "" : `<text x="100" y="153" text-anchor="middle" fill="${{ green: "#32e58e", yellow: "#ffce38", red: "#ff4e56", unknown: "#9cabbc" }[band(remaining)]}" font-family="system-ui,sans-serif" font-size="24" font-weight="650">${known ? Math.round(value) + "%" : "—"}</text>`}
    </svg>`;
  }
  const api = { band, gauge };
  if (typeof module !== "undefined") module.exports = api;
  else root.meterGauge = api;
})(globalThis);
