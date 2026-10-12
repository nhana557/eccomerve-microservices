"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Product, CreateProductInput, UpdateProductInput } from "../types";
import { productApi } from "../api/product-api";
import { useToast } from "@/components/feedback/ToastContext";
import { apiMetrics, apiCacheTracker, CacheTierLabel } from "@/lib/api-client";
import {
  setPersistentCache,
  getPersistentCache,
  getPersistentCacheWithMeta,
  getProgressiveHitCount,
  incrementProgressiveHitCount,
  getSharedCacheWindowExpiry,
} from "@/lib/persistentCache";

export function appendUniqueProducts(existing: Product[], incoming: Product[]): Product[] {
  const existingIds = new Set(existing.map((p) => p.id));
  const newItems = incoming.filter((p) => !existingIds.has(p.id));
  return [...existing, ...newItems];
}

export function calculateHasMore(currentCount: number, totalCount: number): boolean {
  return totalCount > 0 && currentCount < totalCount;
}

export const DEFAULT_PAGE_SIZE = 60;

export function filterProducts(
  products: Product[],
  category: string,
  query: string,
  categoryId?: string,
  minPrice?: number,
  maxPrice?: number,
  minStock?: number
): Product[] {
  return products.filter((p) => {
    const matchCategoryId =
      !categoryId ||
      categoryId === "" ||
      p.category_id === categoryId ||
      (category !== "All" && p.category && p.category.toLowerCase() === category.toLowerCase());
    const matchCategory =
      category === "All" ||
      (p.category && p.category.toLowerCase() === category.toLowerCase()) ||
      (categoryId && p.category_id === categoryId);
    const matchQuery =
      query.trim() === "" ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description?.toLowerCase().includes(query.toLowerCase());
    const matchMinPrice =
      minPrice === undefined || minPrice === null || minPrice <= 0 || p.price >= minPrice;
    const matchMaxPrice =
      maxPrice === undefined || maxPrice === null || maxPrice <= 0 || p.price <= maxPrice;
    const matchMinStock =
      minStock === undefined || minStock === null || minStock <= 0 || p.stock >= minStock;

    return (
      matchCategoryId &&
      matchCategory &&
      matchQuery &&
      matchMinPrice &&
      matchMaxPrice &&
      matchMinStock
    );
  });
}

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "sample-1",
    name: "Mechanical Keyboard Pro",
    description: "Wireless 75% hot-swappable RGB mechanical keyboard with gasket mount",
    price: 1450000,
    stock: 25,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-2",
    name: "Studio Headphone Wireless",
    description: "Active Noise Cancelling over-ear high-fidelity studio headphone",
    price: 2100000,
    stock: 12,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-3",
    name: "Ergonomic Desk Mat",
    description: "Waterproof microfiber leather 90x40cm with anti-slip base",
    price: 185000,
    stock: 4,
    category: "Accessories",
    image_url: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-4",
    name: "Minimalist Developer Hoodie",
    description: "Heavyweight 380gsm premium cotton fleece with discrete embroidery",
    price: 420000,
    stock: 18,
    category: "Apparel",
    image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-5",
    name: "USB-C Aluminum Dock 10-in-1",
    description: "Dual 4K HDMI, 100W Power Delivery, Gigabit Ethernet & SD Card slot",
    price: 680000,
    stock: 8,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-6",
    name: "Precision Gaming Mouse Ultralight",
    description: "Ultralight 58g wireless sensor 26K DPI with optical switches",
    price: 790000,
    stock: 15,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-7",
    name: "Curved Ultrawide Monitor 34 Inch 144Hz",
    description: "WQHD 3440x1440 HDR400 sRGB 120% with USB-C 90W Hub",
    price: 4850000,
    stock: 6,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-8",
    name: "Mechanical Linear Switch Lubed 45pcs",
    description: "Custom factory pre-lubed 45g linear switches with POM stem",
    price: 240000,
    stock: 35,
    category: "Accessories",
    image_url: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-9",
    name: "Retro Cream PBT Dye-Sub Keycaps",
    description: "Cherry profile thick PBT 142 keys with ISO & ANSI layout support",
    price: 360000,
    stock: 19,
    category: "Accessories",
    image_url: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-10",
    name: "Aluminum Ergonomic Laptop Riser",
    description: "Foldable 360 rotating aerospace-grade aluminum stand with ventilation",
    price: 285000,
    stock: 22,
    category: "Accessories",
    image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-11",
    name: "Oversized Minimalist Tech T-Shirt",
    description: "Heavyweight 240gsm combed cotton with breathable relaxed fit",
    price: 185000,
    stock: 40,
    category: "Apparel",
    image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-12",
    name: "Waterproof EDC Tech Messenger Bag",
    description: "Cordura 500D fabric with Fidlock magnetic buckle & laptop sleeve",
    price: 450000,
    stock: 14,
    category: "Apparel",
    image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export interface UseProductsOptions {
  categoryId?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  method?: string;
  noCache?: boolean;
}

