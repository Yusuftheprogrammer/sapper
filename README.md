# صابر (Sapper)

**Real-time monitoring for thousands of temperature sensors: overheat, rapid-rise and offline detection, a live dashboard, and a time-series database that cleans up after itself.**

A Rust simulator publishes readings over MQTT. A NestJS backend ingests them, detects problems, stores history in TimescaleDB, and streams everything to a Next.js dashboard over Socket.IO.

<!-- Add a screenshot or GIF of the dashboard here:  ![Dashboard](docs/dashboard.png) -->

---

## Quick start

You only need **Docker** (with the Compose plugin).

```bash
git clone <your-repo-url>
cd sapper
docker compose up --build
```

The first build takes a few minutes (the Rust simulator is compiled inside Docker). After that, starts are fast.

| What | Where |
|---|---|
| Dashboard | http://localhost:3000 |
| Backend (REST + Socket.IO) | http://localhost:3001 |
| MQTT broker | `localhost:1883` |
| Database | `localhost:5432` (user `postgres`, password `heatguard`) |

Useful commands:

```bash
docker compose up -d --build      # run in the background
docker compose logs -f backend    # watch the backend
docker compose down               # stop everything, keep the data
docker compose down -v            # stop and delete the database
```

> **Ports 1883, 3000, 3001 and 5432 must be free.** If you have Mosquitto or Postgres installed on your machine, stop them first (for example `sudo systemctl stop mosquitto`).

---

## Try it (the demo flow)

Open the dashboard, then trigger events from the control panel, or from a terminal:

```bash
# Heat up zone 3 (+55 °C target): rapid-rise alerts in ~3 s, overheat alerts ~15 s later
curl -X POST localhost:3001/control -H "Content-Type: application/json" \
  -d '{"cmd":"heatwave","zone":3,"delta":55}'

# Silence 100 random sensors: offline alerts after ~5 s
curl -X POST localhost:3001/control -H "Content-Type: application/json" \
  -d '{"cmd":"kill","count":100}'

# Bring them back
curl -X POST localhost:3001/control -H "Content-Type: application/json" -d '{"cmd":"revive"}'

# Scale the fleet to 10,000 sensors
curl -X POST localhost:3001/control -H "Content-Type: application/json" \
  -d '{"cmd":"scale","count":10000}'

# Back to normal
curl -X POST localhost:3001/control -H "Content-Type: application/json" -d '{"cmd":"reset"}'
```

| Command | Fields | Effect |
|---|---|---|
| `heatwave` | `zone` (0-9), `delta` (-50 to 100) | Raises the target temperature of every sensor in a zone |
| `kill` | `count` (0-50000) | Silences N random sensors |
| `revive` | none | Brings every silenced sensor back |
| `scale` | `count` (1-50000) | Changes the number of simulated sensors |
| `reset` | none | Clears heatwaves and revives all sensors |

---

## How it works

```
                      control/command
              ┌────────────────────────────────────┐
              ▼                                    │
 Rust simulator ──▶ Mosquitto (MQTT) ──▶ NestJS backend ──▶ Socket.IO ──▶ Next.js dashboard
 (N sensors)     sensors/<id>/temp          │   ▲
                                            │   └── REST: /alerts, /sensors/:id/history, /control
                                            ▼
                                       TimescaleDB
                                   (batched writes, retention)
```

1. **Simulator (`sensor-sim/`, Rust).** One MQTT connection publishes for every sensor on `sensors/<id>/temp` once per second. Each sensor does a random walk around its own baseline; zone = `id % 10`. It also listens on `control/command`.
2. **Backend (`sapper-backend/`, NestJS).** Subscribes to `sensors/+/temp`, keeps each sensor's latest state in memory, runs detection, and pushes updates to the dashboard. The live view never queries the database.
3. **Database (TimescaleDB).** Readings are buffered and written once per second in a single batched query.
4. **Dashboard (`frontend/`, Next.js).** Canvas heatmap, alerts feed, stats panel, per-sensor history, and a control panel.

### Detection rules

| Alert type | Rule |
|---|---|
| `overheat` | Temperature at or above **70 °C** (60 °C is the warning level) |
| `rapid_rise` | Temperature up **8 °C or more** compared with 5 readings ago (about 5 s). Fires about 15 s before overheat in our heatwave test |
| `offline` | No message from a sensor for more than **5 s** |

Alerts fire on **status changes**, not on every reading, so a sensor stuck at 75 °C raises one alert, not sixty per minute.

### Storage design

- Writes are **batched** with a single `INSERT ... SELECT FROM unnest(...)` per second.
- The database stores **one reading per sensor every 5 seconds**. The dashboard still receives every reading live, so only the history charts are coarser.
- `readings` is a TimescaleDB hypertable with **30-minute chunks** and a **1-hour retention policy**, so the database size stays capped.
- Alerts are stored in a separate `alerts` table.

---

## API reference

### Socket.IO events (server to dashboard)

