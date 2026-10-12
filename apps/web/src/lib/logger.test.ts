import { expect, test, describe } from "bun:test";
import { frontendLogger, LogEntry } from "./logger";

describe("Frontend Logger Client", () => {
  test("buffers and flushes logs to telemetry endpoint", async () => {
    let sentLogs: LogEntry[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      if (String(url).includes("/api/telemetry/logs")) {
        sentLogs = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response("OK", { status: 200 });
    }) as any;

    try {
      frontendLogger.info("Test page viewed", {
        trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
        span_id: "00f067aa0ba902b7",
        fullUrl: "/checkout",
        method: "GET",
      });

      await frontendLogger.flush();

      expect(sentLogs.length).toBeGreaterThan(0);
      expect(sentLogs[0].msg).toBe("Test page viewed");
      expect(sentLogs[0].level).toBe("INFO");
      expect(sentLogs[0].service_name).toBe("web-frontend");
      expect(sentLogs[0].method).toBe("GET");
      expect(sentLogs[0].fullUrl).toBe("/checkout");
      expect(sentLogs[0].span_id).toBe("00f067aa0ba902b7");
      expect(sentLogs[0].trace_id).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(sentLogs[0].time).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
