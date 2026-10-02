const INTERVALS = [0, 1, 5, 10, 15, 30, 60, 120, 300];
const DEFAULT_INTERVAL = 15;
function validInterval(value) { return INTERVALS.includes(value); }
function intervalLabel(seconds) {
  if (seconds === 0) return 'Manual only';
  if (seconds === 15) return '15 seconds (recommended)';
  return seconds < 60 ? `${seconds} second${seconds === 1 ? '' : 's'}` : `${seconds / 60} minute${seconds === 60 ? '' : 's'}`;
}
function createScheduler(refresh, timers = globalThis) {
  let timer;
  return {
    set(seconds) {
      if (!validInterval(seconds)) throw new Error('Invalid refresh interval');
      if (timer !== undefined) timers.clearInterval(timer);
      timer = seconds ? timers.setInterval(refresh, seconds * 1000) : undefined;
    },
    stop() { if (timer !== undefined) timers.clearInterval(timer); timer = undefined; }
  };
}
module.exports = { INTERVALS, DEFAULT_INTERVAL, validInterval, intervalLabel, createScheduler };
