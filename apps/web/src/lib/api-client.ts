import type { ApiResponse } from "@/types/api";
import { generateTraceParent, parseTraceParent, exportTraceSpan } from "./telemetry";
import { frontendLogger } from "./logger";

export function getGatewayUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_GATEWAY_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    const hostname = window.location.hostname;
    if (hostname.includes("taryana.my.id")) {
      return `${window.location.protocol}//gateway.taryana.my.id`;
    }
    if (envUrl) {
      return envUrl;
    }
  }
  return (
    process.env.INTERNAL_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    "http://localhost:8080"
  );
}

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

export async function getAuthToken(): Promise<string | null> {
  if (authTokenGetter) {
    try {
      return await authTokenGetter();
    } catch {
      return null;
    }
  }
  return null;
}

export interface ApiRequestOptions extends RequestInit {
  onResponseTime?: (ms: number) => void;
}

export interface ApiResultWithMeta<T> {
  data: T;
  responseTimeMs: number;
  responseSizeBytes?: number;
  cacheTier?: CacheTierLabel;
  isCache?: boolean;
}

export type CacheTierLabel = "T1" | "T2" | "T3" | "T4" | "T5" | null;

// Global metrics store for tracking recent latency and cache tier per endpoint prefix
export const apiMetrics = {
  lastResponseTimes: new Map<string, number>(),
  lastSources: new Map<string, "network" | "cache">(),
  lastTiers: new Map<string, CacheTierLabel>(),
  listeners: new Set<(endpoint: string, ms: number, isCache?: boolean, tier?: CacheTierLabel) => void>(),

  subscribe(fn: (endpoint: string, ms: number, isCache?: boolean, tier?: CacheTierLabel) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  },

  record(endpoint: string, ms: number, isCache: boolean = false, tier: CacheTierLabel = null) {
    this.lastResponseTimes.set(endpoint, ms);
    this.lastSources.set(endpoint, isCache ? "cache" : "network");
    this.lastTiers.set(endpoint, tier);
    this.listeners.forEach((fn) => fn(endpoint, ms, isCache, tier));
  },

  getLatest(endpointPrefix: string): { ms: number; isCache: boolean; tier: CacheTierLabel } | undefined {
    for (const [key, val] of this.lastResponseTimes.entries()) {
      if (key.includes(endpointPrefix)) {
        return {
          ms: val,
          isCache: this.lastSources.get(key) === "cache",
          tier: this.lastTiers.get(key) || null,
        };
      }
    }
    return undefined;
  },
};

export interface ApiEndpointCacheInfo {
  endpoint: string;
  method: string;
  timestamp: number;
  ttlSeconds: number;
  expiry: number;
  responseTimeMs: number;
  cacheTier?: CacheTierLabel;
}

// Global registry for tracking TTL countdown per API endpoint
export const apiCacheTracker = {
  registry: new Map<string, ApiEndpointCacheInfo>(),
  listeners: new Set<(items: ApiEndpointCacheInfo[]) => void>(),

  record(
    endpoint: string,
    method: string = "GET",
    responseTimeMs: number = 0,
    ttlSeconds: number = 300,
    cacheTier: CacheTierLabel = null,
    explicitExpiry?: number
  ) {
    const now = Date.now();
    const expiry = explicitExpiry && explicitExpiry > now
      ? explicitExpiry
      : now + ttlSeconds * 1000;
    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));

    const item: ApiEndpointCacheInfo = {
      endpoint,
      method,
      timestamp: now,
      ttlSeconds: remaining,
      expiry,
      responseTimeMs,
      cacheTier,
    };
    this.registry.set(endpoint, item);
    this.listeners.forEach((fn) => fn(Array.from(this.registry.values())));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tstore:api-cache-updated", { detail: item }));
    }
  },

  getAll(): ApiEndpointCacheInfo[] {
    return Array.from(this.registry.values());
  },

  getLatest(): ApiEndpointCacheInfo | undefined {
    let latest: ApiEndpointCacheInfo | undefined;
    for (const v of this.registry.values()) {
      if (!latest || v.timestamp > latest.timestamp) {
        latest = v;
      }
    }
    return latest;
  },

  subscribe(fn: (items: ApiEndpointCacheInfo[]) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  },
};

