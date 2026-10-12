import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    return this.ordersService.createOrder(dto, headerUserId);
  }

  @Get()
  async getOrders(
    @Query('id') id?: string,
    @Query('user_id') queryUserId?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    // If id is provided in query parameter, return single order detail
    if (id && id.trim()) {
      return this.ordersService.getOrderById(id.trim());
    }

    const userId = queryUserId || headerUserId;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    return this.ordersService.listOrders(userId, limit, offset);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Put(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto.status);
  }

  @Delete(':id')
  async deleteOrder(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }
}
