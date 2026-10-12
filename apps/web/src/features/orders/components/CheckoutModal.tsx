"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { useCart } from "../../cart/context/CartContext";
import { useAuth } from "../../auth/context/AuthContext";
import { formatRupiah } from "../../products/components/ProductCard";
import { paymentApi } from "../../payments/api/payment-api";
import { Payment } from "../../payments/types";
import { Order } from "../types";
import {
  QrCode,
  Building2,
  Copy,
  CheckCircle2,
  Zap,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Tag,
  Clock,
  ExternalLink,
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCheckout: (
    userId: string,
    paymentMethod: string,
    totalPrice: number,
    promoCode?: string,
    discountAmount?: number,
    finalAmount?: number
  ) => Promise<{ order: Order; payment: Payment }>;
  onViewOrders?: () => void;
}

const PAYMENT_METHODS = [
  { id: "QRIS", name: "QRIS Dinamis", sub: "GoPay, OVO, Dana, LinkAja", icon: QrCode, badge: "Instan" },
  { id: "VA_BCA", name: "BCA Virtual Account", sub: "Verifikasi Otomatis", icon: Building2, badge: "Populer" },
  { id: "VA_MANDIRI", name: "Mandiri Virtual Account", sub: "Verifikasi Otomatis", icon: Building2 },
  { id: "VA_BRI", name: "BRI Virtual Account", sub: "Verifikasi Otomatis", icon: Building2 },
  { id: "VA_BNI", name: "BNI Virtual Account", sub: "Verifikasi Otomatis", icon: Building2 },
];

