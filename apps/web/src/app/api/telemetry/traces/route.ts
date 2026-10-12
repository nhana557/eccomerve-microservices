import { NextResponse } from "next/server";
import { parseGeoHeaders } from "@/lib/geo";

const ALLOY_URL =
  process.env.ALLOY_URL ||
  (process.env.NODE_ENV === "production" ? "http://alloy:4318" : "http://localhost:4318");

export async function POST(request: Request) {
  try {
    const geo = parseGeoHeaders(request.headers);
    const item = await request.json();
    if (!item.traceId || !item.spanId) {
      return NextResponse.json(
        { success: false, error: "Missing traceId or spanId" },
        { status: 400 }
      );
    }

    const startNano = `${item.startTimeMs || Date.now()}000000`;
    const endNano = `${(item.startTimeMs || Date.now()) + (item.durationMs || 10)}000000`;

    const spanAttrs: any[] = [
      { key: "service.name", value: { stringValue: "web-frontend" } },
      { key: "client.ip", value: { stringValue: geo.clientIP } },
      { key: "client.address", value: { stringValue: geo.clientIP } },
      { key: "client.location", value: { stringValue: geo.clientLocation } },
    ];
    const userAgent = request.headers.get("user-agent");
    if (userAgent) {
      spanAttrs.push({ key: "user_agent", value: { stringValue: userAgent } });
    }

    if (item.statusCode) {
      spanAttrs.push({
        key: "http.response.status_code",
        value: { intValue: item.statusCode },
      });
      spanAttrs.push({
        key: "statusCode",
        value: { intValue: item.statusCode },
      });
    }
    if (item.attributes) {
      for (const [k, v] of Object.entries(item.attributes)) {
        if (typeof v === "number") {
          spanAttrs.push({ key: k, value: { intValue: Math.round(v) } });
        } else if (typeof v === "boolean") {
          spanAttrs.push({ key: k, value: { boolValue: v } });
        } else {
          spanAttrs.push({ key: k, value: { stringValue: String(v) } });
        }
      }
    }

    const otlpPayload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "web-frontend" } },
            ],
          },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: item.traceId,
                  spanId: item.spanId,
                  name: item.name || "Frontend Request",
                  kind: 1, // SPAN_KIND_INTERNAL
                  startTimeUnixNano: startNano,
                  endTimeUnixNano: endNano,
                  status: {
                    code: item.statusCode && item.statusCode >= 400 ? 2 : 1,
                    message:
                      item.statusCode && item.statusCode >= 400
                        ? `HTTP ${item.statusCode}`
                        : "",
                  },
                  attributes: spanAttrs,
                },
              ],
            },
          ],
        },
      ],
    };

    fetch(`${ALLOY_URL}/v1/traces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(otlpPayload),
    }).catch(() => {
      // Non-blocking trace export failure
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message },
      { status: 400 }
    );
  }
}
