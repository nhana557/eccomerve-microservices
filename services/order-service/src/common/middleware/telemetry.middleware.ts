import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../../metrics/metrics.service';
import { LokiLoggerService } from '../logger/loki-logger.service';

@Injectable()
export class TelemetryMiddleware implements NestMiddleware {
  private alloyUrl: string;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: LokiLoggerService,
  ) {
    this.alloyUrl =
      process.env.ALLOY_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'http://alloy:4318'
        : 'http://localhost:4318');
  }

  use(req: Request, res: Response, next: NextFunction) {
    const rawPath = req.baseUrl || req.path;
    if (
      rawPath === '/metrics' ||
      rawPath === '/health' ||
      rawPath === '/api/v1/health'
    ) {
      return next();
    }

    const start = process.hrtime();
    const serviceName = 'order-service';

    // Parse W3C traceparent (format: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01)
    const traceparent = (req.headers['traceparent'] as string) || '';
    let traceId = '';
    let parentSpanId = '';
    if (traceparent.startsWith('00-')) {
      const parts = traceparent.split('-');
      if (parts.length >= 4) {
        traceId = parts[1];
        parentSpanId = parts[2];
      }
    }

    // Fallback traceId if none provided
    if (!traceId) {
      traceId = Math.random().toString(16).substring(2, 10).padStart(32, '0');
    }
    const spanId = Math.random().toString(16).substring(2, 10).padStart(16, '0');

    this.metricsService.httpRequestsInFlight.labels(serviceName).inc();

    res.on('finish', () => {
      this.metricsService.httpRequestsInFlight.labels(serviceName).dec();
      const diff = process.hrtime(start);
      const durationSec = diff[0] + diff[1] / 1e9;
      const durationMs = Math.round(durationSec * 1000);
      const statusCode = res.statusCode;
      const fullUrl = req.originalUrl || req.url;
      const cfRay = (req.headers['cf-ray'] as string) || '';
      const clientIp =
        (req.headers['cf-connecting-ip'] as string) ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        '127.0.0.1';
      const clientLocation =
        (req.headers['cf-ipcountry'] as string) ||
        (req.headers['x-client-location'] as string) ||
        'Indonesia';

      this.metricsService.recordRequest(
        req.method,
        rawPath,
        statusCode,
        durationSec,
      );

      const logAttrs: Record<string, any> = {
        statusCode,
        method: req.method,
        fullUrl,
        client_ip: clientIp,
        client_location: clientLocation,
        trace_id: traceId,
        span_id: spanId,
      };
      if (cfRay) {
        logAttrs.cf_ray = cfRay;
      }

      const outMsg = `Completed: ${req.method} ${fullUrl} - ${statusCode} (${durationMs}ms)`;

      if (durationSec >= 8) {
        const slowMsg = `[SLOW API CRITICAL > 8s] ${outMsg}`;
        this.logger.error(slowMsg, logAttrs);
      } else if (durationSec >= 5) {
        const slowMsg = `[SLOW API WARNING > 5s] ${outMsg}`;
        this.logger.warn(slowMsg, logAttrs);
      } else if (statusCode >= 500) {
        this.logger.error(outMsg, logAttrs);
      } else if (statusCode >= 400) {
        this.logger.warn(outMsg, logAttrs);
      } else {
        this.logger.log(outMsg, logAttrs);
      }

      // Export OTLP trace span to Alloy asynchronously
      this.exportSpanToAlloy({
        traceId,
        spanId,
        parentSpanId,
        name: `${req.method} ${rawPath}`,
        durationMs,
        statusCode,
        method: req.method,
        fullUrl,
        cfRay,
      });
    });

    next();
  }

  private exportSpanToAlloy(opts: {
    traceId: string;
    spanId: string;
    parentSpanId: string;
    name: string;
    durationMs: number;
    statusCode: number;
    method: string;
    fullUrl: string;
    cfRay?: string;
  }) {
    if (this.alloyUrl === 'none' || this.alloyUrl === 'disabled') return;

    const startTimeNano = `${Date.now() - opts.durationMs}000000`;
    const endTimeNano = `${Date.now()}000000`;

    const spanAttributes: any[] = [
      { key: 'http.method', value: { stringValue: opts.method } },
      { key: 'method', value: { stringValue: opts.method } },
      { key: 'fullUrl', value: { stringValue: opts.fullUrl } },
      { key: 'http.status_code', value: { intValue: opts.statusCode } },
      { key: 'statusCode', value: { intValue: opts.statusCode } },
      { key: 'duration_ms', value: { intValue: opts.durationMs } },
    ];
    if (opts.cfRay) {
      spanAttributes.push(
        { key: 'cloudflare.ray_id', value: { stringValue: opts.cfRay } },
        { key: 'cf_ray', value: { stringValue: opts.cfRay } },
      );
    }

    const spanPayload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'order-service' } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: 'order-service' },
              spans: [
                {
                  traceId: opts.traceId,
                  spanId: opts.spanId,
                  parentSpanId: opts.parentSpanId || undefined,
                  name: opts.name,
                  kind: 2, // SPAN_KIND_SERVER
                  startTimeUnixNano: startTimeNano,
                  endTimeUnixNano: endTimeNano,
                  attributes: spanAttributes,
                  status: {
                    code: opts.statusCode >= 500 ? 2 : 1, // 2: ERROR, 1: OK
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    fetch(`${this.alloyUrl}/v1/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spanPayload),
    }).catch(() => {
      // Non-blocking fire-and-forget
    });
  }
}
