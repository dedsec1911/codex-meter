const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { normalize, readUsage } = require("../src/usage.cjs");
const fake = path.join(__dirname, "fake-server.cjs");
test("reads limits through initialized stdio protocol", async () => {
  const data = await readUsage(process.execPath, { args: [fake] });
  assert.deepEqual(
    data.buckets[0].windows.map((w) => w.remaining),
    [77, 38],
  );
});
test("multi-bucket data takes precedence; unknown and missing windows stay unknown", () => {
  const data = normalize({
    rateLimits: { primary: { usedPercent: 90 } },
    rateLimitsByLimitId: {
      codex: {
        primary: { usedPercent: null, windowDurationMins: 300 },
        secondary: null,
      },
      other: {
        primary: { usedPercent: 110, windowDurationMins: 60 },
        secondary: { usedPercent: -10 },
      },
    },
  });
  assert.equal(data.buckets[0].windows[0].remaining, null);
  assert.equal(data.buckets[0].windows.length, 1);
  assert.deepEqual(
    data.buckets[1].windows.map((w) => w.remaining),
    [0, 100],
  );
});
test("errors never expose raw server diagnostics", async () => {
  await assert.rejects(
    readUsage(process.execPath, { args: [fake, "error"] }),
    (e) => !e.message.includes("secret") && e.message.includes("Sign in"),
  );
});
test("hung requests time out and clean up", async () => {
  await assert.rejects(
    readUsage(process.execPath, { args: [fake, "timeout"], timeoutMs: 150 }),
    /timed out/,
  );
});
test("missing executable fails with actionable message", async () => {
  await assert.rejects(readUsage("/nonexistent/codex"), /Could not launch/);
});
