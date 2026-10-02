const { test } = require("node:test");
const assert = require("node:assert/strict");
const { candidates } = require("../src/usage.cjs");
test("Windows native npm binaries are discovered behind codex.cmd shims", () => {
  const env = {
    PATH: "C:\\tools;C:\\Users\\test\\AppData\\Roaming\\npm",
    APPDATA: "C:\\Users\\test\\AppData\\Roaming",
  };
  const list = candidates(null, env, "win32", "x64");
  assert.ok(list.includes("C:\\tools\\codex.exe"));
  assert.ok(
    list.includes(
      "C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\bin\\codex.exe",
    ),
  );
  assert.ok(
    list.includes(
      "C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\vendor\\x86_64-pc-windows-msvc\\codex\\codex.exe",
    ),
  );
});
test("explicit executable preference bypasses all auto-detection", () => {
  assert.deepEqual(candidates("C:\\my\\codex.exe", {}, "win32"), [
    "C:\\my\\codex.exe",
  ]);
});
