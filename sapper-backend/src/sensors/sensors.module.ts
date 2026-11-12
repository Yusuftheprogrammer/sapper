import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service.js';
import { SensorsGateway } from './sensors.gateway.js';

@Module({
  providers: [SensorsService, SensorsGateway],
   exports: [SensorsService],
})
export class SensorsModule {}