export function CheckoutModal({
  isOpen,
  onClose,
  onConfirmCheckout,
  onViewOrders,
}: CheckoutModalProps) {
  const { items, totalPrice, appliedPromo, discountAmount, finalPrice, clearCart } = useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset state when modal is opened afresh without existing active payment
  useEffect(() => {
    if (!isOpen) {
      setCreatedOrder(null);
      setActivePayment(null);
      setIsPaidSuccess(false);
      setIsSubmitting(false);
      setIsSimulating(false);
    }
  }, [isOpen]);

  const effectiveUserId = user?.id || "guest-user-001";
  const effectiveUserName = user?.name || "Guest Customer";

  const handleStartCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onConfirmCheckout(
        effectiveUserId,
        paymentMethod,
        totalPrice,
        appliedPromo?.code,
        discountAmount,
        finalPrice
      );
      setCreatedOrder(res.order);
      setActivePayment(res.payment);
      clearCart();
    } catch (err) {
      // Error is handled via toast in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!activePayment) return;
    setIsSimulating(true);
    try {
      const updated = await paymentApi.simulatePayment(activePayment.id);
      setActivePayment(updated);
      setIsPaidSuccess(true);
      if (createdOrder) {
        setCreatedOrder({ ...createdOrder, status: "PAID" });
      }
    } catch {
      // Fail simulation gracefully
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        activePayment
          ? isPaidSuccess
            ? "Pembayaran Sukses!"
            : "Instruksi Pembayaran"
          : "Konfirmasi & Pilih Pembayaran"
      }
    >
      {/* STEP 2: PAYMENT INSTRUCTION & INSTANT SIMULATION */}
      {activePayment ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="text-center py-2">
            {isPaidSuccess ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs animate-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4" />
                <span>Status: Lunas (PAID)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium text-xs">
                <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>Menunggu Pembayaran</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="p-4 rounded-xl bg-[#14161B] border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block mb-1">Total yang Harus Dibayar</span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {formatRupiah(activePayment?.amount || createdOrder?.total_amount || finalPrice || 0)}
            </span>
            {(() => {
              const orderId =
                activePayment?.order_id ||
                (activePayment as any)?.orderId ||
                createdOrder?.id ||
                "";
              if (!orderId) return null;
              return (
                <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                  <span>Order ID:</span>
                  <span className="font-mono text-slate-200">
                    {orderId.length > 13 ? `${orderId.slice(0, 13)}...` : orderId}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Payment Detail (QRIS or VA) */}
          {(activePayment?.payment_method || paymentMethod || "").toUpperCase().includes("QRIS") ? (
            <div className="p-5 rounded-2xl bg-[#0F1116] border border-slate-800 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-200">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Scan Kode QRIS Dinamis</span>
              </div>

              {/* Dynamic QR Box simulation */}
              <div className="w-48 h-48 mx-auto bg-white rounded-xl p-3 flex flex-col items-center justify-between shadow-lg shadow-emerald-500/10">
                <div className="w-full text-center border-b border-zinc-200 pb-1">
                  <span className="text-[10px] font-black tracking-widest text-zinc-800 uppercase">
                    QRIS T.STORE
                  </span>
                </div>
                {/* Visual QR Pattern Representation */}
                <div className="grid grid-cols-6 gap-1 w-28 h-28 p-1 bg-zinc-100 rounded">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 5 || i === 30 || i === 35
                          ? "bg-zinc-900"
                          : "bg-emerald-600"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-zinc-500">NMID: ID1020030040</span>
              </div>

              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Buka aplikasi GoPay, OVO, Dana, atau BCA Mobile untuk memindai QRIS di atas.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#0F1116] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Nomor Virtual Account</span>
                <span className="text-xs font-semibold text-emerald-400">
                  {(activePayment?.payment_method || paymentMethod || "").replace("VA_", "")}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1D22] border border-slate-700/80">
                <span className="font-mono text-base font-bold tracking-wider text-slate-100">
                  {activePayment?.va_number || (activePayment as any)?.vaNumber || "88081234567890"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(activePayment?.va_number || (activePayment as any)?.vaNumber || "88081234567890")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? "Tersalin!" : "Salin"}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Transfer tepat sesuai nominal tagihan melalui ATM, Mobile Banking, atau Internet Banking.
              </p>
            </div>
          )}

          {/* SIMULATION ACTION BUTTON */}
          {!isPaidSuccess ? (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Zap className="w-4 h-4 fill-emerald-400" />
                <span>Simulasi Sistem Microservices</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Klik tombol di bawah untuk memicu event RabbitMQ{" "}
                <code className="px-1 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-emerald-300">
                  payment.completed
                </code>{" "}
                secara otomatis.
              </p>
              <button
                type="button"
                disabled={isSimulating}
                onClick={handleSimulatePayment}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
              >
                {isSimulating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>⚡ Simulasi Bayar Sekarang (Lunas)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Event Asinkron Sukses Terkirim!</p>
                  <p className="text-[11px] text-emerald-400/90 mt-0.5">
                    Order telah berstatus PAID dan stok produk telah dipotong secara atomik via RabbitMQ.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewOrders?.();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Lihat Pesanan Saya</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Selesai Belanja
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 1: PAYMENT METHOD SELECTION & ORDER SUMMARY */
        <form onSubmit={handleStartCheckout} className="space-y-4">
          {/* User info note */}
          {!isAuthenticated && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
              <span>Masuk akun untuk menyimpan riwayat pesanan Anda.</span>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px]"
              >
                Masuk
              </button>
            </div>
          )}

          {/* Payment Method Options */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/20 text-emerald-300 shadow-sm"
                        : "border-slate-800 bg-[#14161A] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                          <span>{m.name}</span>
                          {m.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">{m.sub}</span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-emerald-500 bg-emerald-500" : "border-slate-700"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="p-3.5 rounded-xl bg-[#14161A] border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Subtotal ({items.length} jenis produk)</span>
              <span className="font-mono text-slate-200">{formatRupiah(totalPrice)}</span>
            </div>

            {appliedPromo && discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-400">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>Kupon ({appliedPromo.code})</span>
                </span>
                <span className="font-mono font-bold">-{formatRupiah(discountAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold text-sm text-slate-100">
              <span className="text-xs uppercase tracking-wider text-slate-400">Total Pembayaran</span>
              <span className="font-mono text-base text-emerald-400">
                {formatRupiah(finalPrice)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>Lanjut Bayar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
