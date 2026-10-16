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
      frontendLogger.clear();

      frontendLogger.info("Test page viewed", {
        trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
        span_id: "00f067aa0ba902b7",
        fullUrl: "/checkout",
        method: "GET",
      });

      await frontendLogger.flush();

      expect(sentLogs.length).toBeGreaterThan(0);
      const testLog = sentLogs.find((l) => l.msg === "Test page viewed");
      expect(testLog).toBeDefined();
      expect(testLog!.msg).toBe("Test page viewed");
      expect(testLog!.level).toBe("INFO");
      expect(testLog!.service_name).toBe("web-frontend");
      expect(testLog!.method).toBe("GET");
      expect(testLog!.fullUrl).toBe("/checkout");
      expect(testLog!.span_id).toBe("00f067aa0ba902b7");
      expect(testLog!.trace_id).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(testLog!.time).toBeDefined();
    } finally {
      frontendLogger.clear();
      globalThis.fetch = originalFetch;
    }
  });
});
