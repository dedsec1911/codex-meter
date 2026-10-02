const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("meter", {
  getUsage: () => ipcRenderer.invoke("get-usage"),
  refresh: () => ipcRenderer.invoke("refresh"),
  setRefreshInterval: (seconds) =>
    ipcRenderer.invoke("set-refresh-interval", seconds),
  setViewMode: (mode) => ipcRenderer.invoke("set-view-mode", mode),
  hideMini: () => ipcRenderer.invoke("hide-mini"),
  selectBucket: (id) => ipcRenderer.invoke("select-bucket", id),
  onUsage: (callback) =>
    ipcRenderer.on("usage", (_event, data) => callback(data)),
});
