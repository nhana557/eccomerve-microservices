import { expect, test, describe } from "bun:test";
import { calculateCartTotals, calculateFinalPrice } from "./context/CartContext";
import { CartItem } from "./types";

const mockItems: CartItem[] = [
  {
    product: {
      id: "p1",
      name: "Mechanical Keyboard",
      description: "",
      price: 1000000,
      stock: 10,
      category: "Electronics",
      created_at: "",
      updated_at: "",
    },
    quantity: 2,
  },
  {
    product: {
      id: "p2",
      name: "Desk Mat",
      description: "",
      price: 200000,
      stock: 5,
      category: "Accessories",
      created_at: "",
      updated_at: "",
    },
    quantity: 1,
  },
];

describe("Cart Calculations", () => {
  test("calculateCartTotals computes total price and item count accurately", () => {
    const { totalPrice, totalItems } = calculateCartTotals(mockItems);
    expect(totalItems).toBe(3);
    expect(totalPrice).toBe(2200000);
  });

  test("calculateCartTotals handles empty cart properly", () => {
    const { totalPrice, totalItems } = calculateCartTotals([]);
    expect(totalItems).toBe(0);
    expect(totalPrice).toBe(0);
  });

  test("calculateFinalPrice deducts discount correctly without becoming negative", () => {
    expect(calculateFinalPrice(500000, 100000)).toBe(400000);
    expect(calculateFinalPrice(50000, 100000)).toBe(0);
    expect(calculateFinalPrice(300000, 0)).toBe(300000);
  });
});
