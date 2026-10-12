import { expect, test, describe } from "bun:test";
import { calculateDiscountAmount } from "./utils/promo-helpers";

describe("Promo Calculation Logic", () => {
  test("calculates percentage discount bounded by maxDiscount", () => {
    const discount = calculateDiscountAmount(1000000, {
      discount_type: "PERCENTAGE",
      discount_value: 20,
      max_discount: 150000,
      min_purchase: 200000,
    });
    expect(discount).toBe(150000);
  });

  test("returns 0 if subtotal below min_purchase", () => {
    const discount = calculateDiscountAmount(100000, {
      discount_type: "PERCENTAGE",
      discount_value: 20,
      max_discount: 150000,
      min_purchase: 200000,
    });
    expect(discount).toBe(0);
  });

  test("calculates fixed discount accurately", () => {
    const discount = calculateDiscountAmount(150000, {
      discount_type: "FIXED",
      discount_value: 50000,
      max_discount: 50000,
      min_purchase: 100000,
    });
    expect(discount).toBe(50000);
  });
});
