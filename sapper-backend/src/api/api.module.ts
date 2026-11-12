import { Module } from '@nestjs/common';
import { IngestModule } from '../ingest/ingest.module.js';
import { SensorsModule } from '../sensors/sensors.module.js';
import { ApiController } from './api.controller.js';

@Module({
  imports: [IngestModule, SensorsModule],
  controllers: [ApiController],
})
export class ApiModule {}