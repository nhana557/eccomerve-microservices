import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PromoService } from '../promo/promo.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    private readonly promoService: PromoService,
  ) {}

  async createOrder(dto: CreateOrderDto, headerUserId?: string): Promise<OrderEntity> {
    const userId = (dto.user_id || headerUserId || '').trim();
    if (!userId || !dto.items || dto.items.length === 0) {
      throw new BadRequestException('User ID and at least one item are required');
    }

    let subtotalAmount = 0;
    const orderItems: OrderItemEntity[] = [];

    for (const it of dto.items) {
      const qty = Number(it.quantity);
      const price = Number(it.unit_price);
      if (qty <= 0 || price <= 0) {
        throw new BadRequestException('Quantity and unit price must be greater than zero');
      }

      const itemSubtotal = qty * price;
      subtotalAmount += itemSubtotal;

      const item = this.orderItemRepo.create({
        id: uuidv4(),
        product_id: it.product_id,
        product_name: it.product_name || 'Product',
        quantity: qty,
        unit_price: price,
        subtotal: itemSubtotal,
      });
      orderItems.push(item);
    }

    let discountAmount = 0;
    const promoCode = (dto.promo_code || '').trim().toUpperCase();

    if (promoCode) {
      try {
        const promo = await this.promoService.getByCode(promoCode);
        if (promo) {
          const now = new Date();
          if (now <= promo.valid_until && promo.quota > 0 && subtotalAmount >= Number(promo.min_purchase)) {
            if (promo.discount_type === 'PERCENTAGE') {
              discountAmount = Math.floor((subtotalAmount * Number(promo.discount_value)) / 100);
              if (promo.max_discount > 0 && discountAmount > Number(promo.max_discount)) {
                discountAmount = Number(promo.max_discount);
              }
            } else {
              discountAmount = Number(promo.discount_value);
            }
          }
        }
      } catch {
        // Ignore promo calculation error and continue with 0 discount
      }
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount);

    const order = this.orderRepo.create({
      id: uuidv4(),
      user_id: userId,
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      promo_code: promoCode || undefined,
      total_amount: totalAmount,
      status: 'PENDING_PAYMENT',
      shipping_address: dto.shipping_address,
      items: orderItems,
    });

    return this.orderRepo.save(order);
  }

  async getOrderById(id: string): Promise<OrderEntity> {
    if (!id || !id.trim()) {
      throw new BadRequestException('Order ID is required');
    }

    const order = await this.orderRepo.findOne({
      where: { id: id.trim() },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async listOrders(userId?: string, limit = 10, offset = 0) {
    const take = limit > 0 ? limit : 10;
    const skip = offset >= 0 ? offset : 0;

    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.created_at', 'DESC')
      .take(take)
      .skip(skip);

    if (userId && userId.trim()) {
      query.where('order.user_id = :userId', { userId: userId.trim() });
    }

    const [orders, total] = await query.getManyAndCount();

    return {
      orders,
      total,
    };
  }

  async updateOrderStatus(id: string, status: string) {
    if (!id || !id.trim()) {
      throw new BadRequestException('Order ID is required');
    }
    if (!status || !status.trim()) {
      throw new BadRequestException('Status is required');
    }

    const order = await this.getOrderById(id);
    order.status = status.trim().toUpperCase();
    await this.orderRepo.save(order);

    return {
      message: 'Order status updated successfully',
      status: order.status,
    };
  }

  async deleteOrder(id: string) {
    if (!id || !id.trim()) {
      throw new BadRequestException('Order ID is required');
    }

    await this.orderRepo.delete({ id: id.trim() });
    return {
      message: 'Order deleted successfully',
    };
  }
}
