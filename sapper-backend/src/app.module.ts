import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { IngestModule } from './ingest/ingest.module.js';
import { SensorsModule } from './sensors/sensors.module.js';
import { ApiModule } from './api/api.module.js';
import { DbModule } from './db/db.module.js';

@Module({
  imports: [IngestModule, SensorsModule, ApiModule, DbModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
