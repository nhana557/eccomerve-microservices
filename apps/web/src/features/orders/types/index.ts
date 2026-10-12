export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  promo_code?: string;
  discount_amount?: number;
  final_amount?: number;
  status: "PENDING_PAYMENT" | "PENDING" | "PAID" | "SHIPPED" | "CANCELLED";
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  user_id: string;
  promo_code?: string;
  discount_amount?: number;
  final_amount?: number;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
}
