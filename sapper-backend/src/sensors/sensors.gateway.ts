import { OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SensorsService } from './sensors.service.js';

@WebSocketGateway({ cors: { origin: '*' } })
export class SensorsGateway implements OnModuleInit {
  @WebSocketServer() server: Server;

  constructor(private sensors: SensorsService) {}

  onModuleInit() {
    // every new alert goes straight to all dashboards
    this.sensors.alerts$.subscribe((batch) => this.server.emit('alerts', batch));

    // once per second: full snapshot and stats
    setInterval(() => {
      this.server.emit('snapshot', this.sensors.snapshot());
      this.server.emit('stats', this.sensors.stats());
    }, 1000);
  }
}