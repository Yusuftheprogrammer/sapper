const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = 3001;
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 2000,
  pingTimeout: 5000,
});

let count = 1000;
let temps = Array.from({ length: count }, (_, i) => 22 + (i % 10) * 0.5);
let status = new Array(count).fill(0);
const historyStore = new Map(); // sensorId -> [{ ts, temp }]
let alertsList = [];

// Populate 5m history
function populateHistory(sensorCount) {
  const now = Date.now();
  for (let i = 0; i < sensorCount; i++) {
    const arr = [];
    const base = temps[i] || 22.0;
    for (let t = 60; t >= 0; t--) {
      arr.push({
        ts: now - t * 5000,
        temp: +(base + (Math.random() - 0.5) * 1.5).toFixed(2),
      });
    }
    historyStore.set(i, arr);
  }
}
populateHistory(count);

// Simulation loop - every 1 second
setInterval(() => {
  const now = Date.now();
  // Jitter temperatures
  temps = temps.map((t, idx) => {
    if (status[idx] === 3) return t; // offline
    let next = +(t + (Math.random() - 0.5) * 0.6).toFixed(2);
    return Math.max(15, Math.min(110, next));
  });

  // Calculate status: 0: ok, 1: warning (>=60), 2: overheat (>=70), 3: offline
  status = temps.map((t, idx) => (status[idx] === 3 ? 3 : t >= 70 ? 2 : t >= 60 ? 1 : 0));

  const online = status.filter((s) => s !== 3).length;
  const offline = count - online;

  // 1. snapshot (once per second)
  io.emit('snapshot', { ts: now, temps, status });

  // 2. stats (once per second)
  io.emit('stats', {
    msgPerSec: online,
    latencyMs: Math.round(20 + Math.random() * 25),
    dbWritesPerSec: Math.round(online / 5),
    total: count,
    online,
    offline,
  });

  // Random occasional alert batch
  if (Math.random() < 0.25 && online > 0) {
    const hot = Math.floor(Math.random() * count);
    if (status[hot] !== 3) {
      temps[hot] = 74.5;
      status[hot] = 2;
      const newAlert = {
        id: 'a' + Date.now(),
        sensorId: hot,
        zone: hot % 10,
        type: 'overheat',
        value: 74.5,
        ts: now,
      };
      alertsList.unshift(newAlert);
      if (alertsList.length > 100) alertsList.pop();
      io.emit('alerts', [newAlert]);
    }
  }
}, 1000);

// REST API
app.get('/alerts', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json(alertsList.slice(0, limit));
});

app.get('/sensors/:id/history', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 0 || id >= count) {
    return res.status(404).json({ error: 'Sensor not found' });
  }
  let h = historyStore.get(id);
  if (!h || h.length === 0) {
    populateHistory(count);
    h = historyStore.get(id) || [];
  }
  res.json(h);
});

app.post('/control', (req, res) => {
  const { cmd, zone, delta, count: newCount } = req.body;

  if (cmd === 'heatwave') {
    const targetZone = zone !== undefined ? parseInt(zone, 10) : 3;
    const addDelta = delta !== undefined ? delta : 55;
    const now = Date.now();
    const batch = [];

    for (let i = 0; i < count; i++) {
      if (i % 10 === targetZone && status[i] !== 3) {
        temps[i] = Math.min(105, +(temps[i] + addDelta).toFixed(2));
        status[i] = temps[i] >= 70 ? 2 : 1;
        batch.push({
          id: 'a' + Date.now() + '-' + i,
          sensorId: i,
          zone: targetZone,
          type: temps[i] >= 70 ? 'overheat' : 'rapid_rise',
          value: temps[i] >= 70 ? temps[i] : addDelta,
          ts: now,
        });
      }
    }
    alertsList = [...batch, ...alertsList].slice(0, 100);
    io.emit('alerts', batch.slice(0, 50));
    return res.json({ ok: true });
  }

  if (cmd === 'kill') {
    const silenceCount = newCount || 100;
    let killed = 0;
    const now = Date.now();
    const batch = [];
    for (let i = 0; i < count; i++) {
      if (status[i] !== 3) {
        status[i] = 3;
        killed++;
        batch.push({
          id: 'a' + Date.now() + '-' + i,
          sensorId: i,
          zone: i % 10,
          type: 'offline',
          value: temps[i],
          ts: now,
        });
        if (killed >= silenceCount) break;
      }
    }
    alertsList = [...batch, ...alertsList].slice(0, 100);
    io.emit('alerts', batch);
    return res.json({ ok: true });
  }

  if (cmd === 'revive') {
    for (let i = 0; i < count; i++) {
      if (status[i] === 3) {
        status[i] = 0;
        temps[i] = 22 + (i % 10) * 0.5;
      }
    }
    return res.json({ ok: true });
  }

  if (cmd === 'scale') {
    count = Math.min(50000, Math.max(10, parseInt(newCount, 10) || 1000));
    temps = Array.from({ length: count }, (_, i) => 22 + (i % 10) * 0.5);
    status = new Array(count).fill(0);
    populateHistory(count);
    return res.json({ ok: true });
  }

  if (cmd === 'reset') {
    count = 1000;
    temps = Array.from({ length: count }, (_, i) => 22 + (i % 10) * 0.5);
    status = new Array(count).fill(0);
    alertsList = [];
    populateHistory(count);
    return res.json({ ok: true });
  }

  res.status(400).json({ error: 'Invalid command' });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[HeatGuard Mock Server v2] Listening on http://localhost:${PORT}`);
  });
}
module.exports = { app, server };
