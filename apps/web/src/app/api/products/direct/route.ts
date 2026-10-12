import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.INTERNAL_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  "http://localhost:8080";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Direct Uncached Products API Route Handler
 * Explicitly bypasses all caching tiers (T1 ISR, T3 CQRS, T4 IndexedDB).
 * Hits PostgreSQL database directly with live real-time latency.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = new URLSearchParams(searchParams.toString());
  params.set("no_cache", "true");
  const qs = params.toString();
  const upstreamUrl = `${GATEWAY_URL}/api/v1/products?${qs}`;

  const startTime = performance.now();

  try {
    const upstreamHeaders: Record<string, string> = {
      Accept: "application/json",
      "X-App-Client": "tstore-nextjs-web-direct",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-No-Cache": "true",
    };
    const incomingTraceparent = request.headers.get("traceparent");
    if (incomingTraceparent) {
      upstreamHeaders["traceparent"] = incomingTraceparent;
    }

    const upstreamRes = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: upstreamHeaders,
    });

    const elapsed = Math.round(performance.now() - startTime);

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: `UPSTREAM_${upstreamRes.status}`,
            message: `Gateway returned status ${upstreamRes.status}`,
          },
        },
        {
          status: upstreamRes.status,
          headers: {
            "X-Cache": "BYPASS",
            "X-Cache-Tier": "NONE",
            "X-Response-Time": String(elapsed),
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    }

    const data = await upstreamRes.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "X-Cache": "BYPASS",
        "X-Cache-Tier": "NONE",
        "X-Response-Time": String(elapsed),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error: any) {
    const elapsed = Math.round(performance.now() - startTime);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GATEWAY_ERROR",
          message: error?.message || "Failed to fetch directly from API gateway",
        },
      },
      {
        status: 502,
        headers: {
          "X-Cache": "BYPASS",
          "X-Cache-Tier": "NONE",
          "X-Response-Time": String(elapsed),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}
