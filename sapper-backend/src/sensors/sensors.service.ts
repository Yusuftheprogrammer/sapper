import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { DbWriter } from '../db/db.writer.js';

export const WARN_TEMP = 60;
export const OVERHEAT_TEMP = 70;
export const OFFLINE_AFTER_MS = 5000;
export const RISE_DELTA = 8;
export const RISE_WINDOW = 5;

export interface SensorState {
  id: number;
  zone: number;
  temp: number;
  lastseen: number;
  status: 0 | 1 | 2 | 3; // 0 ok, 1 warning, 2 overheat, 3 offline
  history: number[];
  rising: boolean;
}

export interface Alert {
  id: string;
  sensorId: number;
  zone: number;
  type: 'overheat' | 'rapid_rise' | 'anomaly' | 'offline';
  value: number;
  ts: number;
}

@Injectable()
export class SensorsService implements OnModuleInit {
  private log = new Logger('sensors');
  private sensors = new Map<number, SensorState>();

  // an "announcer": anyone can subscribe to hear every new alert
  alerts$ = new Subject<Alert[]>();
  private pendingAlerts: Alert[] = [];
  private alertSeq = 0;

  // things we collect during the current second
  private newOverheat: number[] = [];
  private newRising: number[] = [];
  private recovered: number[] = [];
  private msgCount = 0;
  private latencySum = 0;
  private latencyCount = 0;
  private maxId = -1;

  constructor(private writer: DbWriter) {}

  onModuleInit() {
    setInterval(() => this.tick(), 1000);
  }

  update(id: number, zone: number, temp: number, ts: number = Date.now()) {
    // for the stats panel
    this.msgCount++;
    this.latencySum += Date.now() - ts;
    this.latencyCount++;
    if (id > this.maxId) this.maxId = id;
    this.writer.pushReading(ts, id, temp);


    let s = this.sensors.get(id);
    if (!s) {
      s = {
        id,
        zone,
        temp,
        lastseen: Date.now(),
        status: 0,
        history: [],
        rising: false,
      };
      this.sensors.set(id, s);
    }

    s.temp = temp;
    s.lastseen = Date.now();
    s.zone = zone;

    s.history.push(temp);
    if (s.history.length > RISE_WINDOW + 1) s.history.shift();
    if (s.history.length === RISE_WINDOW + 1) {
      const rise = temp - s.history[0];
      if (rise >= RISE_DELTA && !s.rising) {
        s.rising = true;
        this.newRising.push(id); 
        this.raise('rapid_rise', s, rise);
      } else if (rise < RISE_DELTA / 2) {
        s.rising = false;
      }
    }

    const newStatus = this.statusFor(temp);
    if (newStatus !== s.status) {
      if (newStatus === 2) {
        this.newOverheat.push(id);
        this.raise('overheat', s, temp);
      } else if (s.status === 3) {
        this.recovered.push(id);
      }
      s.status = newStatus;
    }
  }

  private statusFor(temp: number): 0 | 1 | 2 {
    if (temp >= OVERHEAT_TEMP) return 2;
    if (temp >= WARN_TEMP) return 1;
    return 0;
  }

  private raise(type: Alert['type'], s: SensorState, value: number) {
    const alert: Alert = {
      id: `a${++this.alertSeq}`,
      sensorId: s.id,
      zone: s.zone,
      type,
      value,
      ts: Date.now(),
    };
    this.pendingAlerts.push(alert);
    this.writer.pushAlert(alert);
  }

  private tick() {
    const now = Date.now();
    const wentOffline: SensorState[] = [];

    for (const s of this.sensors.values()) {
      if (s.status !== 3 && now - s.lastseen > OFFLINE_AFTER_MS) {
        s.status = 3;
        s.history = [];
        s.rising = false;
        wentOffline.push(s);
        this.raise('offline', s, s.temp);
      }
    }

    if (wentOffline.length > 0) {
      const perZone = new Map<number, number>();
      for (const s of wentOffline)
        perZone.set(s.zone, (perZone.get(s.zone) ?? 0) + 1);
      const zones = [...perZone].map(([z, n]) => `z${z}:${n}`).join(' ');
      this.log.warn(
        `${wentOffline.length} OFFLINE [${zones}] ids: ${this.sample(wentOffline.map((s) => s.id))}`,
      );
    }
    if (this.newOverheat.length > 0) {
      this.log.warn(
        `${this.newOverheat.length} OVERHEAT ids: ${this.sample(this.newOverheat)}`,
      );
      this.newOverheat = [];
    }
    if (this.recovered.length > 0) {
      this.log.log(
        `${this.recovered.length} back ONLINE ids: ${this.sample(this.recovered)}`,
      );
      this.recovered = [];
    }
    if (this.newRising.length > 0) {
      this.log.warn(
        `${this.newRising.length} RAPID RISE ids: ${this.sample(this.newRising)}`,
      );
      this.newRising = [];
    }
    if (this.pendingAlerts.length > 0) {
      this.alerts$.next(this.pendingAlerts);
      this.pendingAlerts = [];
    }
  }

  private sample(ids: number[]) {
    const first = ids.slice(0, 10).join(', ');
    return ids.length > 10 ? `${first} ... +${ids.length - 10} more` : first;
  }

  // ---- what the dashboard asks for ----

  snapshot() {
    const n = this.maxId + 1;
    const temps = new Array<number>(n).fill(0);
    const status = new Array<number>(n).fill(3); // unseen = offline
    for (const s of this.sensors.values()) {
      temps[s.id] = s.temp;
      status[s.id] = s.status;
    }
    return { ts: Date.now(), temps, status };
  }

  // call once per second: it resets the counters
  stats() {
    let offline = 0;
    for (const s of this.sensors.values()) if (s.status === 3) offline++;

    const out = {
      msgPerSec: this.msgCount,
      latencyMs: this.latencyCount
        ? Math.round(this.latencySum / this.latencyCount)
        : 0,
      dbWritesPerSec: this.writer.takeWriteCount(),
      total: this.sensors.size,
      online: this.sensors.size - offline,
      offline,
    };
    this.msgCount = 0;
    this.latencySum = 0;
    this.latencyCount = 0;
    return out;
  }

  offlineIds(): number[] {
    return [...this.sensors.values()]
      .filter((s) => s.status === 3)
      .map((s) => s.id);
  }

  trim(count: number) {
    for (const id of [...this.sensors.keys()]) {
      if (id >= count) this.sensors.delete(id);
    }
    this.maxId = Math.min(this.maxId, count - 1);
  }

  get size() {
    return this.sensors.size;
  }
}
