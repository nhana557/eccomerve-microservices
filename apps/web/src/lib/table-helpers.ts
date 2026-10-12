import type { Product } from "@/features/products/types";
import type { Order } from "@/features/orders/types";
import type { Payment } from "@/features/payments/types";

export type SortDirection = "asc" | "desc";

/**
 * Generic sorting function for arrays of objects
 */
export function sortData<T>(
  data: T[],
  field: keyof T | string | null,
  direction: SortDirection = "asc"
): T[] {
  if (!field) return data;

  return [...data].sort((a: any, b: any) => {
    let aVal = a[field];
    let bVal = b[field];

    if (aVal === undefined || aVal === null) aVal = "";
    if (bVal === undefined || bVal === null) bVal = "";

    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    const strA = String(aVal).toLowerCase();
    const strB = String(bVal).toLowerCase();

    if (strA < strB) return direction === "asc" ? -1 : 1;
    if (strA > strB) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

export interface ProductTableFilterOptions {
  searchQuery?: string;
  category?: string;
  stockStatus?: "all" | "in_stock" | "low_stock" | "out_of_stock";
  sortField?: string | null;
  sortDirection?: SortDirection;
}

export function filterAndSortProducts(
  products: Product[],
  options: ProductTableFilterOptions
): Product[] {
  const result = products.filter((p) => {
    // 1. Search Filter (by name, ID, or category)
    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchId = p.id.toLowerCase().includes(q);
      const matchCat = (p.category || "").toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCat) return false;
    }

    // 2. Category Filter
    if (options.category && options.category !== "all") {
      if ((p.category || "").toLowerCase() !== options.category.toLowerCase()) {
        return false;
      }
    }

    // 3. Stock Status Filter
    if (options.stockStatus && options.stockStatus !== "all") {
      if (options.stockStatus === "out_of_stock" && p.stock > 0) return false;
      if (options.stockStatus === "low_stock" && (p.stock <= 0 || p.stock > 5)) return false;
      if (options.stockStatus === "in_stock" && p.stock <= 5) return false;
    }

    return true;
  });

  return sortData(result, options.sortField || null, options.sortDirection || "asc");
}

export interface OrderTableFilterOptions {
  searchQuery?: string;
  status?: string;
  sortField?: string | null;
  sortDirection?: SortDirection;
}

export function filterAndSortOrders(
  orders: Order[],
  options: OrderTableFilterOptions
): Order[] {
  const result = orders.filter((o) => {
    // 1. Search Filter (by order ID or user ID)
    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      const matchId = o.id.toLowerCase().includes(q);
      const matchUserId = (o.user_id || "").toLowerCase().includes(q);
      if (!matchId && !matchUserId) return false;
    }

    // 2. Status Filter
    if (options.status && options.status !== "all") {
      if ((o.status || "").toUpperCase() !== options.status.toUpperCase()) {
        return false;
      }
    }

    return true;
  });

  return sortData(result, options.sortField || null, options.sortDirection || "asc");
}

export interface PaymentTableFilterOptions {
  searchQuery?: string;
  status?: string;
  paymentMethod?: string;
  sortField?: string | null;
  sortDirection?: SortDirection;
}

export function filterAndSortPayments(
  payments: Payment[],
  options: PaymentTableFilterOptions
): Payment[] {
  const result = payments.filter((p) => {
    // 1. Search Filter (by payment ID or order ID)
    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      const matchId = p.id.toLowerCase().includes(q);
      const matchOrderId = (p.order_id || "").toLowerCase().includes(q);
      if (!matchId && !matchOrderId) return false;
    }

    // 2. Status Filter
    if (options.status && options.status !== "all") {
      if ((p.status || "").toUpperCase() !== options.status.toUpperCase()) {
        return false;
      }
    }

    // 3. Payment Method Filter
    if (options.paymentMethod && options.paymentMethod !== "all") {
      if ((p.payment_method || "").toUpperCase() !== options.paymentMethod.toUpperCase()) {
        return false;
      }
    }

    return true;
  });

  return sortData(result, options.sortField || null, options.sortDirection || "asc");
}

/**
 * Formats API response time badge styling class based on latency
 * - >= 10,000ms (10s): Red (rose/merah)
 * - < 150ms: Green (emerald)
 * - < 500ms: Blue (cyan)
 * - Otherwise: Yellow (amber)
 */
export function getResponseTimeBadgeClass(ms: number): string {
  if (ms >= 10000) {
    return "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/30";
  }
  if (ms < 150) {
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
  }
  if (ms < 500) {
    return "bg-cyan-500/10 text-cyan-300 border-cyan-500/30";
  }
  return "bg-amber-500/10 text-amber-300 border-amber-500/30";
}

/**
 * Formats response time label nicely (shows seconds if >= 10s)
 */
export function formatResponseTime(ms: number): string {
  if (ms >= 10000) {
    return `${(ms / 1000).toFixed(1)}s (${ms.toLocaleString("id-ID")} ms)`;
  }
  return `${ms} ms`;
}

/**
 * Formats response payload data size strictly in MB (MegaBytes)
 */
export function formatDataSizeMB(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return "0.00 MB";
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = Math.round(bytes / 1024);
  return `${mb.toFixed(2)} MB (${kb} KB)`;
}

/**
 * Formats countdown seconds nicely into "mm:ss" or "hh:mm:ss"
 */
export function formatCountdownString(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) {
    return "00:00";
  }
  const safe = Math.floor(seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
