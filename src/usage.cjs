const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { version } = require("../package.json");

function candidates(
  override,
  env = process.env,
  platform = process.platform,
  arch = process.arch,
) {
  const filePath = platform === "win32" ? path.win32 : path;
  const names = platform === "win32" ? ["codex.exe"] : ["codex"];
  const directories = (env.PATH || env.Path || "")
    .split(platform === "win32" ? ";" : ":")
    .filter(Boolean);
  const paths = directories.flatMap((p) =>
    names.map((n) => filePath.join(p, n)),
  );
  const npmPaths =
    platform === "win32"
      ? [...directories, filePath.join(env.APPDATA || "", "npm")].flatMap(
          (directory) => {
            const triple =
              arch === "arm64"
                ? "aarch64-pc-windows-msvc"
                : "x86_64-pc-windows-msvc";
            const roots = [
              filePath.join(
                directory,
                "node_modules",
                "@openai",
                `codex-win32-${arch}`,
              ),
              filePath.join(
                directory,
                "node_modules",
                "@openai",
                "codex",
                "node_modules",
                "@openai",
                `codex-win32-${arch}`,
              ),
              filePath.join(directory, "node_modules", "@openai", "codex"),
            ];
            return roots.flatMap((root) =>
              ["bin", "codex"].map((bin) =>
                filePath.join(root, "vendor", triple, bin, "codex.exe"),
              ),
            );
          },
        )
      : [];
  const bundled =
    platform === "darwin"
      ? ["ChatGPT", "Codex"].flatMap((name) => [
          `/Applications/${name}.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex`,
          `/Applications/${name}.app/Contents/Resources/codex`,
          path.join(
            os.homedir(),
            `Applications/${name}.app/Contents/Resources/codex`,
          ),
        ])
      : platform === "win32"
        ? [
            filePath.join(
              env.LOCALAPPDATA || "",
              "Programs",
              "Codex",
              "resources",
              "codex.exe",
            ),
          ]
        : [];
  return override
    ? [override]
    : [
        ...paths,
        ...npmPaths,
        ...bundled,
        ...(platform === "win32"
          ? []
          : ["/opt/homebrew/bin/codex", "/usr/local/bin/codex"]),
      ];
}
function findCodex(override) {
  const found = candidates(override).find((p) => {
    try {
      fs.accessSync(
        p,
        process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK,
      );
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
  if (!found)
    throw new Error(
      "Codex executable not found. Install the Codex CLI, or choose your Codex executable in the tray menu.",
    );
  return found;
}
function normalize(result) {
  const entries = result.rateLimitsByLimitId
    ? Object.entries(result.rateLimitsByLimitId).filter(([, b]) => b)
    : [];
  if (!entries.length && result.rateLimits)
    entries.push([result.rateLimits.limitId || "codex", result.rateLimits]);
  return {
    updatedAt: Date.now(),
    buckets: entries.map(([id, bucket]) => ({
      id,
      name: bucket.limitName || id,
      plan: bucket.planType || null,
      windows: [bucket.primary, bucket.secondary].filter(Boolean).map((w) => ({
        minutes:
          typeof w.windowDurationMins === "number"
            ? w.windowDurationMins
            : null,
        remaining:
          typeof w.usedPercent === "number" && Number.isFinite(w.usedPercent)
            ? Math.max(0, Math.min(100, 100 - w.usedPercent))
            : null,
        resetsAt: typeof w.resetsAt === "number" ? w.resetsAt : null,
      })),
    })),
  };
}
function readUsage(
  executable,
  { timeoutMs = 25000, args = ["app-server", "--listen", "stdio://"] } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let finished = false;
    const lines = createInterface({ input: child.stdout });
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            "Codex usage request timed out. Check your connection and Codex sign-in.",
          ),
        ),
      timeoutMs,
    );
    function finish(error, value) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      lines.close();
      child.stdin.end();
      child.kill();
      error ? reject(error) : resolve(value);
    }
    function send(message) {
      child.stdin.write(JSON.stringify(message) + "\n");
    }
    child.stderr.resume(); // Never log authentication or server diagnostics.
    child.on("error", () =>
      finish(
        new Error(
          "Could not launch Codex. Choose a valid native Codex executable.",
        ),
      ),
    );
    child.stdin.on("error", () =>
      finish(new Error("Codex connection closed.")),
    );
    child.on("exit", () =>
      finish(
        new Error(
          "Codex exited before returning usage limits. Update the CLI and check your sign-in.",
        ),
      ),
    );
    lines.on("line", (line) => {
      let m;
      try {
        m = JSON.parse(line);
      } catch {
        return;
      }
      if (m.id === 1) {
        if (m.error)
          return finish(
            new Error("Codex initialization failed. Update your Codex CLI."),
          );
        send({ method: "initialized" });
        send({ id: 2, method: "account/rateLimits/read" });
      } else if (m.id === 2) {
        if (m.error)
          return finish(
            new Error(
              "Usage unavailable. Sign in to Codex with ChatGPT using “codex login”, then refresh. API-key sessions do not provide plan limits.",
            ),
          );
        if (!m.result)
          return finish(new Error("Codex returned an invalid usage response."));
        finish(null, normalize(m.result));
      } else if (m.id != null && m.method) {
        send({
          id: m.id,
          error: { code: -32601, message: "Unsupported method" },
        });
      }
    });
    send({
      id: 1,
      method: "initialize",
      params: {
        clientInfo: {
          name: "codex_meter",
          title: "Codex Meter",
          version,
        },
        capabilities: null,
      },
    });
  });
}
module.exports = { candidates, findCodex, normalize, readUsage };
