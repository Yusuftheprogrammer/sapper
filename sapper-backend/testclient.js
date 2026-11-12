const { io } = require('socket.io-client');
const s = io('http://localhost:3001');

let last = 0;

s.on('connect', () => console.log('connected'));

s.on('snapshot', (d) => {
  if (last && d.ts - last > 1500) {
    console.log(`!!! GAP: ${d.ts - last} ms between snapshots`);
  }
  last = d.ts;
});

// one short line per second instead of a big object
s.on('stats', (d) =>
  console.log(`msg/s ${d.msgPerSec} | db/s ${d.dbWritesPerSec} | latency ${d.latencyMs} ms | online ${d.online}`),
);

s.on('alerts', (list) => console.log(`>>> ${list.length} alerts, first type: ${list[0].type}`));