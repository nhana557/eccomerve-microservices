import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { bigintTransformer } from '../../common/transformers/bigint.transformer';

@Entity('promos')
export class PromoEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Index('idx_promos_code', { unique: true })
  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  code: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  title: string;

  @Column({ name: 'discount_type', type: 'varchar', length: 20, nullable: false })
  discount_type: 'PERCENTAGE' | 'FIXED';

  @Column({
    name: 'discount_value',
    type: 'bigint',
    nullable: false,
    transformer: bigintTransformer,
  })
  discount_value: number;

  @Column({
    name: 'min_purchase',
    type: 'bigint',
    nullable: false,
    transformer: bigintTransformer,
  })
  min_purchase: number;

  @Column({
    name: 'max_discount',
    type: 'bigint',
    nullable: false,
    transformer: bigintTransformer,
  })
  max_discount: number;

  @Column({
    type: 'bigint',
    nullable: false,
    transformer: bigintTransformer,
  })
  quota: number;

  @Column({ name: 'valid_until', type: 'timestamp with time zone', nullable: false })
  valid_until: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
