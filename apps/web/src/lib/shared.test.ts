import { expect, test, describe } from "bun:test";
import { parseApiResponse, apiMetrics, apiCacheTracker } from "./api-client";
import {
  setPersistentCache,
  getPersistentCache,
  getPersistentCacheWithMeta,
  getLatestActiveCache,
  clearCacheByPrefix,
  getPersistentCacheStats,
  getProgressiveHitCount,
  incrementProgressiveHitCount,
  resetProgressiveHitCount,
  getSharedCacheWindowExpiry,
  resetSharedCacheWindowExpiry,
  purgeTier,
} from "./persistentCache";
import { formatCountdownString } from "./table-helpers";
import { GET as getProductsRoute, POST as purgeTier1ProductsCache } from "../app/api/products/route";
import { GET as getDirectProductsRoute } from "../app/api/products/direct/route";
import { NextRequest } from "next/server";

describe("Shared Core Infrastructure", () => {
  test("parseApiResponse unwraps standard envelope data correctly", () => {
    const rawEnvelope = {
      success: true,
      data: { id: "123", name: "Sample Item" },
      meta: { service: "test-service" },
    };
    const result = parseApiResponse<{ id: string; name: string }>(rawEnvelope);
    expect(result.id).toBe("123");
    expect(result.name).toBe("Sample Item");
  });

  test("parseApiResponse throws structured error on failure envelope", () => {
    const errorEnvelope = {
      success: false,
      error: { code: "NOT_FOUND", message: "Item was not found" },
      meta: { service: "test-service" },
    };
    expect(() => parseApiResponse(errorEnvelope)).toThrow("Item was not found");
  });

  describe("Cache Countdown Utilities & Tracking", () => {
    test("formatCountdownString formats seconds properly into mm:ss and hh:mm:ss", () => {
      expect(formatCountdownString(0)).toBe("00:00");
      expect(formatCountdownString(-10)).toBe("00:00");
      expect(formatCountdownString(null)).toBe("00:00");
      expect(formatCountdownString(75)).toBe("01:15");
      expect(formatCountdownString(3599)).toBe("59:59");
      expect(formatCountdownString(3600)).toBe("01:00:00");
      expect(formatCountdownString(3665)).toBe("01:01:05");
    });

    test("apiCacheTracker tracks endpoint TTL countdown info and cache tier with 5m default", () => {
      apiCacheTracker.record("/api/v1/products", "GET", 19, 300, "T1");
      const latest = apiCacheTracker.getLatest();
      expect(latest).toBeDefined();
      expect(latest?.endpoint).toBe("/api/v1/products");
      expect(latest?.ttlSeconds).toBe(300);
      expect(latest?.cacheTier).toBe("T1");
      expect(latest?.expiry).toBeGreaterThan(Date.now());
    });

    test("apiMetrics records and differentiates cache tier vs network response time", () => {
      let receivedIsCache = false;
      let receivedMs = 0;
      let receivedTier: any = null;
      const unsubscribe = apiMetrics.subscribe((_endpoint, ms, isCache, tier) => {
        receivedMs = ms;
        receivedIsCache = Boolean(isCache);
        receivedTier = tier;
      });

      apiMetrics.record("/api/v1/products", 19, true, "T1");
      expect(receivedMs).toBe(19);
      expect(receivedIsCache).toBe(true);
      expect(receivedTier).toBe("T1");

      const latest = apiMetrics.getLatest("/api/v1/products");
      expect(latest?.ms).toBe(19);
      expect(latest?.isCache).toBe(true);
      expect(latest?.tier).toBe("T1");

      unsubscribe();
    });
  });

  describe("Tier 4: Browser Persistent Cache (IndexedDB / Memory fallback)", () => {
    test("sets and gets persistent cache values with TTL", async () => {
      await setPersistentCache("test_key_1", { foo: "bar" }, 300);
      const val = await getPersistentCache<{ foo: string }>("test_key_1");
      expect(val).not.toBeNull();
      expect(val?.foo).toBe("bar");
    });

    test("retrieves cache entry with metadata and remaining countdown seconds strictly capped at 300s", async () => {
      await setPersistentCache("test_meta_1", { count: 42 }, 300);
      const entry = await getPersistentCacheWithMeta<{ count: number }>("test_meta_1");
      expect(entry).not.toBeNull();
      expect(entry?.value.count).toBe(42);
      expect(entry?.remainingSeconds).toBeGreaterThan(0);
      expect(entry?.remainingSeconds).toBeLessThanOrEqual(300);
      expect(entry?.expiry).toBeGreaterThan(Date.now());
    });

    test("getLatestActiveCache returns the most recently cached active entry", async () => {
      await setPersistentCache("products_filter_test", [{ id: "p99" }], 300);
      const latest = await getLatestActiveCache("products_");
      expect(latest).not.toBeNull();
      expect(latest?.remainingSeconds).toBeGreaterThan(0);
      expect(latest?.remainingSeconds).toBeLessThanOrEqual(300);
      expect(latest?.count).toBeGreaterThanOrEqual(1);
    });

    test("clears persistent cache by prefix", async () => {
      await setPersistentCache("products_a", [{ id: "1" }], 300);
      await setPersistentCache("products_b", [{ id: "2" }], 300);
      await setPersistentCache("orders_x", [{ id: "3" }], 300);

      const cleared = await clearCacheByPrefix("products_");
      expect(cleared).toBeGreaterThanOrEqual(2);

      const valA = await getPersistentCache("products_a");
      expect(valA).toBeNull();

      const valO = await getPersistentCache("orders_x");
      expect(valO).not.toBeNull();
    });

    test("computes persistent cache stats", async () => {
      const stats = await getPersistentCacheStats();
      expect(stats.count).toBeGreaterThanOrEqual(0);
      expect(typeof stats.totalSizeBytes).toBe("number");
    });

    test("retrieves L1 RAM cache in sub-millisecond latency (< 5ms)", async () => {
      await setPersistentCache("fast_l1_test", { fast: true }, 300);
      const start = performance.now();
      const val = await getPersistentCache<{ fast: boolean }>("fast_l1_test");
      const elapsed = performance.now() - start;
      expect(val?.fast).toBe(true);
      expect(elapsed).toBeLessThan(5);
    });

    test("tracks progressive hit count: Hit 1 -> Hit 2 -> Hit 3 (T4 eligibility)", () => {
      const testKey = "progressive_tier_lifecycle_test";
      resetProgressiveHitCount(testKey);

      expect(getProgressiveHitCount(testKey)).toBe(0);

      // Hit 1: API / Backend Cache T3
      const hit1 = incrementProgressiveHitCount(testKey);
      expect(hit1).toBe(1);
      expect(getProgressiveHitCount(testKey)).toBe(1);

      // Hit 2: Next.js Edge Data Cache T1
      const hit2 = incrementProgressiveHitCount(testKey);
      expect(hit2).toBe(2);
      expect(getProgressiveHitCount(testKey)).toBe(2);

      // Hit 3+: Eligible for Browser Persistent T4
      const hit3 = incrementProgressiveHitCount(testKey);
      expect(hit3).toBe(3);
      expect(getProgressiveHitCount(testKey)).toBeGreaterThanOrEqual(2);

      // Reset
      resetProgressiveHitCount(testKey);
      expect(getProgressiveHitCount(testKey)).toBe(0);
    });

    test("shared cache window expiry maintains steady monotonic countdown across categories without resetting", () => {
      resetSharedCacheWindowExpiry();
      const exp1 = getSharedCacheWindowExpiry();
      expect(exp1).toBeGreaterThan(Date.now());
      expect(exp1).toBeLessThanOrEqual(Date.now() + 300 * 1000);

      const exp2 = getSharedCacheWindowExpiry();
      expect(exp2).toBe(exp1);

      const exp3 = getSharedCacheWindowExpiry();
      expect(exp3).toBe(exp1);

      resetSharedCacheWindowExpiry();
    });
  });

  describe("Tier 1: Next.js & Edge Server Data Cache Route Handler", () => {
    test("POST endpoint purges Tier 1 Next.js products cache tag and resets hit counter", async () => {
      const res = await purgeTier1ProductsCache();
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain("Tier 1 Next.js products data cache purged successfully");
    });

    test("GET endpoint progresses from Tier 3 (First GET) to Tier 1 (Second GET)", async () => {
      await purgeTier1ProductsCache();

      const req1 = new NextRequest("http://localhost:3000/api/products?limit=5");
      const res1 = await getProductsRoute(req1);
      expect(res1.headers.get("X-Cache-Tier")).toBe("T3");
      expect(res1.headers.get("X-Cache-Hit-Count")).toBe("1");

      const req2 = new NextRequest("http://localhost:3000/api/products?limit=5");
      const res2 = await getProductsRoute(req2);
      expect(res2.headers.get("X-Cache-Tier")).toBe("T1");
      expect(res2.headers.get("X-Cache-Hit-Count")).toBe("2");
    });
  });

  describe("Direct Uncached API Route Handler (/api/products/direct)", () => {
    test("GET endpoint sends BYPASS cache headers and NONE cache tier", async () => {
      const req = new NextRequest("http://localhost:3000/api/products/direct?limit=10");
      const res = await getDirectProductsRoute(req);
      expect(res.headers.get("X-Cache")).toBe("BYPASS");
      expect(res.headers.get("X-Cache-Tier")).toBe("NONE");
      expect(res.headers.get("Cache-Control")).toContain("no-cache");
    });

    test("apiMetrics properly marks direct no-cache requests as isCache=false and tier=null", () => {
      let isCacheResult = true;
      let tierResult: any = "T1";
      const unsubscribe = apiMetrics.subscribe((endpoint, _ms, isCache, tier) => {
        if (endpoint.includes("/direct")) {
          isCacheResult = Boolean(isCache);
          tierResult = tier;
        }
      });

      apiMetrics.record("/api/products/direct", 18, false, null);
      expect(isCacheResult).toBe(false);
      expect(tierResult).toBeNull();
      unsubscribe();
    });
  });

  describe("Per-Tier Cache Invalidation Engine (purgeTier)", () => {
    test("purgeTier('T4') clears only Tier 4 browser cache and resets hit counter", async () => {
      await setPersistentCache("products_test_purge_t4", [{ id: "p1" }], 300);
      incrementProgressiveHitCount("products_test_purge_t4");

      const res = await purgeTier("T4");
      expect(res.success).toBe(true);
      expect(res.tier).toBe("T4");
      expect(res.message).toContain("T4 IndexedDB & RAM");

      const cached = await getPersistentCache("products_test_purge_t4");
      expect(cached).toBeNull();
      expect(getProgressiveHitCount("products_test_purge_t4")).toBe(0);
    });

    test("purgeTier('T1') executes successfully and reports T1 purged", async () => {
      const res = await purgeTier("T1");
      expect(res.success).toBe(true);
      expect(res.tier).toBe("T1");
      expect(res.message).toContain("T1 Next.js Edge");
    });

    test("purgeTier('T3') reports T3 backend CQRS cache purged", async () => {
      const res = await purgeTier("T3");
      expect(res.success).toBe(true);
      expect(res.tier).toBe("T3");
      expect(res.message).toContain("T3 Backend CQRS");
    });

    test("purgeTier('all') purges all tiers simultaneously", async () => {
      await setPersistentCache("products_all_test", [{ id: "p2" }], 300);
      const res = await purgeTier("all");
      expect(res.success).toBe(true);
      expect(res.tier).toBe("all");
      expect(res.message).toContain("T4 IndexedDB & RAM");
      expect(res.message).toContain("T1 Next.js Edge");
      expect(res.message).toContain("T3 Backend CQRS");

      const cached = await getPersistentCache("products_all_test");
      expect(cached).toBeNull();
    });

    test("POST /api/products?tier=T3 executes T3 backend cache purge", async () => {
      const req = new NextRequest("http://localhost:3000/api/products?tier=T3", { method: "POST" });
      const res = await purgeTier1ProductsCache(req);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.tier).toBe("T3");
      expect(body.message).toContain("Tier 3 Backend CQRS");
    });

    test("POST /api/products?tier=T1 executes T1 Edge cache purge", async () => {
      const req = new NextRequest("http://localhost:3000/api/products?tier=T1", { method: "POST" });
      const res = await purgeTier1ProductsCache(req);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.tier).toBe("T1");
      expect(body.message).toContain("Tier 1 Next.js");
    });
  });
});
