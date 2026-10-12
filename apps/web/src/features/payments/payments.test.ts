import { expect, test, describe } from "bun:test";
import { formatPaymentMethod } from "./layouts/PaymentHistoryTable";
import { paymentApi } from "./api/payment-api";

describe("Payments Domain Logic", () => {
  test("formatPaymentMethod humanizes raw enum keys", () => {
    expect(formatPaymentMethod("CREDIT_CARD")).toBe("Kartu Kredit");
    expect(formatPaymentMethod("BANK_TRANSFER")).toBe("Transfer Bank");
    expect(formatPaymentMethod("E_WALLET")).toBe("E-Wallet");
  });

  test("paymentApi.simulatePayment passes failure payload to gateway", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = "";
    let sentBody: any;

    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      requestedUrl = String(url);
      sentBody = init?.body ? JSON.parse(init.body as string) : null;
      return new Response(JSON.stringify({
        success: false,
        error: { code: "PAYMENT_FAILED", message: "Simulasi pembayaran gagal" }
      }), {
        status: 402,
        headers: { "Content-Type": "application/json" }
      });
    }) as any;

    try {
      await expect(
        paymentApi.simulatePayment("pay-123", { action: "fail", reason: "Saldo tidak cukup" })
      ).rejects.toThrow("Simulasi pembayaran gagal");

      expect(requestedUrl).toContain("/api/v1/payments/pay-123/simulate");
      expect(sentBody?.action).toBe("fail");
      expect(sentBody?.reason).toBe("Saldo tidak cukup");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("paymentApi.simulateRaceConditionWebhook triggers parallel webhook requests", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];

    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      calls.push(String(url));
      return new Response(JSON.stringify({
        success: true,
        data: { status: "OK", swapped: calls.length === 1 }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as any;

    try {
      const res = await paymentApi.simulateRaceConditionWebhook("pay-race-1", "ord-race-1");
      expect(calls.length).toBe(2);
      expect(calls[0]).toContain("/api/v1/payments/webhook");
      expect(calls[1]).toContain("/api/v1/payments/webhook");
      expect(res.results.length).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
