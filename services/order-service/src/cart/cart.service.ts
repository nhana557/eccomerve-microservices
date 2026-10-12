import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CartEntity } from './entities/cart.entity';
import { CartItemEntity } from './entities/cart-item.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepo: Repository<CartItemEntity>,
  ) {}

  async getOrCreateCart(userId: string): Promise<CartEntity> {
    const cleanUserId = userId || 'guest-user-default';
    let cart = await this.cartRepo.findOne({
      where: { user_id: cleanUserId },
      relations: ['items'],
    });

    if (!cart) {
      cart = this.cartRepo.create({
        id: uuidv4(),
        user_id: cleanUserId,
        items: [],
      });
      cart = await this.cartRepo.save(cart);
    }

    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    let subtotal = 0;
    if (cart.items && cart.items.length > 0) {
      for (const it of cart.items) {
        if (it.selected) {
          subtotal += Number(it.unit_price) * Number(it.quantity);
        }
      }
    }

    return {
      cart,
      subtotal,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    if (!dto.product_id || !dto.quantity || dto.quantity <= 0) {
      throw new BadRequestException('ProductID dan quantity > 0 wajib diisi');
    }

    const cart = await this.getOrCreateCart(userId);

    let existingItem = await this.cartItemRepo.findOne({
      where: { cart_id: cart.id, product_id: dto.product_id },
    });

    if (existingItem) {
      existingItem.quantity = Number(existingItem.quantity) + Number(dto.quantity);
      if (dto.unit_price > 0) {
        existingItem.unit_price = Number(dto.unit_price);
      }
      if (dto.product_name) {
        existingItem.product_name = dto.product_name;
      }
      await this.cartItemRepo.save(existingItem);
    } else {
      const newItem = this.cartItemRepo.create({
        id: uuidv4(),
        cart_id: cart.id,
        product_id: dto.product_id,
        product_name: dto.product_name || 'Product',
        unit_price: Number(dto.unit_price) || 0,
        quantity: Number(dto.quantity) || 1,
        selected: true,
      });
      await this.cartItemRepo.save(newItem);
    }

    const updatedCart = await this.cartRepo.findOne({
      where: { id: cart.id },
      relations: ['items'],
    });

    return { cart: updatedCart };
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);

    if (quantity <= 0) {
      return this.deleteItem(userId, itemId);
    }

    await this.cartItemRepo.update(
      { id: itemId, cart_id: cart.id },
      { quantity: Number(quantity) },
    );

    const updatedCart = await this.cartRepo.findOne({
      where: { id: cart.id },
      relations: ['items'],
    });

    return { cart: updatedCart };
  }

  async deleteItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);

    await this.cartItemRepo.delete({ id: itemId, cart_id: cart.id });

    const updatedCart = await this.cartRepo.findOne({
      where: { id: cart.id },
      relations: ['items'],
    });

    return { cart: updatedCart };
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepo.delete({ cart_id: cart.id });
    return { message: 'Keranjang berhasil dikosongkan' };
  }
}
