import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class LokiLoggerService implements LoggerService {
  private lokiUrl: string;

  constructor() {
    this.lokiUrl =
      process.env.LOKI_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'http://loki:3100'
        : 'http://localhost:3100');
  }

  log(message: any, ...optionalParams: any[]) {
    this.sendToLoki('INFO', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.sendToLoki('ERROR', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.sendToLoki('WARN', message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.sendToLoki('DEBUG', message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.sendToLoki('DEBUG', message, optionalParams);
  }

  public sendToLoki(
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    msg: string,
    meta?: any,
  ) {
    const timestampNano = `${Date.now()}000000`;
    const metaObj = meta && typeof meta[0] === 'object' ? meta[0] : {};

    const logPayload = {
      time: new Date().toISOString(),
      level,
      msg,
      ...metaObj,
    };

    const line = JSON.stringify(logPayload);

    // Stdout console output
    const color =
      level === 'ERROR'
        ? '\x1b[31m'
        : level === 'WARN'
        ? '\x1b[33m'
        : '\x1b[32m';
    console.log(
      `${color}[${level}]\x1b[0m [order-service] ${msg} ${
        Object.keys(metaObj).length ? JSON.stringify(metaObj) : ''
      }`,
    );

    if (this.lokiUrl === 'none' || this.lokiUrl === 'disabled') {
      return;
    }

    const payload = {
      streams: [
        {
          stream: {
            service_name: 'order-service',
            level,
          },
          values: [[timestampNano, line]],
        },
      ],
    };

    fetch(`${this.lokiUrl}/loki/api/v1/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Non-blocking fire-and-forget
    });
  }
}
