import { describe, it, expect } from "bun:test";
import { OrdersService } from "./orders.service";

describe("OrdersService Unit Test", () => {
  it("should calculate order total and discount accurately", async () => {
    const mockOrderRepo = {
      create: (entity: any) => entity,
      save: async (entity: any) => entity,
    };
    const mockOrderItemRepo = {
      create: (item: any) => item,
    };
    const mockPromoService = {
      getByCode: async (code: string) => ({
        code: "DISKON10",
        discount_type: "PERCENTAGE",
        discount_value: 10,
        min_purchase: 10000,
        max_discount: 50000,
        quota: 10,
        valid_until: new Date(Date.now() + 86400000),
      }),
    };

    const service = new OrdersService(
      mockOrderRepo as any,
      mockOrderItemRepo as any,
      mockPromoService as any
    );

    const order = await service.createOrder(
      {
        user_id: "user-123",
        items: [
          {
            product_id: "prod-1",
            product_name: "T-Shirt",
            quantity: 2,
            unit_price: 50000,
          },
        ],
        promo_code: "DISKON10",
      },
      "user-123"
    );

    // Subtotal: 2 * 50,000 = 100,000
    // Discount: 10% of 100,000 = 10,000
    // Total: 90,000
    expect(order.subtotal_amount).toBe(100000);
    expect(order.discount_amount).toBe(10000);
    expect(order.total_amount).toBe(90000);
    expect(order.status).toBe("PENDING_PAYMENT");
  });

  it("should throw BadRequestException if items are empty", async () => {
    const service = new OrdersService({} as any, {} as any, {} as any);
    expect(
      service.createOrder({ user_id: "user-123", items: [] })
    ).rejects.toThrow("User ID and at least one item are required");
  });
});
