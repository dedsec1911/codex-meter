const { findCodex, readUsage } = require('../src/usage.cjs');
readUsage(findCodex(process.env.CODEX_METER_BIN)).then(data => console.log(JSON.stringify(data, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
