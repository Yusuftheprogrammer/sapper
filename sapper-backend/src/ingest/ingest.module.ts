import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service.js';
import { SensorsModule } from '../sensors/sensors.module.js';

@Module({
  imports: [SensorsModule],
  providers: [IngestService],
  exports: [IngestService]
})
export class IngestModule {}
