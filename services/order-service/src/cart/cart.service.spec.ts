import { describe, it, expect } from "bun:test";
import { CartService } from "./cart.service";

describe("CartService Unit Test", () => {
  it("should calculate cart subtotal from selected items", async () => {
    const mockCart = {
      id: "cart-123",
      user_id: "user-abc",
      items: [
        {
          id: "item-1",
          product_id: "prod-1",
          unit_price: 25000,
          quantity: 2,
          selected: true,
        },
        {
          id: "item-2",
          product_id: "prod-2",
          unit_price: 100000,
          quantity: 1,
          selected: false, // not selected
        },
      ],
    };

    const mockCartRepo = {
      findOne: async () => mockCart,
    };
    const mockCartItemRepo = {};

    const service = new CartService(mockCartRepo as any, mockCartItemRepo as any);
    const result = await service.getCart("user-abc");

    // Only item-1 is selected: 25,000 * 2 = 50,000
    expect(result.subtotal).toBe(50000);
    expect(result.cart.items.length).toBe(2);
  });
});
