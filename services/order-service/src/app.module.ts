import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthModule } from './health/health.module';
import { PromoModule } from './promo/promo.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { TelemetryMiddleware } from './common/middleware/telemetry.middleware';
import { LokiLoggerService } from './common/logger/loki-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    MetricsModule,
    HealthModule,
    PromoModule,
    CartModule,
    OrdersModule,
    RabbitmqModule,
  ],
  providers: [LokiLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TelemetryMiddleware).forRoutes('*');
  }
}
