"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPersistentCacheStats,
  clearCacheByPrefix,
  getLatestActiveCache,
  resetSharedCacheWindowExpiry,
  purgeTier,
  CacheTierKey,
  PersistentCacheStats,
  LatestActiveCacheInfo,
} from "@/lib/persistentCache";
import { apiCacheTracker, ApiEndpointCacheInfo } from "@/lib/api-client";
import { formatCountdownString } from "@/lib/table-helpers";

export interface CacheTierInfo {
  tier: number;
  name: string;
  shortName: string;
  medium: string;
  location: string;
  ttl: string;
  isStored: boolean;
  latencyLabel: string;
  description: string;
  details?: string;
  itemCount?: number;
  sizeBytes?: number;
  remainingSeconds?: number | null;
}

export function useCacheTiers(activeProductCount: number = 0) {
  const [stats, setStats] = useState<PersistentCacheStats>({
    count: 0,
    totalSizeBytes: 0,
    keys: [],
  });
  const [activeExpiry, setActiveExpiry] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [recentApiCaches, setRecentApiCaches] = useState<ApiEndpointCacheInfo[]>([]);
  const [isPurging, setIsPurging] = useState(false);
  const [purgingTier, setPurgingTier] = useState<CacheTierKey | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const s = await getPersistentCacheStats();
      setStats(s);
      const latest = await getLatestActiveCache("products_");
      if (latest && latest.expiry > Date.now()) {
        setActiveExpiry((prev) => (prev && prev > Date.now() ? Math.min(prev, latest.expiry) : latest.expiry));
        setRemainingSeconds(latest.remainingSeconds);
      }
      setRecentApiCaches(apiCacheTracker.getAll());
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    refreshStats();

    const handleUpdate = (e: any) => {
      refreshStats();
      if (e?.detail?.expiry) {
        // Monotonic guard: Never reset countdown back up to 300s if active window is ticking down
        setActiveExpiry((prev) => {
          if (prev && prev > Date.now()) {
            return Math.min(prev, e.detail.expiry);
          }
          return e.detail.expiry;
        });
      }
    };

    const handleApiCache = (e: any) => {
      setRecentApiCaches(apiCacheTracker.getAll());
      if (e?.detail?.expiry) {
        // Monotonic guard: Never reset countdown back up to 300s if active window is ticking down
        setActiveExpiry((prev) => {
          if (prev && prev > Date.now()) {
            return Math.min(prev, e.detail.expiry);
          }
          return e.detail.expiry;
        });
      }
    };

    window.addEventListener("tstore:cache-updated", handleUpdate);
    window.addEventListener("tstore:api-cache-updated", handleApiCache);
    return () => {
      window.removeEventListener("tstore:cache-updated", handleUpdate);
      window.removeEventListener("tstore:api-cache-updated", handleApiCache);
    };
  }, [refreshStats]);

  // Live countdown tick every 1000ms: Smoothly counts down toward 0s without jumping
  useEffect(() => {
    const tick = () => {
      if (activeExpiry && activeExpiry > Date.now()) {
        const diff = Math.min(300, Math.max(0, Math.floor((activeExpiry - Date.now()) / 1000)));
        setRemainingSeconds(diff);
      } else {
        setRemainingSeconds(null);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeExpiry]);

  const handlePurgeTier = useCallback(
    async (tier: CacheTierKey = "all") => {
      setIsPurging(true);
      setPurgingTier(tier);
      try {
        await purgeTier(tier);
        if (tier === "all" || tier.toLowerCase() === "t4") {
          setActiveExpiry(null);
          setRemainingSeconds(null);
        }
        await refreshStats();
      } finally {
        setIsPurging(false);
        setPurgingTier(null);
      }
    },
    [refreshStats]
  );

  const purgeCache = useCallback(async () => {
    await handlePurgeTier("all");
  }, [handlePurgeTier]);

  const countdownText = formatCountdownString(remainingSeconds);

  const tiers: CacheTierInfo[] = [
    {
      tier: 1,
      name: "Edge & Next.js Data Cache",
      shortName: "Edge",
      medium: "Next.js Server & Edge Node",
      location: "Next.js Route /api/products",
      ttl: "5 Menit (300s ISR)",
      isStored: true,
      latencyLabel: "15 - 30 ms",
      description: "Next.js Data Cache & Edge ISR 5 menit (300s) dengan tag invalidation",
    },
    {
      tier: 2,
      name: "SSR Zero-Downtime Seed Fallback",
      shortName: "Fallback",
      medium: "In-Memory Bundle Server",
      location: "Next.js Server Runtime",
      ttl: "5 Menit (300s Snapshot)",
      isStored: true,
      latencyLabel: "0 ms (Offline-proof)",
      description: "Seed fallback snapshot disinkronisasi setiap 5 menit (300s)",
      details: "12 SKU Curated Seed (TTL 5 Menit)",
    },
    {
      tier: 3,
      name: "Backend Redis & CQRS Read-Model",
      shortName: "Redis/BE",
      medium: "RAM Redis & Go Concurrency",
      location: "Cluster Microservices",
      ttl: "5 Menit (300s CQRS RAM)",
      isStored: true,
      latencyLabel: "1 - 3 ms",
      description: "Pemisahan alur Write & Read in-memory cache dengan TTL 5 menit (300s)",
      details: "CQRS Read-Model RAM (TTL 5 Menit)",
    },
    {
      tier: 4,
      name: "Browser IndexedDB Persistent",
      shortName: "IndexedDB",
      medium: "Disk Lokal Perangkat Pengguna",
      location: "Browser Client (Async Worker)",
      ttl: "5 Menit (300s IndexedDB)",
      isStored: stats.count > 0,
      latencyLabel: remainingSeconds !== null && remainingSeconds > 0 ? `TTL: ${countdownText}` : "1 - 5 ms",
      description: "Penyimpanan persisten non-blocking disk browser (TTL 5 menit / 300s)",
      itemCount: stats.count,
      sizeBytes: stats.totalSizeBytes,
      remainingSeconds,
      details:
        stats.count > 0
          ? remainingSeconds !== null && remainingSeconds > 0
            ? `${stats.count} key | TTL sisa: ${countdownText}`
            : `${stats.count} cache key tersimpan`
          : "Menunggu pembacaan pertama",
    },
    {
      tier: 5,
      name: "Client Reactive State",
      shortName: "RAM",
      medium: "RAM Browser (React Heap)",
      location: "Browser Main Thread",
      ttl: "5 Menit (300s RAM Heap)",
      isStored: activeProductCount > 0,
      latencyLabel: "< 0.1 ms",
      description: "Client state in-memory React dengan siklus validasi 5 menit (300s)",
      itemCount: activeProductCount,
      details: activeProductCount > 0 ? `${activeProductCount} SKU di RAM Heap (TTL 5 Menit)` : "Kosong",
    },
  ];

  const storedCount = tiers.filter((t) => t.isStored).length;

  return {
    tiers,
    storedCount,
    totalTiers: tiers.length,
    stats,
    isPurging,
    purgingTier,
    purgeTier: handlePurgeTier,
    purgeCache,
    refreshStats,
    remainingSeconds,
    countdownText,
    recentApiCaches,
  };
}
