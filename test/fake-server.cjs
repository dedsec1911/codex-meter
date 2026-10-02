const readline = require('node:readline');
readline.createInterface({ input: process.stdin }).on('line', line => {
  const request = JSON.parse(line);
  if (request.method === 'initialize') console.log(JSON.stringify({ id: request.id, result: {} }));
  if (request.method === 'account/rateLimits/read') {
    if (process.argv.includes('timeout')) return;
    if (process.argv.includes('error')) return console.log(JSON.stringify({ id: request.id, error: { message: 'secret token never display' } }));
    console.log('diagnostic noise');
    console.log(JSON.stringify({ id: request.id, result: { rateLimits: { primary: { usedPercent: 23, windowDurationMins: 300, resetsAt: 1800000000 }, secondary: { usedPercent: 62, windowDurationMins: 10080, resetsAt: 1800500000 } } } }));
  }
});