export function parseApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error?.message || "Unknown API error occurred");
  }
  return response.data as T;
}

export async function apiRequestWithMeta<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<ApiResultWithMeta<T>> {
  const startTime = performance.now();
  let url = endpoint;
  const traceparent = generateTraceParent();
  const parsedTrace = parseTraceParent(traceparent);
  const queryStr = endpoint.includes("?") ? endpoint.split("?")[1] : undefined;
  if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
    const gateway = getGatewayUrl();
    if (endpoint.startsWith("/api/products") && typeof window !== "undefined") {
      // In browser, route to Next.js local Route Handler (/api/products or /api/products/direct)
      url = endpoint;
    } else if (endpoint.startsWith("/api/products/direct")) {
      // Server/Node runtime direct fallback
      const qs = endpoint.includes("?") ? endpoint.split("?")[1] : "";
      url = `${gateway}/api/v1/products/direct${qs ? `?${qs}` : ""}`;
    } else if (endpoint.startsWith("/api/products")) {
      // Server/Node runtime fallback
      const qs = endpoint.includes("?") ? endpoint.split("?")[1] : "";
      url = `${gateway}/api/v1/products${qs ? `?${qs}` : ""}`;
    } else {
      url = `${gateway}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    }
  }

  try {
    const token = await getAuthToken();
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      traceparent,
      ...((options?.headers as Record<string, string>) || {}),
    };
    if (token && !reqHeaders["Authorization"]) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }

    const abortSignal =
      options?.signal ||
      (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(45000)
        : undefined);

    const res = await fetch(url, {
      ...options,
      headers: reqHeaders,
      cache: "no-store",
      signal: abortSignal,
    });

    const elapsed = Math.round(performance.now() - startTime);
    const headerTime = res.headers.get("X-Response-Time");
    const parsedHeader = headerTime ? parseInt(headerTime, 10) : NaN;
    // Prefer the client-perceived roundtrip elapsed time, which reflects realistic user experience
    const responseTimeMs = elapsed > 0 ? elapsed : !isNaN(parsedHeader) ? parsedHeader : 1;

    const xCache = res.headers.get("X-Cache");
    const cacheHeader = res.headers.get("X-Cache-Tier");
    const nextjsCache = res.headers.get("x-nextjs-cache");
    const cfCache = res.headers.get("cf-cache-status");
    const isExplicitBypass =
      xCache === "BYPASS" ||
      cacheHeader === "NONE" ||
      endpoint.includes("/direct") ||
      endpoint.includes("no_cache=true") ||
      Boolean(options?.headers && (options.headers as any)["Cache-Control"]?.includes("no-cache"));

    let cacheTier: CacheTierLabel = null;
    let isCache = false;

    if (!isExplicitBypass) {
      if (cacheHeader === "T1" || cacheHeader === "T2" || cacheHeader === "T3" || cacheHeader === "T4") {
        cacheTier = cacheHeader as CacheTierLabel;
        isCache = true;
      } else if (endpoint.startsWith("/api/products") && !endpoint.includes("/direct")) {
        cacheTier = "T1";
        isCache = true;
      } else if (nextjsCache === "HIT" || cfCache === "HIT") {
        cacheTier = "T1";
        isCache = true;
      }
    }

    apiMetrics.record(endpoint, responseTimeMs, isCache, cacheTier);
    if (isCache) {
      apiCacheTracker.record(endpoint, options?.method || "GET", responseTimeMs, 300, cacheTier);
    }
    if (options?.onResponseTime) {
      options.onResponseTime(responseTimeMs);
    }

    if (typeof window !== "undefined") {
      const color = responseTimeMs < 100 ? "#10b981" : responseTimeMs < 300 ? "#06b6d4" : "#f59e0b";
      console.log(
        `%c[API ${options?.method || "GET"}] %c${endpoint} %c${res.status} OK (${responseTimeMs}ms) [${cacheTier || "LIVE"}]`,
        "color: #8b5cf6; font-weight: bold;",
        "color: #38bdf8;",
        `color: ${color}; font-weight: bold;`
      );
    }

    const metaAttrs = {
      trace_id: parsedTrace?.traceId,
      span_id: parsedTrace?.spanId,
      method: options?.method || "GET",
      fullUrl: endpoint,
      statusCode: res.status,
    };

    if (responseTimeMs >= 8000) {
      frontendLogger.error(
        `[SLOW API CRITICAL > 8s] [FE] ${options?.method || "GET"} ${endpoint} - ${res.status} (${(responseTimeMs / 1000).toFixed(2)}s)`,
        metaAttrs
      );
    } else if (responseTimeMs >= 5000) {
      frontendLogger.warn(
        `[SLOW API WARNING > 5s] [FE] ${options?.method || "GET"} ${endpoint} - ${res.status} (${(responseTimeMs / 1000).toFixed(2)}s)`,
        metaAttrs
      );
    } else if (res.ok) {
      frontendLogger.info(
        `[FE] ${options?.method || "GET"} ${endpoint} - ${res.status}`,
        metaAttrs
      );
    } else {
      frontendLogger.warn(
        `[FE] ${options?.method || "GET"} ${endpoint} - ${res.status}`,
        metaAttrs
      );
    }

    if (parsedTrace) {
      exportTraceSpan({
        traceId: parsedTrace.traceId,
        spanId: parsedTrace.spanId,
        name: `[FE] ${options?.method || "GET"} ${endpoint.split("?")[0]}`,
        startTimeMs: Date.now() - responseTimeMs,
        durationMs: responseTimeMs,
        statusCode: res.status,
        attributes: {
          method: options?.method || "GET",
          "http.method": options?.method || "GET",
          statusCode: res.status,
          "http.status_code": res.status,
          fullUrl: endpoint,
          "url.full": endpoint,
          "url.path": endpoint.split("?")[0],
          query: queryStr || "",
          "url.query": queryStr || "",
          duration_ms: responseTimeMs,
          cache_tier: cacheTier || "LIVE",
        },
      });
    }

    const text = await res.text();
    const responseSizeBytes = new TextEncoder().encode(text).length;
    const json = JSON.parse(text) as ApiResponse<T>;
    const data = parseApiResponse(json);
    return { data, responseTimeMs, responseSizeBytes, cacheTier, isCache };
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - startTime);
    apiMetrics.record(endpoint, elapsed);
    if (options?.onResponseTime) {
      options.onResponseTime(elapsed);
    }

    frontendLogger.error(
      `[FE Error] ${endpoint} - ${err?.message || "Request failed"}`,
      {
        trace_id: parsedTrace?.traceId,
        span_id: parsedTrace?.spanId,
        method: options?.method || "GET",
        fullUrl: endpoint,
        statusCode: 500,
      }
    );

    if (parsedTrace) {
      exportTraceSpan({
        traceId: parsedTrace.traceId,
        spanId: parsedTrace.spanId,
        name: `[FE] ${options?.method || "GET"} ${endpoint.split("?")[0]}`,
        startTimeMs: Date.now() - elapsed,
        durationMs: elapsed,
        statusCode: 500,
        attributes: {
          method: options?.method || "GET",
          "http.method": options?.method || "GET",
          statusCode: 500,
          "http.status_code": 500,
          fullUrl: endpoint,
          "url.full": endpoint,
          "url.path": endpoint.split("?")[0],
          query: queryStr || "",
          "url.query": queryStr || "",
          duration_ms: elapsed,
          "error.message": err?.message || "Failed",
          "error.type": "NetworkError",
        },
      });
    }

    if (err instanceof Error) {
      throw err;
    }
    throw new Error(err?.message || "Network request failed");
  }
}

export async function apiRequest<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  const result = await apiRequestWithMeta<T>(endpoint, options);
  return result.data;
}

export const fetchFromGateway = apiRequest;
