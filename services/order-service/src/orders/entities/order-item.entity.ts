import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  type Relation,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import type { OrderEntity } from './order.entity';
import { bigintTransformer } from '../../common/transformers/bigint.transformer';

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Index('idx_order_items_order_id')
  @Column({ name: 'order_id', type: 'varchar', length: 36, nullable: false })
  order_id: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36, nullable: false })
  product_id: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255, nullable: true })
  product_name: string;

  @Column({ type: 'int', nullable: false })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'bigint',
    nullable: false,
    transformer: bigintTransformer,
  })
  unit_price: number;

  @Column({
    type: 'bigint',
    default: 0,
    transformer: bigintTransformer,
  })
  subtotal: number;

  @ManyToOne('OrderEntity', 'items', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Relation<OrderEntity>;

  @BeforeInsert()
  generateIdAndSubtotal() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.subtotal && this.unit_price && this.quantity) {
      this.subtotal = Number(this.unit_price) * Number(this.quantity);
    }
  }
}
