import { expect, test, describe } from "bun:test";
import { buildCreateOrderPayload } from "./hooks/use-orders";
import { CartItem } from "../cart/types";

const mockCart: CartItem[] = [
  {
    product: {
      id: "prod-1",
      name: "Mechanical Keyboard",
      description: "",
      price: 1250000,
      stock: 10,
      category: "Electronics",
      created_at: "",
      updated_at: "",
    },
    quantity: 2,
  },
];

describe("Orders & Checkout Logic", () => {
  test("buildCreateOrderPayload maps cart items correctly to backend order format", () => {
    const payload = buildCreateOrderPayload("user-abc", mockCart);
    expect(payload.user_id).toBe("user-abc");
    expect(payload.items.length).toBe(1);
    expect(payload.items[0].product_id).toBe("prod-1");
    expect(payload.items[0].quantity).toBe(2);
    expect(payload.items[0].unit_price).toBe(1250000);
  });

  test("buildCreateOrderPayload includes promo voucher and discounted final amount", () => {
    const payload = buildCreateOrderPayload("user-abc", mockCart, "TOKOPEDIA20", 150000, 2350000);
    expect(payload.user_id).toBe("user-abc");
    expect(payload.promo_code).toBe("TOKOPEDIA20");
    expect(payload.discount_amount).toBe(150000);
    expect(payload.final_amount).toBe(2350000);
  });
});
