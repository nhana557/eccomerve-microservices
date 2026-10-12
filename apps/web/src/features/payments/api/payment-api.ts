import { apiRequest } from "../../../lib/api-client";
import { Payment, CreatePaymentInput } from "../types";

export const paymentApi = {
  getPayments: async (): Promise<Payment[]> => {
    const res = await apiRequest<{ payments: Payment[]; total: number }>("/api/v1/payments");
    return res.payments || [];
  },

  getPaymentByID: async (id: string): Promise<Payment> => {
    return apiRequest<Payment>(`/api/v1/payments/${id}`);
  },

  createPayment: async (data: CreatePaymentInput): Promise<Payment> => {
    return apiRequest<Payment>("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updatePaymentStatus: async (id: string, status: string): Promise<void> => {
    await apiRequest(`/api/v1/payments/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  simulatePayment: async (
    id: string,
    options?: { action?: "success" | "fail"; status?: "SUCCESS" | "FAILED"; reason?: string }
  ): Promise<Payment> => {
    return apiRequest<Payment>(`/api/v1/payments/${id}/simulate`, {
      method: "POST",
      body: options ? JSON.stringify(options) : undefined,
    });
  },

  sendWebhook: async (payload: {
    payment_id?: string;
    order_id?: string;
    transaction_status: string;
    reason?: string;
  }): Promise<any> => {
    return apiRequest<any>("/api/v1/payments/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  simulateRaceConditionWebhook: async (
    paymentId: string,
    orderId: string
  ): Promise<{ results: any[] }> => {
    const req1 = apiRequest<any>("/api/v1/payments/webhook", {
      method: "POST",
      body: JSON.stringify({
        payment_id: paymentId,
        order_id: orderId,
        transaction_status: "settlement",
      }),
    });
    const req2 = apiRequest<any>("/api/v1/payments/webhook", {
      method: "POST",
      body: JSON.stringify({
        payment_id: paymentId,
        order_id: orderId,
        transaction_status: "settlement",
      }),
    });
    const results = await Promise.all([req1, req2]);
    return { results };
  },
};
