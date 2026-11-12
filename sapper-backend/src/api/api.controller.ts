import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IngestService } from '../ingest/ingest.service.js';
import { SensorsService } from '../sensors/sensors.service.js';
import { Pool } from 'pg';

const isInt = (n: any, min: number, max: number) =>
  Number.isInteger(n) && n >= min && n <= max;

@Controller()
export class ApiController {
  constructor(
    private ingest: IngestService,
    private sensors: SensorsService,
    @Inject('PG') private pool: Pool,
  ) {}

  @Post('control')
  control(@Body() body: any) {
    let ok = false;
    switch (body?.cmd) {
      case 'heatwave':
        ok =
          isInt(body.zone, 0, 9) &&
          typeof body.delta === 'number' &&
          body.delta >= -50 &&
          body.delta <= 100;
        break;
      case 'kill':
        ok = isInt(body.count, 0, 50000);
        break;
      case 'scale':
        ok = isInt(body.count, 1, 50000);
        break;
      case 'revive':
      case 'reset':
        ok = true;
        break;
    }
    if (!ok) throw new BadRequestException('invalid command');

    if (body.cmd === 'scale') this.sensors.trim(body.count);

    this.ingest.publish('control/command', JSON.stringify(body));
    return { ok: true };
  }
  @Get('alerts')
  async alerts(@Query('limit') limit = '50') {
    const n = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const { rows } = await this.pool.query(
      `SELECT id, sensor_id, zone, type, value,
              (extract(epoch from ts) * 1000)::float8 AS ts
       FROM alerts ORDER BY ts DESC LIMIT $1`,
      [n],
    );
    return rows.map((r) => ({
      id: String(r.id),
      sensorId: r.sensor_id,
      zone: r.zone,
      type: r.type,
      value: r.value,
      ts: r.ts,
    }));
  }

  @Get('sensors/:id/history')
  async history(@Param('id') id: string, @Query('minutes') minutes = '5') {
    const sensorId = parseInt(id);
    if (Number.isNaN(sensorId)) throw new BadRequestException('bad id');
    const m = Math.min(Math.max(parseInt(minutes) || 5, 1), 60);
    const { rows } = await this.pool.query(
      `SELECT (extract(epoch from ts) * 1000)::float8 AS ts, temp
       FROM readings
       WHERE sensor_id = $1 AND ts > now() - make_interval(mins => $2::int)
       ORDER BY ts`,
      [sensorId, m],
    );
    return rows;
  }
}
