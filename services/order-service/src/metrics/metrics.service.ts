import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new client.Registry();

  public readonly httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests processed',
    labelNames: ['service', 'method', 'path', 'status_code'],
    registers: [this.registry],
  });

  public readonly httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['service', 'method', 'path'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 8, 12, 15, 30],
    registers: [this.registry],
  });

  public readonly httpRequestsInFlight = new client.Gauge({
    name: 'http_requests_in_flight',
    help: 'Current number of HTTP requests being handled',
    labelNames: ['service'],
    registers: [this.registry],
  });

  public readonly slowRequestsTotal = new client.Counter({
    name: 'http_slow_requests_total',
    help: 'Total HTTP requests exceeding latency thresholds (warning >5s, critical >8s)',
    labelNames: ['service', 'method', 'path', 'severity'],
    registers: [this.registry],
  });

  public readonly slowQueriesTotal = new client.Counter({
    name: 'db_slow_queries_total',
    help: 'Total database queries exceeding latency thresholds (warning >5s, critical >8s)',
    labelNames: ['service', 'severity'],
    registers: [this.registry],
  });

  onModuleInit() {
    client.collectDefaultMetrics({ register: this.registry });
    this.httpRequestsInFlight.labels('order-service').set(0);
  }

  public normalizePath(path: string): string {
    if (path === '/metrics' || path === '/health' || path === '/api/v1/health') {
      return path;
    }
    return path.replace(/\/[0-9a-fA-F-]{8,}|\/\d+/g, '/:id');
  }

  public recordRequest(
    method: string,
    path: string,
    statusCode: number,
    durationSec: number,
  ) {
    const norm = this.normalizePath(path);
    const status = statusCode.toString();
    this.httpRequestsTotal.labels('order-service', method, norm, status).inc();
    this.httpRequestDuration.labels('order-service', method, norm).observe(durationSec);

    if (durationSec >= 8) {
      this.slowRequestsTotal.labels('order-service', method, norm, 'critical').inc();
    } else if (durationSec >= 5) {
      this.slowRequestsTotal.labels('order-service', method, norm, 'warning').inc();
    }
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