| Event | Frequency | Payload |
|---|---|---|
| `snapshot` | every second | `{ ts, temps: number[], status: number[] }`, index = sensor id |
| `stats` | every second | `{ msgPerSec, latencyMs, dbWritesPerSec, total, online, offline }` |
| `alerts` | at most once per second, only when something happened | array of `{ id, sensorId, zone, type, value, ts }` |

Status codes in `snapshot`: `0` ok, `1` warning, `2` overheat, `3` offline.

`dbWritesPerSec` is roughly one fifth of `msgPerSec` on purpose (see storage design).

### REST

| Endpoint | Description |
|---|---|
| `GET /alerts?limit=50` | Latest alerts from the database, newest first (max 500) |
| `GET /sensors/:id/history?minutes=5` | Stored readings for one sensor (max 60 minutes, one point per 5 s) |
| `POST /control` | Send a command to the simulator (table above) |

---

## Measured results

Measured on a single laptop, with the simulator, broker, database and backend all running on it.

| Test | Result |
|---|---|
| Ingestion at 10,000 sensors | about 10,000 messages/s sustained, no sensors dropped |
| Latency at 1,000 sensors | 22-51 ms end to end |
| Early warning (heatwave test) | `rapid_rise` fired about 15 s before `overheat` |
| Database growth at 10,000 sensors | about 98 KB/s (2,000 stored rows/s), capped by retention |
| Batch write at 1,000 sensors | 200 rows per flush in about 13 ms |

Latency at 10,000 sensors is not quoted: the simulator stamps each batch once, so that figure includes the simulator's own publishing time.

---

## Development without Docker

Run only the infrastructure in Docker, and the apps on your machine:

```bash
docker compose up -d mosquitto db      # broker and database

# backend
cd sapper-backend
bun install
bun run start:dev                      # http://localhost:3001

# simulator
cd sensor-sim
cargo run --release -- 1000            # number of sensors

# dashboard
cd frontend
npm install
npm run dev                            # http://localhost:3000
```

Configuration (environment variables, defaults in brackets):

| Variable | Used by | Meaning |
|---|---|---|
| `MQTT_URL` | backend | Broker address (`mqtt://localhost:1883`) |
| `PG_HOST`, `PG_PORT`, `PG_PASSWORD` | backend | Database connection (`localhost`, `5432`, `heatguard`) |
| `MQTT_HOST` | simulator | Broker host (`localhost`) |
| `NEXT_PUBLIC_API_URL` | dashboard | Backend address as seen from the browser (`http://localhost:3001`). Set at build time |

Inside Docker, services reach each other by service name (`mosquitto`, `db`). The dashboard's JavaScript runs in your browser, so it always uses `localhost:3001`.

---

## Project layout

```
sapper/
├── docker-compose.yml        # the whole system in one command
├── mosquitto/                # broker config
├── sapper-backend/           # NestJS: ingest, detection, Socket.IO, REST, DB writer
│   └── src/db/init.sql       # tables, hypertable, retention policy
├── sensor-sim/               # Rust sensor simulator
└── frontend/                 # Next.js dashboard
```

---

## Troubleshooting

- **`port is already allocated`:** something else is using 1883, 3000, 3001 or 5432. Check with `ss -ltnp | grep -E '1883|3000|3001|5432'`.
- **Backend logs `0 messages/sec`:** the simulator isn't publishing, or another simulator with the same MQTT client id (`sensor-simulator`) is running on your machine and the two keep kicking each other off. Check with `pgrep -a sensor-sim`.
- **Changed `init.sql` but nothing happened:** the script only runs when the database is first created. Run `docker compose down -v` to recreate it (this deletes the data).
- **`flush failed: getaddrinfo ENOTFOUND db` in the backend log:** Docker's internal DNS is misbehaving. Try `docker compose down && sudo systemctl restart docker && docker compose up -d`.
- **Dashboard shows nothing:** open the browser console. `ERR_CONNECTION_REFUSED` on port 3001 means the backend isn't running or `NEXT_PUBLIC_API_URL` is wrong (rebuild the frontend after changing it).

---

## Known limitations

This is a hackathon project.

- **No authentication.** Anyone who can reach the backend can call `/control`, and the MQTT broker allows anonymous connections. Don't expose it to the internet as is.
- **Simulated sensors only.** Replacing the simulator with real devices publishing to `sensors/<id>/temp` should work unchanged, but we haven't tried it.
- **In-memory live state.** Restarting the backend forgets sensor state until readings arrive again.
- Zone-neighbor anomaly detection is reserved in the alert type but not implemented.

---

## What's next

- Anomaly detection against zone neighbors
- Authentication for `/control` and the MQTT broker
- Telegram or email notifications, alert acknowledgment
- Compression and downsampled long-term history
- Real hardware (for example ESP32 boards) instead of the simulator

---

## Team

- [Name]: backend, simulator, infrastructure
- [Name]: dashboard

Built for [IceHacks].

## License

[Add a license, for example MIT, or remove this section.]