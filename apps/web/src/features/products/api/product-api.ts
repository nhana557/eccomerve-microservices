import { apiRequest, apiRequestWithMeta } from "../../../lib/api-client";
import { Product, CreateProductInput, UpdateProductInput } from "../types";

export interface ProductQueryParams {
  category_id?: string;
  category?: string;
  q?: string;
  sort?: string;
  min_price?: number;
  max_price?: number;
  min_stock?: number;
  limit?: number;
  offset?: number;
  method?: string;
  noCache?: boolean;
}

export const productApi = {
  getProducts: async (params?: ProductQueryParams): Promise<Product[]> => {
    const searchParams = new URLSearchParams();
    if (params?.category_id) searchParams.set("category_id", params.category_id);
    if (params?.category && params.category !== "All" && params.category.toLowerCase() !== "all") searchParams.set("category", params.category);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.min_price !== undefined && params.min_price > 0) searchParams.set("min_price", String(params.min_price));
    if (params?.max_price !== undefined && params.max_price > 0) searchParams.set("max_price", String(params.max_price));
    if (params?.min_stock !== undefined && params.min_stock > 0) searchParams.set("min_stock", String(params.min_stock));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    if (params?.method) searchParams.set("method", params.method);
    if (params?.noCache) searchParams.set("no_cache", "true");

    const qs = searchParams.toString();
    // If noCache is requested (e.g. Dashboard direct hit): call dedicated un-cached direct endpoint (/api/products/direct)
    // Otherwise route through Tier 1: Next.js & Edge Server Data Cache (/api/products with ISR 5m)
    const endpoint = params?.noCache
      ? (qs ? `/api/products/direct?${qs}` : "/api/products/direct")
      : (qs ? `/api/products?${qs}` : "/api/products");

    const result = await apiRequestWithMeta<any>(endpoint, {
      headers: params?.noCache
        ? {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            "X-No-Cache": "true",
          }
        : undefined,
    });
    const res = result.data;
    const isSearch = Boolean(params?.q && params.q.trim() !== "");
    const isDirectUncached = Boolean(params?.noCache) || isSearch;

    if (Array.isArray(res)) {
      const prods = [...res];
      (prods as any).sizeBytes = result.responseSizeBytes;
      (prods as any).responseTimeMs = result.responseTimeMs;
      (prods as any).cacheTier = isDirectUncached ? null : (result.cacheTier || "T1");
      (prods as any).isFromCache = isDirectUncached ? false : Boolean(result.cacheTier);
      return prods;
    }
    if (res && Array.isArray(res.products)) {
      const prods = [...res.products];
      (prods as any).total = res.total;
      (prods as any).sizeBytes = result.responseSizeBytes;
      (prods as any).responseTimeMs = result.responseTimeMs;
      (prods as any).cacheTier = isDirectUncached ? null : (result.cacheTier || "T1");
      (prods as any).isFromCache = isDirectUncached ? false : Boolean(result.cacheTier);
      return prods;
    }
    return [];
  },

  getDirectProducts: async (params?: ProductQueryParams): Promise<Product[]> => {
    return productApi.getProducts({ ...params, noCache: true });
  },

  getProductByID: async (id: string): Promise<Product> => {
    return apiRequest<Product>(`/api/v1/products/${id}`);
  },

  createProduct: async (data: CreateProductInput): Promise<Product> => {
    return apiRequest<Product>("/api/v1/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProduct: async (id: string, data: UpdateProductInput): Promise<Product> => {
    return apiRequest<Product>(`/api/v1/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiRequest(`/api/v1/products/${id}`, {
      method: "DELETE",
    });
  },
};
