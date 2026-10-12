import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  type Relation,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import type { CartEntity } from './cart.entity';
import { bigintTransformer } from '../../common/transformers/bigint.transformer';

@Entity('cart_items')
export class CartItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Index('idx_cart_items_cart_id')
  @Column({ name: 'cart_id', type: 'varchar', length: 36, nullable: false })
  cart_id: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36, nullable: false })
  product_id: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255, nullable: false })
  product_name: string;

  @Column({
    name: 'unit_price',
    type: 'bigint',
    nullable: false,
    transformer: bigintTransformer,
  })
  unit_price: number;

  @Column({
    type: 'bigint',
    default: 1,
    nullable: false,
    transformer: bigintTransformer,
  })
  quantity: number;

  @Column({ type: 'boolean', default: true, nullable: false })
  selected: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at: Date;

  @ManyToOne('CartEntity', 'items', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart: Relation<CartEntity>;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
