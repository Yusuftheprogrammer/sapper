import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import type { Alert } from '../sensors/sensors.service.js';

const STORE_EVERY = 5;

@Injectable()
export class DbWriter implements OnModuleInit {
  private log = new Logger('db');
  private readings: { ts: number; id: number; temp: number }[] = [];
  private alerts: Alert[] = [];
  private written = 0;
  private flushing = false;
  private recent: number[] = [];

  constructor(@Inject('PG') private pool: Pool) {}

  pushReading(ts: number, id: number, temp: number) {
    // each sensor stores on a different second, so the writes spread evenly
    if (Math.floor(ts / 1000) % STORE_EVERY !== id % STORE_EVERY) return;

    this.readings.push({ ts, id, temp });
    if (this.readings.length > 200_000) this.readings.splice(0, 50_000);
  }

  pushAlert(a: Alert) {
    this.alerts.push(a);
  }

  takeWriteCount() {
    this.recent.push(this.written);
    this.written = 0;
    if (this.recent.length > 5) this.recent.shift();
    return Math.round(
      this.recent.reduce((a, b) => a + b, 0) / this.recent.length,
    );
  }

  onModuleInit() {
    setInterval(() => this.flush(), 1000);
  }

  private async flush() {
    if (this.flushing) return; // previous flush still running
    this.flushing = true;

    const readings = this.readings; // take the buffer, start a fresh one
    this.readings = [];
    const alerts = this.alerts;
    this.alerts = [];

    try {
      if (readings.length) {
        const t0 = Date.now();
        await this.pool.query(
          `INSERT INTO readings (ts, sensor_id, temp)
           SELECT to_timestamp(t / 1000.0), s, v
           FROM unnest($1::bigint[], $2::int[], $3::real[]) AS x(t, s, v)`,
          [
            readings.map((r) => r.ts),
            readings.map((r) => r.id),
            readings.map((r) => r.temp),
          ],
        );
        this.written += readings.length;
        this.log.log(
          `flushed ${readings.length} rows in ${Date.now() - t0} ms`,
        );
      }
      if (alerts.length) {
        await this.pool.query(
          `INSERT INTO alerts (ts, sensor_id, zone, type, value)
           SELECT to_timestamp(t / 1000.0), s, z, ty, v
           FROM unnest($1::bigint[], $2::int[], $3::int[], $4::text[], $5::real[])
                AS x(t, s, z, ty, v)`,
          [
            alerts.map((a) => a.ts),
            alerts.map((a) => a.sensorId),
            alerts.map((a) => a.zone),
            alerts.map((a) => a.type),
            alerts.map((a) => a.value),
          ],
        );
      }
    } catch (e) {
      this.log.error(`flush failed: ${(e as Error).message}`);
    } finally {
      this.flushing = false;
    }
  }
}
