import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentConsumerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PaymentConsumerService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private isConnecting = false;

  constructor(private readonly ordersService: OrdersService) {}

  async onApplicationBootstrap() {
    this.startConsumer();
  }

  async onApplicationShutdown() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // Ignore closing errors on shutdown
    }
  }

  private async startConsumer() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    const amqpUrl =
      process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672/';

    try {
      this.connection = await amqp.connect(amqpUrl);
      this.channel = await this.connection.createChannel();

      const exchange = 'ecommerce.events';
      const queue = 'order.payment-completed';
      const routingKey = 'payment.completed';

      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey);

      this.logger.log(
        `RabbitMQ payment consumer connected to queue: ${queue} on exchange: ${exchange}`,
      );

      this.channel.consume(
        queue,
        async (msg) => {
          if (!msg) return;

          try {
            const content = msg.content.toString();
            const payload = JSON.parse(content);
            const orderId = payload?.data?.order_id;

            if (orderId) {
              await this.ordersService.updateOrderStatus(orderId, 'PAID');
              this.logger.log(
                `Status order ${orderId} berhasil diubah menjadi PAID via RabbitMQ event`,
              );
            }

            this.channel?.ack(msg);
          } catch (err: any) {
            this.logger.error(
              `Gagal memproses event pembayaran: ${err?.message}`,
            );
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.connection.on('error', (err) => {
        this.logger.warn(`RabbitMQ connection error: ${err.message}`);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, attempting reconnect in 5s...');
        this.connection = null;
        this.channel = null;
        this.isConnecting = false;
        setTimeout(() => this.startConsumer(), 5000);
      });
    } catch (err: any) {
      this.logger.warn(
        `RabbitMQ not ready yet (${err.message}), retrying in 5s...`,
      );
      this.isConnecting = false;
      setTimeout(() => this.startConsumer(), 5000);
    }
  }
}
