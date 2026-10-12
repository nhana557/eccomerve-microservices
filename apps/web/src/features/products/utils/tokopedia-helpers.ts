import React from "react";
import { Product } from "../types";
import tokopediaRealImages from "./tokopedia-real-images.json";
import shopeeRealImages from "./shopee-real-images.json";

interface TokopediaCategoryImages {
  query?: string;
  images: string[];
  count?: number;
}

const REAL_IMAGES_MAP = (shopeeRealImages || tokopediaRealImages) as Record<string, TokopediaCategoryImages>;

/**
 * Helper functions for Tokopedia Dark Mode UI formatting
 */

/**
 * Calculates the original price before discount
 * E.g. current = 1,000,000, discount = 20% -> 1,000,000 / (1 - 0.20) = 1,250,000
 */
export function calculateOriginalPrice(currentPrice: number, discountPercent: number): number {
  if (discountPercent <= 0 || discountPercent >= 100) {
    return currentPrice;
  }
  const factor = 1 - discountPercent / 100;
  return Math.round(currentPrice / factor);
}

/**
 * Formats sold item count in Tokopedia standard
 * < 100 -> "45 terjual"
 * 100 - 999 -> "250+ terjual"
 * 1,000 - 9,999 -> "1rb+ terjual"
 * >= 10,000 -> "10rb+ terjual"
 */
export function formatSalesCount(sold: number): string {
  if (sold <= 0) return "0 terjual";
  if (sold < 100) return `${sold} terjual`;
  if (sold < 1000) {
    const rounded = Math.floor(sold / 50) * 50;
    return `${rounded}+ terjual`;
  }
  if (sold < 10000) {
    const thousands = Math.floor(sold / 1000);
    return `${thousands}rb+ terjual`;
  }
  return "10rb+ terjual";
}

/**
 * Formats total seconds into padded hours, minutes, seconds for countdown timers
 */
export function formatCountdown(totalSeconds: number): {
  hours: string;
  minutes: string;
  seconds: string;
} {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;

  return {
    hours: String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
  };
}

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  keyboard: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
  headphone: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
  audio: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
  mouse: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
  monitor: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
  mat: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&w=600&q=80",
  switch: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=600&q=80",
  keycap: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80",
  riser: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
  stand: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
  dock: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
  hoodie: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80",
  shirt: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
  tshirt: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
  bag: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
  tas: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
};

export const DEFAULT_PRODUCT_FALLBACK = "/images/default-product.svg";

