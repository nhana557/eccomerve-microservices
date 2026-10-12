import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderItemEntity } from './order-item.entity';
import { bigintTransformer } from '../../common/transformers/bigint.transformer';

export { bigintTransformer };

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Index('idx_orders_user_id')
  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: false })
  user_id: string;

  @Column({
    name: 'subtotal_amount',
    type: 'bigint',
    default: 0,
    transformer: bigintTransformer,
  })
  subtotal_amount: number;

  @Column({
    name: 'discount_amount',
    type: 'bigint',
    default: 0,
    transformer: bigintTransformer,
  })
  discount_amount: number;

  @Column({ name: 'promo_code', type: 'varchar', length: 50, nullable: true })
  promo_code?: string;

  @Column({
    name: 'total_amount',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  total_amount: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'PENDING_PAYMENT',
  })
  status: string;

  @Column({ name: 'shipping_address', type: 'text', nullable: true })
  shipping_address?: string;

  @OneToMany(() => OrderItemEntity, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.status) {
      this.status = 'PENDING_PAYMENT';
    }
  }
}
