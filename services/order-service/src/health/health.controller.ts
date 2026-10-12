import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  async health() {
    return this.checkHealth();
  }

  @Get('api/v1/health')
  async apiHealth() {
    return this.checkHealth();
  }

  private async checkHealth() {
    let dbStatus = 'ok';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      service: 'order-service',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
