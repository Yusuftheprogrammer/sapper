# 🛡️ HeatGuard Dashboard

> **Realtime Thermal Surveillance Matrix for 1,000 to 10,000+ IoT Heat Sensors**  
> Built with **Next.js (App Router, TypeScript, Tailwind CSS)**, **Socket.IO (Port 3001)**, and **HTML5 Canvas 60fps Rendering Engine**.

---

## ⚡ Core Architecture & Performance Design

- **Decoupled High-Frequency Data Loop**:
  - The live snapshot stream (1,000 - 10,000 nodes arriving every 1s) is held inside a React `useRef` store.
  - Zero React DOM element overhead: **HTML5 Canvas** draws the entire matrix at 60 FPS using `requestAnimationFrame`.
  - Hover detection and sensor picking runs in pure $O(1)$ coordinate math.
- **Micro-batching & Event Stream**:
  - **`snapshot` event**: High-density temperature and state array for all nodes.
  - **`stats` event**: Throughput, latency, db writes/sec, and online/offline distribution.
  - **`alert` event**: Realtime critical and warning incident notifications.
- **Telemetry Timeseries**:
  - Interactive SVG line chart rendering 5-minute historical trendline per sensor via `GET /sensors/:id/history`.
- **Stress-Testing Simulation Controls**:
  - `POST /control` with commands: `heatwave`, `kill`, `revive`, `scale`, and `reset`.

---

## 🚀 Running the Project

### 1. Start Both Frontend and Mock Server
```bash
npm run dev:all
```

Or run them individually:
```bash
# Terminal 1: Mock Backend Server (Port 3001)
npm run mock-server

# Terminal 2: Next.js Frontend Dashboard (Port 3000)
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 REST API & Socket.IO Endpoints (Port 3001)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `WS` | `ws://localhost:3001` | Socket.IO events (`snapshot`, `stats`, `alert`) |
| `GET` | `/sensors/:id/history` | Fetches 5-minute temperature history for sensor `id` |
| `GET` | `/alerts` | Fetches recent 50 alert incidents |
| `POST` | `/control` | Sends simulation commands: `heatwave`, `kill`, `revive`, `scale`, `reset` |

### Sensor Status Codes:
- `0`: 🟢 **Normal** (< 55°C)
- `1`: 🟡 **Warning** (55°C - 74°C)
- `2`: 🔴 **Critical Hazard** (≥ 75°C - Pulsing Alert)
- `3`: ⚪ **Offline** (Disconnected)

**Zone Allocation**: `region = id % 10`
