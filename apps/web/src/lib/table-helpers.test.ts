import { expect, test, describe } from "bun:test";
import {
  sortData,
  filterAndSortProducts,
  filterAndSortOrders,
  filterAndSortPayments,
  getResponseTimeBadgeClass,
  formatResponseTime,
  formatDataSizeMB,
} from "./table-helpers";
import type { Product } from "@/features/products/types";
import type { Order } from "@/features/orders/types";
import type { Payment } from "@/features/payments/types";

const mockProducts: Product[] = [
  { id: "p1", name: "Mechanical Keyboard", description: "RGB", price: 1200000, stock: 2, category: "Electronics", created_at: "", updated_at: "" },
  { id: "p2", name: "Cotton Hoodie", description: "Warm", price: 350000, stock: 15, category: "Apparel", created_at: "", updated_at: "" },
  { id: "p3", name: "Wireless Mouse", description: "Fast", price: 650000, stock: 0, category: "Electronics", created_at: "", updated_at: "" },
];

const mockOrders: Order[] = [
  { id: "ord-101", user_id: "usr-a", total_amount: 1200000, status: "PAID", items: [], created_at: "", updated_at: "" },
  { id: "ord-102", user_id: "usr-b", total_amount: 350000, status: "PENDING", items: [], created_at: "", updated_at: "" },
  { id: "ord-103", user_id: "usr-a", total_amount: 650000, status: "SHIPPED", items: [], created_at: "", updated_at: "" },
];

const mockPayments: Payment[] = [
  { id: "pay-01", order_id: "ord-101", amount: 1200000, payment_method: "BANK_TRANSFER", status: "SUCCESS", created_at: "", updated_at: "" },
  { id: "pay-02", order_id: "ord-102", amount: 350000, payment_method: "QRIS", status: "PENDING", created_at: "", updated_at: "" },
  { id: "pay-03", order_id: "ord-103", amount: 650000, payment_method: "E_WALLET", status: "FAILED", created_at: "", updated_at: "" },
];

describe("Table Helpers: Sorting & Filtering", () => {
  describe("Generic sortData", () => {
    test("sorts numbers ascending and descending", () => {
      const asc = sortData(mockProducts, "price", "asc");
      expect(asc[0].price).toBe(350000);
      expect(asc[2].price).toBe(1200000);

      const desc = sortData(mockProducts, "price", "desc");
      expect(desc[0].price).toBe(1200000);
      expect(desc[2].price).toBe(350000);
    });

    test("sorts strings case-insensitively", () => {
      const asc = sortData(mockProducts, "name", "asc");
      expect(asc[0].name).toBe("Cotton Hoodie");
      expect(asc[2].name).toBe("Wireless Mouse");
    });
  });

  describe("filterAndSortProducts", () => {
    test("filters by search query matching name or category", () => {
      const res = filterAndSortProducts(mockProducts, { searchQuery: "hoodie" });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe("p2");
    });

    test("filters by category", () => {
      const res = filterAndSortProducts(mockProducts, { category: "Apparel" });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe("p2");
    });

    test("filters by stock status (low_stock and out_of_stock)", () => {
      const lowStock = filterAndSortProducts(mockProducts, { stockStatus: "low_stock" });
      expect(lowStock.length).toBe(1);
      expect(lowStock[0].id).toBe("p1"); // stock: 2

      const outOfStock = filterAndSortProducts(mockProducts, { stockStatus: "out_of_stock" });
      expect(outOfStock.length).toBe(1);
      expect(outOfStock[0].id).toBe("p3"); // stock: 0
    });

    test("sorts products by stock descending", () => {
      const res = filterAndSortProducts(mockProducts, { sortField: "stock", sortDirection: "desc" });
      expect(res[0].stock).toBe(15);
      expect(res[2].stock).toBe(0);
    });
  });

  describe("filterAndSortOrders", () => {
    test("filters by user ID search query and status", () => {
      const res = filterAndSortOrders(mockOrders, { searchQuery: "usr-a", status: "PAID" });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe("ord-101");
    });

    test("sorts orders by total_amount descending", () => {
      const res = filterAndSortOrders(mockOrders, { sortField: "total_amount", sortDirection: "desc" });
      expect(res[0].total_amount).toBe(1200000);
      expect(res[2].total_amount).toBe(350000);
    });
  });

  describe("filterAndSortPayments", () => {
    test("filters by payment method and status", () => {
      const res = filterAndSortPayments(mockPayments, { paymentMethod: "QRIS", status: "PENDING" });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe("pay-02");
    });

    test("sorts payments by amount ascending", () => {
      const res = filterAndSortPayments(mockPayments, { sortField: "amount", sortDirection: "asc" });
      expect(res[0].amount).toBe(350000);
      expect(res[2].amount).toBe(1200000);
    });
  });

  describe("Response Time Formatting & Coloring", () => {
    test("returns red styling when response time is 10s or more (>= 10,000ms)", () => {
      expect(getResponseTimeBadgeClass(10000)).toContain("rose");
      expect(getResponseTimeBadgeClass(12500)).toContain("rose");
      expect(getResponseTimeBadgeClass(45000)).toContain("rose");
    });

    test("returns green styling when response time is fast (< 150ms)", () => {
      expect(getResponseTimeBadgeClass(45)).toContain("emerald");
      expect(getResponseTimeBadgeClass(149)).toContain("emerald");
    });

    test("returns cyan styling when response time is moderate (< 500ms)", () => {
      expect(getResponseTimeBadgeClass(250)).toContain("cyan");
      expect(getResponseTimeBadgeClass(499)).toContain("cyan");
    });

    test("returns amber styling when response time is slow but under 10s", () => {
      expect(getResponseTimeBadgeClass(500)).toContain("amber");
      expect(getResponseTimeBadgeClass(9999)).toContain("amber");
    });

    test("formats response time properly in seconds and ms for >= 10s", () => {
      expect(formatResponseTime(10500)).toBe("10.5s (10.500 ms)");
      expect(formatResponseTime(120)).toBe("120 ms");
    });

    test("formats response data size strictly in MB units", () => {
      expect(formatDataSizeMB(0)).toBe("0.00 MB");
      expect(formatDataSizeMB(null as any)).toBe("0.00 MB");
      // 2.5 MB (2,621,440 bytes)
      expect(formatDataSizeMB(2621440)).toBe("2.50 MB");
      // ~50 KB => 0.05 MB (50 KB)
      expect(formatDataSizeMB(51200)).toBe("0.05 MB (50 KB)");
      // 10 MB
      expect(formatDataSizeMB(10485760)).toBe("10.00 MB");
    });
  });
});
