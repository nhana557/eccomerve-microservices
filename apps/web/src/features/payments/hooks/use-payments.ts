"use client";

import { useState, useEffect, useCallback } from "react";
import { Payment } from "../types";
import { paymentApi } from "../api/payment-api";
import { useToast } from "@/components/feedback/ToastContext";

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const data = await paymentApi.getPayments();
      setPayments(data);
      setResponseTime(Math.round(performance.now() - start));
    } catch (err: any) {
      setError(err.message || "Gagal memuat log pembayaran");
      setPayments([]);
      setResponseTime(Math.round(performance.now() - start));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const updateStatus = async (paymentId: string, newStatus: string) => {
    try {
      await paymentApi.updatePaymentStatus(paymentId, newStatus);
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: newStatus as any } : p))
      );
      showToast("success", "Status Pembayaran Berhasil Diupdate", `Pembayaran diubah ke ${newStatus}.`);
    } catch (err: any) {
      showToast("error", "Gagal Update Pembayaran", err.message);
      throw err;
    }
  };

  return {
    payments,
    isLoading,
    responseTime,
    error,
    fetchPayments,
    updateStatus,
  };
}
