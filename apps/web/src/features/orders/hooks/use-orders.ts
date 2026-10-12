"use client";

import { useState, useEffect, useCallback } from "react";
import { Order, CreateOrderInput } from "../types";
import { CartItem } from "../../cart/types";
import { Payment } from "../../payments/types";
import { orderApi } from "../api/order-api";
import { paymentApi } from "../../payments/api/payment-api";
import { useToast } from "@/components/feedback/ToastContext";

export function buildCreateOrderPayload(
  userId: string,
  cartItems: CartItem[],
  promoCode?: string,
  discountAmount?: number,
  finalAmount?: number
): CreateOrderInput {
  return {
    user_id: userId,
    promo_code: promoCode,
    discount_amount: discountAmount,
    final_amount: finalAmount,
    items: cartItems.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
    })),
  };
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const data = await orderApi.getOrders();
      setOrders(data);
      setResponseTime(Math.round(performance.now() - start));
    } catch (err: any) {
      setError(err.message || "Gagal memuat daftar pesanan");
      setOrders([]);
      setResponseTime(Math.round(performance.now() - start));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const checkoutOrder = async (
    userId: string,
    cartItems: CartItem[],
    paymentMethod: string,
    totalPrice: number,
    promoCode?: string,
    discountAmount?: number,
    finalAmount?: number
  ): Promise<{ order: Order; payment: Payment }> => {
    try {
      const chargeAmount = finalAmount !== undefined ? finalAmount : totalPrice;
      const payload = buildCreateOrderPayload(userId, cartItems, promoCode, discountAmount, chargeAmount);
      const order = await orderApi.createOrder(payload);

      // Inisiasi payment record ke payment-service
      const payment = await paymentApi.createPayment({
        order_id: order.id,
        amount: chargeAmount,
        payment_method: paymentMethod,
      });

      setOrders((prev) => [order, ...prev]);
      showToast("success", "Pesanan Berhasil Dibuat!", order?.id ? `Order ID: ${order.id.slice(0, 8)}...` : "Pesanan tersimpan");
      return { order, payment };
    } catch (err: any) {
      showToast("error", "Checkout Gagal", err.message);
      throw err;
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await orderApi.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
      );
      showToast("success", "Status Order Diperbarui", `Order diubah menjadi ${newStatus}.`);
    } catch (err: any) {
      showToast("error", "Gagal Memperbarui Status", err.message);
      throw err;
    }
  };

  return {
    orders,
    isLoading,
    responseTime,
    error,
    fetchOrders,
    checkoutOrder,
    updateStatus,
  };
}
