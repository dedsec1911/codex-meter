const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { gauge } = require("../src/gauge.js");
app
  .whenReady()
  .then(async () => {
    const directory = path.join(__dirname, "../src/assets");
    fs.mkdirSync(directory, { recursive: true });
    const win = new BrowserWindow({
      show: false,
      width: 1024,
      height: 1024,
      webPreferences: { sandbox: true, contextIsolation: true },
    });
    await win.loadURL("about:blank");
    for (const [name, value] of [
      ["icon", 80],
      ["green", 80],
      ["yellow", 35],
      ["red", 10],
      ["unknown", null],
    ]) {
      const svg = gauge(value, true)
        .replace('viewBox="0 0 200 170"', 'viewBox="0 0 200 200"')
        .replace("<defs>", '<g transform="translate(0 15)"><defs>')
        .replace("</svg>", "</g></svg>")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n") + "\n";
      fs.writeFileSync(path.join(directory, `${name}.svg`), svg);
      const dataURL = await win.webContents.executeJavaScript(
        `new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;canvas.getContext('2d').drawImage(img,0,0,1024,1024);resolve(canvas.toDataURL('image/png'));};img.onerror=reject;img.src=${JSON.stringify("data:image/svg+xml;base64," + Buffer.from(svg).toString("base64"))};})`,
      );
      fs.writeFileSync(
        path.join(directory, `${name}.png`),
        Buffer.from(dataURL.split(",")[1], "base64"),
      );
    }
    console.log("Gauge logo and status icons generated.");
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
