"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Product } from "../../products/types";
import { CartItem } from "../types";
import { useToast } from "@/components/feedback/ToastContext";

export function calculateCartTotals(items: CartItem[]): { totalPrice: number; totalItems: number } {
  return items.reduce(
    (acc, item) => ({
      totalPrice: acc.totalPrice + item.product.price * item.quantity,
      totalItems: acc.totalItems + item.quantity,
    }),
    { totalPrice: 0, totalItems: 0 }
  );
}

export function calculateFinalPrice(totalPrice: number, discountAmount: number): number {
  const result = totalPrice - discountAmount;
  return result > 0 ? result : 0;
}

export interface AppliedPromo {
  code: string;
  title: string;
  discountAmount: number;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  appliedPromo: AppliedPromo | null;
  discountAmount: number;
  finalPrice: number;
  applyPromo: (code: string) => Promise<{ success: boolean; message?: string }>;
  removePromo: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const { showToast } = useToast();

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity }];
    });
    showToast("success", "Ditambahkan ke Keranjang", `${product.name} telah ditambahkan.`);
  }, [showToast]);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedPromo(null);
  }, []);

  const { totalPrice, totalItems } = useMemo(() => calculateCartTotals(items), [items]);

  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    return appliedPromo.discountAmount;
  }, [appliedPromo]);

  const finalPrice = useMemo(() => {
    return calculateFinalPrice(totalPrice, discountAmount);
  }, [totalPrice, discountAmount]);

  const applyPromo = useCallback(
    async (code: string): Promise<{ success: boolean; message?: string }> => {
      if (!code || !code.trim()) {
        return { success: false, message: "Kode promo tidak boleh kosong" };
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/promos/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code.trim().toUpperCase(),
            subtotal: totalPrice,
          }),
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || !json.data?.is_valid) {
          const errMsg = json.error?.message || "Kupon promo tidak dapat digunakan untuk pesanan ini";
          showToast("error", "Voucher Gagal", errMsg);
          return { success: false, message: errMsg };
        }

        const promoData = json.data;
        const newPromo: AppliedPromo = {
          code: promoData.promo?.code || code.trim().toUpperCase(),
          title: promoData.promo?.title || "Diskon Spesial",
          discountAmount: promoData.discount_amount || 0,
        };
        setAppliedPromo(newPromo);
        showToast("success", "Voucher Berhasil Dipasang!", `${newPromo.title} hemat Rp ${newPromo.discountAmount.toLocaleString("id-ID")}`);
        return { success: true };
      } catch (err: any) {
        const errMsg = err.message || "Gagal memvalidasi kupon promo";
        showToast("error", "Error Promo", errMsg);
        return { success: false, message: errMsg };
      }
    },
    [totalPrice, showToast]
  );

  const removePromo = useCallback(() => {
    setAppliedPromo(null);
    showToast("info", "Promo Dihapus", "Kupon promo telah dilepas dari keranjang.");
  }, [showToast]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalPrice,
        totalItems,
        isDrawerOpen,
        setIsDrawerOpen,
        appliedPromo,
        discountAmount,
        finalPrice,
        applyPromo,
        removePromo,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
