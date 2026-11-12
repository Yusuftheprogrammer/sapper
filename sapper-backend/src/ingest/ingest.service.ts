import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { SensorsService } from '../sensors/sensors.service.js';

@Injectable()
export class IngestService implements OnModuleInit {
  constructor(private sensors: SensorsService) {}

  private log = new Logger('Ingest');
  private client: mqtt.MqttClient;
  private count = 0;

  onModuleInit() {
    this.client = mqtt.connect(process.env.MQTT_URL ?? 'mqtt://localhost:1883');

    this.client.on('connect', () => {
      this.log.log('Connected successfully to the broker!');
      this.client.subscribe('sensors/+/temp');
    });

    this.client.on('message', (topic, payload) => {
      this.count++;
      const id = Number(topic.split('/')[1]);

      try {
        const { temp, zone, ts } = JSON.parse(payload.toString());
        this.sensors.update(id, zone, temp, ts);
      } catch {
        // ignore malformed messages
      }
    });

    setInterval(() => {
      this.log.log(`${this.count} messages/sec`);
      this.count = 0;
    }, 1000);
  }

  publish(topic: string, message: string) {
    this.client.publish(topic, message, { qos: 1 });
  }
}
