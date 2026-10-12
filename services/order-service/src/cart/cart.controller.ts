import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('api/v1/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private extractUserId(headers: Record<string, any>, query: Record<string, any>): string {
    return headers['x-user-id'] || query['user_id'] || 'guest-user-default';
  }

  @Get()
  async getCart(
    @Headers() headers: Record<string, any>,
    @Query() query: Record<string, any>,
  ) {
    const userId = this.extractUserId(headers, query);
    return this.cartService.getCart(userId);
  }

  @Delete()
  async clearCart(
    @Headers() headers: Record<string, any>,
    @Query() query: Record<string, any>,
  ) {
    const userId = this.extractUserId(headers, query);
    return this.cartService.clearCart(userId);
  }

  @Post('items')
  async addItem(
    @Headers() headers: Record<string, any>,
    @Query() query: Record<string, any>,
    @Body() dto: AddCartItemDto,
  ) {
    const userId = this.extractUserId(headers, query);
    return this.cartService.addItem(userId, dto);
  }

  @Put('items/:id')
  async updateItem(
    @Headers() headers: Record<string, any>,
    @Query() query: Record<string, any>,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = this.extractUserId(headers, query);
    return this.cartService.updateItemQuantity(userId, itemId, dto.quantity);
  }

  @Delete('items/:id')
  async deleteItem(
    @Headers() headers: Record<string, any>,
    @Query() query: Record<string, any>,
    @Param('id') itemId: string,
  ) {
    const userId = this.extractUserId(headers, query);
    return this.cartService.deleteItem(userId, itemId);
  }
}
