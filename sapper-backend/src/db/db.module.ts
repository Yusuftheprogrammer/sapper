import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { DbWriter } from './db.writer.js';

@Global()
@Module({
  providers: [
    {
      provide: 'PG',
      useFactory: () => {
        const pool = new Pool({
          host: process.env.PG_HOST ?? 'localhost',
          port: Number(process.env.PG_PORT ?? 5432),
          user: 'postgres',
          password: process.env.PG_PASSWORD ?? 'heatguard',
          database: 'postgres',
          max: 5,
        });
        pool.on('error', (e) => console.error('pg pool error', e.message));
        return pool;
      },
    },
    DbWriter,
  ],
  exports: ['PG', DbWriter],
})
export class DbModule {}
