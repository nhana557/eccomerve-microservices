import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LokiLoggerService } from './common/logger/loki-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const lokiLogger = app.get(LokiLoggerService);
  app.useLogger(lokiLogger);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 8083;
  await app.listen(port);

  lokiLogger.log(`Order Service (NestJS) running on http://localhost:${port}`);
}
bootstrap();
