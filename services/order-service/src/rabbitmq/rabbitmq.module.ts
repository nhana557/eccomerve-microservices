import { Module } from '@nestjs/common';
import { PaymentConsumerService } from './payment-consumer.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  providers: [PaymentConsumerService],
})
export class RabbitmqModule {}
