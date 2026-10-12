import { apiRequest } from "../../../lib/api-client";
import { Order, CreateOrderInput } from "../types";

export const orderApi = {
  getOrders: async (): Promise<Order[]> => {
    const res = await apiRequest<{ orders: Order[]; total: number }>("/api/v1/orders");
    return res.orders || [];
  },

  getOrderByID: async (id: string): Promise<Order> => {
    return apiRequest<Order>(`/api/v1/orders/${id}`);
  },

  createOrder: async (data: CreateOrderInput): Promise<Order> => {
    return apiRequest<Order>("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateOrderStatus: async (id: string, status: string): Promise<void> => {
    await apiRequest(`/api/v1/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
};