export const DEFAULT_PRODUCT_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%"><rect width="400" height="400" fill="#16191E"/><circle cx="200" cy="180" r="70" fill="#1F232B" stroke="#0284C7" stroke-width="2"/><circle cx="200" cy="180" r="28" fill="#38BDF8" opacity="0.8"/><rect x="130" y="270" width="140" height="10" rx="5" fill="#2E3444"/><text x="200" y="325" fill="#FFFFFF" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">T.STORE</text></svg>`
)}`;

/**
 * Fallback event handler when image fails to load in browser (e.g. 403, 404, or network error)
 */
export function handleProductImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (!target.dataset.fallbackTried) {
    target.dataset.fallbackTried = "true";
    target.src = DEFAULT_PRODUCT_FALLBACK;
  } else if (!target.dataset.dataUrlTried) {
    target.dataset.dataUrlTried = "true";
    target.src = DEFAULT_PRODUCT_DATA_URL;
  }
}

export function getProductImage(product: Product): string {
  if (!product) {
    return DEFAULT_PRODUCT_FALLBACK;
  }

  // 1. Priority: Return 100% accessible Shopee CDN image
  if (
    product.image_url &&
    (product.image_url.includes("susercontent.com") ||
      product.image_url.includes("shopee.co.id") ||
      product.image_url.includes("shopeemobile.com"))
  ) {
    return product.image_url;
  }

  // 2. If category_id matches one of the 40 official categories from verified Shopee image pool
  if (product.category_id && REAL_IMAGES_MAP[product.category_id]) {
    const entry = REAL_IMAGES_MAP[product.category_id] as any;
    const list: string[] = entry?.images || entry?.shopee_images || [];
    const validList = list.filter((img) => img && img.includes("susercontent.com"));
    if (validList && validList.length > 0) {
      let hash = 0;
      const str = product.id || product.name || "";
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
      }
      const index = Math.abs(hash) % validList.length;
      return validList[index];
    }
  }

  // 3. Fallback to existing product image ONLY if not broken Tokopedia CDN (which returns 403)
  if (
    product.image_url &&
    product.image_url.trim() !== "" &&
    !product.image_url.includes("tokopedia-static.net")
  ) {
    return product.image_url;
  }

  // 4. Fallback to name/category keywords
  const name = (product.name || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();

  for (const [key, url] of Object.entries(PRODUCT_IMAGE_MAP)) {
    if (name.includes(key) || cat.includes(key)) {
      return url;
    }
  }
  return DEFAULT_PRODUCT_FALLBACK;
}

/**
 * Resolves a single unique active ID for Tokopedia quick category shortcuts
 */
export function getQuickCategoryActiveId(category: string, specialFilter?: string): string {
  if (specialFilter === "official") return "os";
  if (specialFilter === "free-shipping") return "ongkir";

  const catLower = (category || "").toLowerCase();
  if (catLower === "electronics" || catLower.includes("elektronik")) return "elec";
  if (catLower === "apparel" || catLower.includes("fashion")) return "apparel";
  if (catLower === "accessories" || catLower.includes("komputer") || catLower.includes("laptop")) return "acc";
  return "all";
}

/**
 * Format numbers to standard Indonesian Rupiah format
 * E.g. 150000 -> "Rp 150.000"
 */
export function formatRupiah(value: number): string {
  if (isNaN(value) || value <= 0) return "Rp 0";
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/**
 * Parses raw input string into clean integer
 * E.g. "Rp 150.000" -> 150000, "50000" -> 50000
 */
export function parseRupiahInput(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return 0;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export interface PricePreset {
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_PRESETS: PricePreset[] = [
  { label: "< 100rb", min: 0, max: 100000 },
  { label: "100rb - 500rb", min: 100000, max: 500000 },
  { label: "500rb - 2jt", min: 500000, max: 2000000 },
  { label: "> 2jt", min: 2000000, max: 0 },
];

export interface StockPreset {
  label: string;
  min: number;
}

export const STOCK_PRESETS: StockPreset[] = [
  { label: "Stok > 10", min: 10 },
  { label: "Stok > 50", min: 50 },
  { label: "Stok > 100", min: 100 },
];

export interface ActiveFiltersParams {
  categoryId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
}

/**
 * Counts total active filter criteria excluding defaults
 */
export function countActiveFilters(params: ActiveFiltersParams): number {
  let count = 0;
  if (params.categoryId && params.categoryId.trim() !== "") {
    count++;
  } else if (params.category && params.category !== "All" && params.category.trim() !== "") {
    count++;
  }

  if ((params.minPrice !== undefined && params.minPrice > 0) || (params.maxPrice !== undefined && params.maxPrice > 0)) {
    count++;
  }

  if (params.minStock !== undefined && params.minStock > 0) {
    count++;
  }

  return count;
}

/**
 * Generates human readable price range label for badge
 */
export function formatPriceRangeLabel(min?: number, max?: number): string {
  const hasMin = min !== undefined && min > 0;
  const hasMax = max !== undefined && max > 0;

  if (hasMin && hasMax) {
    return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  }
  if (hasMin) {
    return `≥ ${formatRupiah(min)}`;
  }
  if (hasMax) {
    return `≤ ${formatRupiah(max)}`;
  }
  return "";
}

/**
 * Formats stock filter label for active badge
 */
export function formatStockFilterLabel(stock?: number): string {
  if (stock === undefined || stock <= 0) return "";
  return `Stok ≥ ${stock}`;
}
