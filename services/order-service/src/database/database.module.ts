import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { CartEntity } from '../cart/entities/cart.entity';
import { CartItemEntity } from '../cart/entities/cart-item.entity';
import { PromoEntity } from '../promo/entities/promo.entity';
import { PromoSeeder } from './seeds/promo.seeder';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '6433', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgrespassword',
        database: process.env.DB_NAME || 'order_db',
        entities: [
          OrderEntity,
          OrderItemEntity,
          CartEntity,
          CartItemEntity,
          PromoEntity,
        ],
        synchronize: false,
        ssl: process.env.DB_SSLMODE === 'require' ? true : false,
        extra: {
          max: 20,
        },
      }),
    }),
    TypeOrmModule.forFeature([PromoEntity]),
  ],
  providers: [PromoSeeder],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
