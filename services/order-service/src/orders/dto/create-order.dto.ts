export class OrderItemDto {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
}

export class CreateOrderDto {
  user_id?: string;
  promo_code?: string;
  shipping_address?: string;
  items: OrderItemDto[];
}
