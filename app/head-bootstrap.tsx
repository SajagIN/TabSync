export const HEAD_BOOTSTRAP_SCRIPT = String.raw`
(function () {
  var defaults = {
    theme: { field: "theme", value: "light", version: { wallMs: 0, counter: 0, actorId: "default" } },
    language: { field: "language", value: "en", version: { wallMs: 0, counter: 0, actorId: "default" } },
    fontSize: { field: "fontSize", value: 16, version: { wallMs: 0, counter: 0, actorId: "default" } }
  };
  var prefix = "tabsync:v1:register:";
  var actorPattern = /^[A-Za-z0-9_-]{1,64}$/;
  function compare(a, b) {
    if (a.wallMs !== b.wallMs) return a.wallMs < b.wallMs ? -1 : 1;
    if (a.counter !== b.counter) return a.counter < b.counter ? -1 : 1;
    if (a.actorId === b.actorId) return 0;
    return a.actorId < b.actorId ? -1 : 1;
  }
  function valid(record) {
    if (!record || typeof record !== "object" || Array.isArray(record) || record.v !== 1) return false;
    if (!["theme", "language", "fontSize"].includes(record.field)) return false;
    if (record.field === "theme" && record.value !== "light" && record.value !== "dark") return false;
    if (record.field === "language" && !["en", "hi", "ta"].includes(record.value)) return false;
    if (record.field === "fontSize" && (!Number.isInteger(record.value) || record.value < 14 || record.value > 24)) return false;
    var v = record.version;
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    return Number.isSafeInteger(v.wallMs) && v.wallMs >= 0 && Number.isSafeInteger(v.counter) && v.counter >= 0 && v.counter <= 65535 && typeof v.actorId === "string" && actorPattern.test(v.actorId) && v.actorId !== "default";
  }
  try {
    var winners = Object.assign({}, defaults);
    for (var i = 0; i < localStorage.length; i += 1) {
      var key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      try {
        var record = JSON.parse(localStorage.getItem(key) || "null");
        if (!valid(record) || key !== prefix + record.field + ":" + record.version.actorId) continue;
        if (compare(winners[record.field].version, record.version) < 0) winners[record.field] = record;
      } catch (_) {}
    }
    var root = document.documentElement;
    root.classList.toggle("dark", winners.theme.value === "dark");
    root.style.colorScheme = winners.theme.value;
    root.lang = winners.language.value;
    root.style.setProperty("--tabsync-font-size", winners.fontSize.value + "px");
    root.dataset.tabsyncBootstrapApplied = "true";
    window.__tabsyncBootstrapApplied = true;
  } catch (_) {}
})();
`.trim()

export function HeadBootstrap() {
  return <script dangerouslySetInnerHTML={{ __html: HEAD_BOOTSTRAP_SCRIPT }} />
}
