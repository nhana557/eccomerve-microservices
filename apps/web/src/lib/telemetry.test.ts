import { expect, test, describe } from "bun:test";
import { generateTraceParent, parseTraceParent } from "./telemetry";
import { apiRequestWithMeta } from "./api-client";

describe("W3C Trace Context Telemetry Helper", () => {
  test("generates valid W3C traceparent header format", () => {
    const traceparent = generateTraceParent();
    // Format: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
    const regex = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;
    expect(regex.test(traceparent)).toBe(true);
  });

  test("parses trace ID and span ID correctly", () => {
    const header = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const parsed = parseTraceParent(header);
    expect(parsed?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(parsed?.spanId).toBe("00f067aa0ba902b7");
  });

  test("apiRequestWithMeta attaches traceparent header to outgoing requests", async () => {
    const originalFetch = globalThis.fetch;
    let sentHeaders: HeadersInit | undefined;

    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      sentHeaders = init?.headers;
      return new Response(JSON.stringify({ success: true, data: { status: "ok" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      await apiRequestWithMeta("/api/v1/health");
      const headers = sentHeaders as Record<string, string>;
      expect(headers).toBeDefined();
      expect(headers["traceparent"]).toBeDefined();
      expect(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/.test(headers["traceparent"])).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("exportTraceSpan posts client span to /api/telemetry/traces", async () => {
    const originalFetch = globalThis.fetch;
    let postedPayload: any = null;

    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      if (String(url).includes("/api/telemetry/traces")) {
        postedPayload = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response("OK", { status: 200 });
    }) as any;

    try {
      // Mock window
      (globalThis as any).window = {};
      const { exportTraceSpan } = await import("./telemetry");
      await exportTraceSpan({
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
        name: "[FE] GET /api/v1/products",
        startTimeMs: Date.now() - 50,
        durationMs: 50,
        statusCode: 200,
      });

      expect(postedPayload).toBeDefined();
      expect(postedPayload.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(postedPayload.spanId).toBe("00f067aa0ba902b7");
      expect(postedPayload.name).toBe("[FE] GET /api/v1/products");
    } finally {
      delete (globalThis as any).window;
      globalThis.fetch = originalFetch;
    }
  });
});
