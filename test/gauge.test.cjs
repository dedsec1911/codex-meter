const { test } = require('node:test');
const assert = require('node:assert/strict');
const { band, gauge } = require('../src/gauge.js');
test('remaining percentage boundaries match green, yellow and red bands', () => {
  for (const value of [51, 75, 100]) assert.equal(band(value), 'green');
  for (const value of [20, 35, 50]) assert.equal(band(value), 'yellow');
  for (const value of [0, 10, 19]) assert.equal(band(value), 'red');
  for (const value of [null, undefined, NaN]) assert.equal(band(value), 'unknown');
});
test('needle follows remaining quota and unavailable data has no needle', () => {
  assert.match(gauge(0), /rotate\(-90 100 105\)/);
  assert.match(gauge(100), /rotate\(90 100 105\)/);
  assert.match(gauge(50), /rotate\(0 100 105\)/);
  assert.doesNotMatch(gauge(null), /rotate\(/);
  assert.match(gauge(null), /Usage unavailable/);
});
