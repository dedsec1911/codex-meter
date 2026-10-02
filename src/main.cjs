const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
  powerMonitor,
  screen,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { findCodex, readUsage } = require("./usage.cjs");
const {
  INTERVALS,
  DEFAULT_INTERVAL,
  validInterval,
  intervalLabel,
  createScheduler,
} = require("./refresh-settings.cjs");
const { band } = require("./gauge.js");
const demoSmoke = process.argv.includes("--smoke-demo");
const statusIcons = {};
// Use a separate app profile before acquiring the single-instance lock.
if (demoSmoke)
  app.setPath(
    "userData",
    fs.mkdtempSync(
      path.join(require("node:os").tmpdir(), "codex-meter-smoke-"),
    ),
  );
let win,
  mini,
  tray,
  settings = {},
  state = { loading: true, data: null, error: null },
  pending;
const scheduler = createScheduler(refresh);
const settingsPath = () => path.join(app.getPath("userData"), "settings.json");
function save() {
  fs.writeFileSync(settingsPath(), JSON.stringify(settings));
}
function publish() {
  state.refreshSeconds = settings.refreshSeconds;
  state.selectedBucketId = settings.selectedBucketId;
  win?.webContents.send("usage", state);
  mini?.webContents.send("usage", state);
  const bucket =
    state.data?.buckets.find((b) => b.id === settings.selectedBucketId) ||
    state.data?.buckets.find((b) => b.id === "codex") ||
    state.data?.buckets[0];
  const short = bucket?.windows.find((w) => w.minutes === 300);
  const week = bucket?.windows.find((w) => w.minutes === 10080);
  const display = (w) =>
    w?.remaining == null ? "—" : `${Math.round(w.remaining)}%`;
  const title = `5h ${display(short)} · Weekly ${display(week)}`;
  const values = [short?.remaining, week?.remaining].filter(
    (v) => typeof v === "number",
  );
  tray.setImage(statusIcons[band(values.length ? Math.min(...values) : null)]);
  tray.setToolTip(
    `Codex Meter — ${title}${state.error ? " (refresh failed)" : ""}`,
  );
  if (process.platform === "darwin") tray.setTitle(title);
}
async function refresh() {
  if (pending) return pending;
  state.loading = true;
  publish();
  pending = Promise.resolve().then(async () => {
    try {
      state.data = demoSmoke
        ? {
            updatedAt: Date.now(),
            buckets: [
              {
                id: "codex",
                name: "codex",
                plan: "plus",
                windows: [
                  {
                    minutes: 300,
                    remaining: 78,
                    resetsAt: Math.floor(Date.now() / 1000) + 5400,
                  },
                  {
                    minutes: 10080,
                    remaining: 42,
                    resetsAt: Math.floor(Date.now() / 1000) + 172800,
                  },
                ],
              },
            ],
          }
        : await readUsage(
            findCodex(settings.executable || process.env.CODEX_METER_BIN),
          );
      state.error = null;
    } catch (e) {
      state.error = e.message;
    } finally {
      state.loading = false;
      pending = null;
      publish();
    }
  });
  return pending;
}
function show() {
  const target = settings.viewMode === "mini" ? mini : win;
  target.show();
  target.focus();
}
function setViewMode(mode) {
  if (!["mini", "full"].includes(mode)) throw new Error("Invalid view mode");
  settings.viewMode = mode;
  save();
  if (mode === "mini") {
    win.hide();
    mini.show();
    mini.focus();
  } else {
    mini.hide();
    win.show();
    win.focus();
  }
  menu();
}
function safeMiniPosition(position) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y))
    return {};
  const area = screen.getDisplayNearestPoint(position).workArea;
  return {
    x: Math.round(
      Math.max(area.x, Math.min(position.x, area.x + area.width - 260)),
    ),
    y: Math.round(
      Math.max(area.y, Math.min(position.y, area.y + area.height - 190)),
    ),
  };
}
function setRefreshInterval(seconds) {
  if (!validInterval(seconds))
    throw new Error("Choose a supported refresh interval.");
  settings.refreshSeconds = seconds;
  save();
  scheduler.set(seconds);
  menu();
  publish();
  return seconds;
}
function menu() {
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show widget", click: show },
      {
        label: "Mini meter · always on top",
        type: "radio",
        checked: settings.viewMode === "mini",
        click: () => setViewMode("mini"),
      },
      {
        label: "Detailed window",
        type: "radio",
        checked: settings.viewMode !== "mini",
        click: () => setViewMode("full"),
      },
      { label: "Refresh usage", click: refresh },
      {
        label: "Refresh interval",
        submenu: INTERVALS.map((seconds) => ({
          label: intervalLabel(seconds),
          type: "radio",
          checked: settings.refreshSeconds === seconds,
          click: () => setRefreshInterval(seconds),
        })),
      },
      {
        label: "Detailed window always on top",
        type: "checkbox",
        checked: !!settings.onTop,
        click: (item) => {
          settings.onTop = item.checked;
          win.setAlwaysOnTop(item.checked);
          save();
          menu();
        },
      },
      {
        label: "Launch at login",
        type: "checkbox",
        checked: app.getLoginItemSettings().openAtLogin,
        enabled: app.isPackaged,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked });
          menu();
        },
      },
      {
        label: "Choose Codex executable…",
        click: async () => {
          const result = await dialog.showOpenDialog(win, {
            title: "Choose native codex binary (codex or codex.exe)",
            properties: ["openFile", "showHiddenFiles"],
          });
          if (!result.canceled) {
            settings.executable = result.filePaths[0];
            save();
            refresh();
          }
        },
      },
      {
        label: "Use automatic detection",
        click: () => {
          delete settings.executable;
          save();
          refresh();
        },
      },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]),
  );
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => win && show());
  app.whenReady().then(() => {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    } catch {}
    if (!settings || typeof settings !== "object" || Array.isArray(settings))
      settings = {};
    if (!validInterval(settings.refreshSeconds))
      settings.refreshSeconds = DEFAULT_INTERVAL;
    const appIcon = nativeImage.createFromPath(
      path.join(__dirname, "assets/icon.png"),
    );
    for (const color of ["green", "yellow", "red", "unknown"])
      statusIcons[color] = nativeImage
        .createFromPath(path.join(__dirname, "assets", `${color}.png`))
        .resize({ width: 20, height: 20 });
    if (process.platform === "darwin") app.dock.setIcon(appIcon);
    win = new BrowserWindow({
      show: false,
      icon: appIcon,
      width: 380,
      height: 660,
      minWidth: 340,
      minHeight: 650,
      title: "Codex Meter",
      backgroundColor: "#101513",
      alwaysOnTop: !!settings.onTop,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    win.setMenuBarVisibility(false);
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    win.on("close", (event) => {
      if (!app.quitting) {
        event.preventDefault();
        win.hide();
      }
    });
    mini = new BrowserWindow({
      ...safeMiniPosition(settings.miniPosition),
      show: false,
      width: 260,
      height: 190,
      frame: false,
      transparent: true,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      title: "Codex Mini Meter",
      icon: appIcon,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    mini.setAlwaysOnTop(true, "floating");
    if (process.platform !== "win32")
      mini.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mini.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mini.webContents.on("will-navigate", (event) => event.preventDefault());
    mini.on("close", (event) => {
      if (!app.quitting) {
        event.preventDefault();
        mini.hide();
      }
    });
    let moveTimer;
    mini.on("move", () => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        const [x, y] = mini.getPosition();
        settings.miniPosition = { x, y };
        save();
      }, 200);
    });
    mini.on("closed", () => clearTimeout(moveTimer));
    const miniReady = mini.loadFile(path.join(__dirname, "mini.html"));
    tray = new Tray(appIcon.resize({ width: 20, height: 20 }));
    tray.on("click", show);
    menu();
    ipcMain.handle("set-view-mode", (_event, mode) => setViewMode(mode));
    ipcMain.handle("hide-mini", () => mini.hide());
    ipcMain.handle("select-bucket", (_event, id) => {
      if (!state.data?.buckets.some((b) => b.id === id))
        throw new Error("Unknown usage bucket");
      settings.selectedBucketId = id;
      save();
      publish();
    });
    ipcMain.handle("get-usage", () => state);
    ipcMain.handle("refresh", () => refresh());
    ipcMain.handle("set-refresh-interval", (_event, seconds) =>
      setRefreshInterval(seconds),
    );
    win
      .loadFile(path.join(__dirname, "index.html"))
      .then(async () => {
        await miniReady;
        show();
        if (process.argv.includes("--smoke-test")) {
          const originalMode = settings.viewMode || "full";
          setViewMode("full");
          await refresh();
          const rendered = await win.webContents.executeJavaScript(
            'document.getElementById("windows").textContent',
          );
          if (!state.data || !rendered.includes("%")) {
            console.error("Widget smoke test failed");
            app.exit(1);
            return;
          }
          const originalInterval = settings.refreshSeconds;
          await win.webContents.executeJavaScript(
            "window.meter.setRefreshInterval(10)",
          );
          const selectedInterval = await win.webContents.executeJavaScript(
            'document.getElementById("interval").value',
          );
          if (
            selectedInterval !== "10" ||
            JSON.parse(fs.readFileSync(settingsPath(), "utf8"))
              .refreshSeconds !== 10
          ) {
            console.error("Refresh settings smoke test failed");
            app.exit(1);
            return;
          }
          setRefreshInterval(originalInterval);
          await win.webContents.executeJavaScript(
            'document.getElementById("settings").open = true',
          );
          await win.webContents.executeJavaScript(
            "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
          );
          const capture = await win.webContents.capturePage();
          const outputDirectory = path.join(process.cwd(), "dist");
          fs.mkdirSync(outputDirectory, { recursive: true });
          fs.writeFileSync(
            path.join(outputDirectory, "widget-preview.png"),
            capture.toPNG(),
          );
          await win.webContents.executeJavaScript(
            'window.meter.setViewMode("mini")',
          );
          if (!mini.isVisible() || win.isVisible() || !mini.isAlwaysOnTop())
            throw new Error("Mini switch failed");
          await mini.webContents.executeJavaScript(
            "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
          );
          const miniText = await mini.webContents.executeJavaScript(
            "document.body.textContent",
          );
          if (!miniText.includes("%"))
            throw new Error("Mini usage not rendered");
          fs.writeFileSync(
            path.join(outputDirectory, "mini-preview.png"),
            (await mini.webContents.capturePage()).toPNG(),
          );
          // Check all three needle and percentage bands with deterministic snapshots.
          await mini.webContents.executeJavaScript(
            `render({data:{buckets:[{id:'codex',windows:[{minutes:300,remaining:35},{minutes:10080,remaining:10}]}]},refreshSeconds:15})`,
          );
          await mini.webContents.executeJavaScript(
            "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
          );
          fs.writeFileSync(
            path.join(outputDirectory, "mini-low-preview.png"),
            (await mini.webContents.capturePage()).toPNG(),
          );
          await mini.webContents.executeJavaScript(
            'window.meter.setViewMode("full")',
          );
          if (mini.isVisible() || !win.isVisible())
            throw new Error("Full switch failed");
          setViewMode(originalMode);
          console.log("Mini mode and return to full passed.");
          console.log(
            "Widget smoke test passed: live quotas rendered; refresh settings synchronized and saved.",
          );
          app.quit();
        }
      })
      .catch((error) => {
        console.error(error.message);
        app.exit(1);
      });
    refresh();
    scheduler.set(settings.refreshSeconds);
    powerMonitor.on("resume", refresh);
  });
  app.on("before-quit", () => {
    app.quitting = true;
    scheduler.stop();
  });
  app.on("window-all-closed", () => {});
}