export function useProducts(initialOptions?: UseProductsOptions) {
  const skipCache = Boolean(initialOptions?.noCache);
  const [pageSize, setPageSize] = useState<number>(initialOptions?.limit || DEFAULT_PAGE_SIZE);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    initialOptions?.categoryId
  );
  const [selectedCategory, setSelectedCategory] = useState(initialOptions?.category || "All");
  const [searchQuery, setSearchQuery] = useState(initialOptions?.search || "");
  const [sort, setSort] = useState(initialOptions?.sort || "newest");
  const [engineMethod, setEngineMethod] = useState<string>(
    initialOptions?.method || (skipCache ? "btree_index" : "hybrid_fast")
  );
  const [minPrice, setMinPrice] = useState<number | undefined>(initialOptions?.minPrice);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(initialOptions?.maxPrice);
  const [minStock, setMinStock] = useState<number | undefined>(initialOptions?.minStock);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseSize, setResponseSize] = useState<number | null>(null);
  const [cacheExpiry, setCacheExpiry] = useState<number | null>(null);
  const [cacheRemainingSeconds, setCacheRemainingSeconds] = useState<number | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [activeCacheTier, setActiveCacheTier] = useState<CacheTierLabel>(skipCache ? null : "T3");
  const { showToast } = useToast();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = performance.now();
    const isSearch = Boolean(searchQuery && searchQuery.trim() !== "");
    const cacheKey = `products_${selectedCategoryId || "none"}_${selectedCategory}_${searchQuery}_${sort}_${pageSize}_${minPrice || 0}_${maxPrice || 0}_${minStock || 0}`;
    const hitCount = getProgressiveHitCount(cacheKey);

    // Progressive Tier 4 Fast-path: Check Tier 4 ONLY IF NOT search AND hitCount >= 2 AND NOT in direct noCache mode
    if (!skipCache && !isSearch && hitCount >= 2) {
      try {
        const cached = await getPersistentCacheWithMeta<{ products: Product[]; total: number; sizeBytes?: number }>(cacheKey);
        if (cached && cached.value && cached.value.products && cached.value.products.length > 0) {
          const cacheElapsed = Math.max(1, Math.round(performance.now() - start));
          setProducts(cached.value.products);
          if (cached.value.total !== undefined) setTotalCount(cached.value.total);
          if (cached.value.sizeBytes !== undefined) setResponseSize(cached.value.sizeBytes);
          setResponseTime(cacheElapsed);
          setCacheExpiry(cached.expiry);
          setCacheRemainingSeconds(cached.remainingSeconds);
          setIsFromCache(true);
          setActiveCacheTier("T4");
          setIsLoading(false);

          // Track progressive request count
          incrementProgressiveHitCount(cacheKey);

          // Record cache response time to global apiMetrics & apiCacheTracker with Tier 4 label
          apiMetrics.record("/api/v1/products", cacheElapsed, true, "T4");
          apiCacheTracker.record("/api/v1/products", "GET", cacheElapsed, cached.remainingSeconds, "T4");
          return;
        }
      } catch {
        // Ignore cache read errors
      }
    }

    try {
      const data = await productApi.getProducts({
        category_id: selectedCategoryId,
        category: (selectedCategory && selectedCategory !== "All" && selectedCategory.toLowerCase() !== "all") ? selectedCategory : undefined,
        q: searchQuery || undefined,
        sort,
        min_price: minPrice,
        max_price: maxPrice,
        min_stock: minStock,
        limit: pageSize,
        offset: 0,
        method: isSearch ? "cqrs" : engineMethod,
        noCache: skipCache || isSearch,
      });

      const networkElapsed = Math.round(performance.now() - start);
      setResponseTime(networkElapsed);

      let currentHit = 0;
      if (!skipCache && !isSearch) {
        // Multi-tier lifecycle progression:
        // Request 1: API / Backend Cache (Tier 3)
        // Request 2: Next.js & Edge Server Data Cache (Tier 1) -> promoted & saved to Tier 4
        // Request 3+: Instant Browser Persistent Cache (Tier 4, < 1ms)
        currentHit = incrementProgressiveHitCount(cacheKey);

        let detectedTier: CacheTierLabel = (data as any).cacheTier;
        if (!detectedTier) {
          if (currentHit <= 1) {
            detectedTier = "T3";
          } else {
            detectedTier = "T1";
          }
        }

        const isCachedBackend = detectedTier === "T1" || detectedTier === "T3";
        setIsFromCache(isCachedBackend);
        setActiveCacheTier(detectedTier);

        // Synchronize to shared 5-minute cache window so switching categories does not reset the countdown
        const windowExpiry = getSharedCacheWindowExpiry();
        const remainingSecs = Math.max(0, Math.floor((windowExpiry - Date.now()) / 1000));

        apiMetrics.record("/api/v1/products", networkElapsed, isCachedBackend, detectedTier);
        apiCacheTracker.record("/api/v1/products", "GET", networkElapsed, remainingSecs, detectedTier, windowExpiry);
        setCacheExpiry(windowExpiry);
        setCacheRemainingSeconds(remainingSecs);
      } else {
        // Direct Live API / CQRS Mode (e.g. Searching with CQRS): No cache, strictly live CQRS latency
        setIsFromCache(false);
        setActiveCacheTier(null);
        setCacheExpiry(null);
        setCacheRemainingSeconds(null);
        apiMetrics.record("/api/v1/products", networkElapsed, false, null);
      }

      if ((data as any).sizeBytes !== undefined) {
        setResponseSize((data as any).sizeBytes);
      } else if (data && data.length > 0) {
        setResponseSize(JSON.stringify(data).length);
      } else {
        setResponseSize(0);
      }

      if (data && data.length > 0) {
        setProducts(data);
        const total = (data as any).total !== undefined ? (data as any).total : data.length;
        setTotalCount(total);

        // "request ke 2 dari T1 dan ke 3 masukan ke T4"
        // When currentHit >= 2 (Request 2 selesai), simpan data ke Tier 4 untuk Request 3+
        if (!skipCache && !isSearch && currentHit >= 2) {
          const windowExpiry = getSharedCacheWindowExpiry();
          const remainingSecs = Math.max(0, Math.floor((windowExpiry - Date.now()) / 1000));
          setPersistentCache(cacheKey, {
            products: data,
            total,
            sizeBytes: (data as any).sizeBytes,
          }, remainingSecs);
          setCacheExpiry(windowExpiry);
          setCacheRemainingSeconds(remainingSecs);
        }
      } else {
        // If filters are active, show empty result rather than fallback mock items
        const hasActiveFilter =
          Boolean(selectedCategoryId) ||
          (selectedCategory && selectedCategory !== "All" && selectedCategory.toLowerCase() !== "all") ||
          Boolean(searchQuery) ||
          (minPrice !== undefined && minPrice > 0) ||
          (maxPrice !== undefined && maxPrice > 0) ||
          (minStock !== undefined && minStock > 0);

        if (hasActiveFilter) {
          setProducts([]);
          setTotalCount(0);
        } else {
          setProducts(FALLBACK_PRODUCTS);
          setTotalCount(FALLBACK_PRODUCTS.length);
        }
      }
    } catch (err: any) {
      const msg = err.message || "Gagal memuat produk dari server";
      setError(msg);
      const errElapsed = Math.max(1, Math.round(performance.now() - start));
      setResponseTime(errElapsed);
      // Tier 2: SSR Zero-Downtime Static Seed Fallback when API is offline
      setProducts((prev) => (prev.length > 0 ? prev : FALLBACK_PRODUCTS));
      setTotalCount((prev) => (prev > 0 ? prev : FALLBACK_PRODUCTS.length));
      setIsFromCache(true);
      setActiveCacheTier("T2");
      apiMetrics.record("/api/v1/products", errElapsed, true, "T2");
      apiCacheTracker.record("/api/v1/products", "GET", errElapsed, 300, "T2");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategoryId, selectedCategory, searchQuery, sort, pageSize, minPrice, maxPrice, minStock, engineMethod, skipCache]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Refetch products immediately when any cache tier is purged
  useEffect(() => {
    const handleCachePurged = () => {
      fetchProducts();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("tstore:cache-purged", handleCachePurged);
      return () => {
        window.removeEventListener("tstore:cache-purged", handleCachePurged);
      };
    }
  }, [fetchProducts]);

  // Live countdown ticker for product cache TTL (strictly capped at 300s / 5 minutes)
  useEffect(() => {
    if (!cacheExpiry) {
      setCacheRemainingSeconds(null);
      return;
    }
    const tick = () => {
      const diff = Math.min(300, Math.max(0, Math.floor((cacheExpiry - Date.now()) / 1000)));
      setCacheRemainingSeconds(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cacheExpiry]);

  const hasMore = useMemo(() => {
    return calculateHasMore(products.length, totalCount);
  }, [products.length, totalCount]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const start = performance.now();
    const nextTotalCount = products.length + pageSize;
    const combinedCacheKey = `products_${selectedCategoryId || "none"}_${selectedCategory}_${searchQuery}_${sort}_${nextTotalCount}_${minPrice || 0}_${maxPrice || 0}_${minStock || 0}`;

    // Fast-path for loadMore: check if cumulative batch is already in Browser IndexedDB ONLY IF NOT skipCache
    if (!skipCache) {
      try {
        const cached = await getPersistentCacheWithMeta<{ products: Product[]; total: number; sizeBytes?: number }>(combinedCacheKey);
        if (cached && cached.value && cached.value.products && cached.value.products.length > products.length) {
          const cacheElapsed = Math.max(1, Math.round(performance.now() - start));
          setProducts(cached.value.products);
          if (cached.value.total !== undefined) setTotalCount(cached.value.total);
          if (cached.value.sizeBytes !== undefined) setResponseSize(cached.value.sizeBytes);
          setResponseTime(cacheElapsed);
          setCacheExpiry(cached.expiry);
          setCacheRemainingSeconds(cached.remainingSeconds);
          setIsFromCache(true);
          setIsLoadingMore(false);

          apiMetrics.record("/api/v1/products", cacheElapsed, true, "T4");
          apiCacheTracker.record("/api/v1/products", "GET", cacheElapsed, cached.remainingSeconds, "T4");
          setActiveCacheTier("T4");
          return;
        }
      } catch {
        // Ignore
      }
    }

    try {
      const data = await productApi.getProducts({
        category_id: selectedCategoryId,
        category: (selectedCategory && selectedCategory !== "All" && selectedCategory.toLowerCase() !== "all") ? selectedCategory : undefined,
        q: searchQuery || undefined,
        sort,
        min_price: minPrice,
        max_price: maxPrice,
        min_stock: minStock,
        limit: pageSize,
        offset: products.length,
        method: engineMethod,
        noCache: skipCache,
      });

      const elapsed = Math.round(performance.now() - start);
      setResponseTime(elapsed);

      if (!skipCache) {
        const detectedTier: CacheTierLabel =
          (data as any).cacheTier ||
          (elapsed <= 5 && (engineMethod === "cqrs" || engineMethod === "in_memory_cache" || engineMethod === "hybrid_fast")
            ? "T3"
            : elapsed <= 35
            ? "T1"
            : null);
        const isCachedBackend = detectedTier === "T1" || detectedTier === "T3";
        setIsFromCache(isCachedBackend);
        setActiveCacheTier(detectedTier);
        apiMetrics.record("/api/v1/products", elapsed, isCachedBackend, detectedTier);
      } else {
        setIsFromCache(false);
        setActiveCacheTier(null);
        apiMetrics.record("/api/v1/products", elapsed, false, null);
      }

      if ((data as any).sizeBytes !== undefined) {
        setResponseSize((data as any).sizeBytes);
      }

      if (data && data.length > 0) {
        setProducts((prev) => {
          const next = appendUniqueProducts(prev, data);
          if (!skipCache) {
            // Persist cumulative list to Tier 4: Browser IndexedDB
            const ttlSeconds = 300;
            const currentBatchKey = `products_${selectedCategoryId || "none"}_${selectedCategory}_${searchQuery}_${sort}_${next.length}_${minPrice || 0}_${maxPrice || 0}_${minStock || 0}`;
            setPersistentCache(currentBatchKey, {
              products: next,
              total: (data as any).total !== undefined ? (data as any).total : next.length,
              sizeBytes: (data as any).sizeBytes,
            }, ttlSeconds);
          }
          return next;
        });
        if ((data as any).total !== undefined) {
          setTotalCount((data as any).total);
        }
        if (!skipCache) {
          const windowExpiry = getSharedCacheWindowExpiry();
          const remainingSecs = Math.max(0, Math.floor((windowExpiry - Date.now()) / 1000));
          setCacheExpiry(windowExpiry);
          setCacheRemainingSeconds(remainingSecs);
          apiCacheTracker.record("/api/v1/products", "GET", elapsed, remainingSecs, activeCacheTier, windowExpiry);
        }
      }
    } catch (err: any) {
      showToast("error", "Gagal Memuat Produk", err.message || "Gagal memuat produk tambahan.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMore,
    selectedCategoryId,
    selectedCategory,
    searchQuery,
    sort,
    pageSize,
    minPrice,
    maxPrice,
    minStock,
    products.length,
    engineMethod,
    showToast,
  ]);

  const filteredProducts = useMemo(() => {
    // When search query is active and products were fetched from backend,
    // do not discard CQRS BM25 / Fuzzy results with rigid client-side .includes()
    if (searchQuery.trim() !== "" && products !== FALLBACK_PRODUCTS) {
      return products;
    }
    return filterProducts(
      products,
      selectedCategory,
      searchQuery,
      selectedCategoryId,
      minPrice,
      maxPrice,
      minStock
    );
  }, [products, selectedCategory, searchQuery, selectedCategoryId, minPrice, maxPrice, minStock]);

  const setPriceRange = useCallback((min?: number, max?: number) => {
    setMinPrice(min);
    setMaxPrice(max);
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedCategory("All");
    setSelectedCategoryId(undefined);
    setSearchQuery("");
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinStock(undefined);
  }, []);

  const createProduct = async (data: CreateProductInput) => {
    try {
      const created = await productApi.createProduct(data);
      setProducts((prev) => [created, ...prev]);
      setTotalCount((prev) => prev + 1);
      showToast("success", "Produk Berhasil Ditambahkan", `${created.name} telah masuk katalog.`);
      return created;
    } catch (err: any) {
      showToast("error", "Gagal Menambah Produk", err.message);
      throw err;
    }
  };

  const updateProduct = async (id: string, data: UpdateProductInput) => {
    try {
      const updated = await productApi.updateProduct(id, data);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data, ...updated } : p)));
      showToast("success", "Produk Diperbarui", "Perubahan data produk tersimpan.");
      return updated;
    } catch (err: any) {
      showToast("error", "Gagal Memperbarui Produk", err.message);
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      showToast("success", "Produk Dihapus", "Produk telah dihapus dari katalog.");
    } catch (err: any) {
      showToast("error", "Gagal Menghapus Produk", err.message);
      throw err;
    }
  };

  return {
    products,
    filteredProducts,
    totalCount,
    pageSize,
    setPageSize,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    responseTime,
    responseSize,
    error,
    selectedCategory,
    setSelectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    engineMethod,
    setEngineMethod,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    setPriceRange,
    minStock,
    setMinStock,
    resetFilters,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    cacheExpiry,
    cacheRemainingSeconds,
    isFromCache,
    activeCacheTier,
  };
}
