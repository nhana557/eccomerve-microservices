"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrders } from "@/features/orders/hooks/use-orders";
import { paymentApi } from "@/features/payments/api/payment-api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/components/feedback/ToastContext";
import { useEnvironment } from "@/components/layout/EnvironmentContext";
import { PaymentGatewayModal } from "@/features/payments/components/PaymentGatewayModal";
import { formatRupiah } from "@/features/products/components/ProductCard";
import { Order } from "@/features/orders/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ReceiptText,
  Clock,
  CheckCircle2,
  Package,
  RotateCw,
  Tag,
  Loader2,
  Calendar,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Truck,
  CreditCard,
  XCircle,
  Filter,
  Search,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusTab = "ALL" | "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "CANCELLED";

export default function OrdersPage() {
  const router = useRouter();
  const { orders, isLoading, fetchOrders, updateStatus } = useOrders();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const { isSandbox } = useEnvironment();

  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal bayar untuk order tertentu yang PENDING
  const [selectedOrderToPay, setSelectedOrderToPay] = useState<Order | null>(null);
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCopy = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) return;
    setIsCancellingId(orderId);
    try {
      await updateStatus(orderId, "CANCELLED");
      showToast("success", "Pesanan Dibatalkan", `Order ${orderId.slice(0, 8)}... telah dibatalkan.`);
    } catch (err: any) {
      showToast("error", "Gagal Membatalkan", err?.message || "Terjadi kesalahan saat membatalkan pesanan.");
    } finally {
      setIsCancellingId(null);
    }
  };

  const handleOpenPayGateway = (order: Order) => {
    setSelectedOrderToPay(order);
    setIsGatewayOpen(true);
  };

  const handleGatewaySuccess = async () => {
    if (!selectedOrderToPay) return;
    try {
      await updateStatus(selectedOrderToPay.id, "PAID");
      showToast(
        "success",
        "Pembayaran Berhasil!",
        `Order ${selectedOrderToPay.id.slice(0, 8)}... sekarang berstatus LUNAS (PAID).`
      );
      fetchOrders();
    } catch (err: any) {
      showToast("error", "Gagal Memperbarui Status", err?.message);
    }
  };

  const handleGatewayFailure = (reason: string) => {
    showToast("error", "Pembayaran Gagal", reason);
  };

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab Filter
      if (activeTab === "PENDING_PAYMENT") {
        if (order.status !== "PENDING_PAYMENT" && order.status !== "PENDING") return false;
      } else if (activeTab !== "ALL" && order.status !== activeTab) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesPromo = order.promo_code?.toLowerCase().includes(query);
        const matchesItem = order.items?.some(
          (it) =>
            it.product_id?.toLowerCase().includes(query) ||
            it.product_name?.toLowerCase().includes(query)
        );
        if (!matchesId && !matchesPromo && !matchesItem) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Statistik ringkasan
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(
      (o) => o.status === "PENDING_PAYMENT" || o.status === "PENDING"
    ).length;
    const paid = orders.filter((o) => o.status === "PAID" || o.status === "SHIPPED").length;
    const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
    return { total, pending, paid, cancelled };
  }, [orders]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge variant="success" size="md" leftIcon={CheckCircle2}>
            Lunas (PAID)
          </Badge>
        );
      case "PENDING_PAYMENT":
      case "PENDING":
        return (
          <Badge variant="warning" size="md" leftIcon={Clock} pulse>
            Menunggu Pembayaran
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge variant="info" size="md" leftIcon={Truck}>
            Sedang Dikirim
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="danger" size="md" leftIcon={XCircle}>
            Dibatalkan
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="md">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Page Header Terpadu */}
      <PageHeader
        backHref="/"
        backLabel="Kembali ke Beranda"
        icon={ReceiptText}
        title="Daftar Pesanan Saya"
        badge={
          <Badge variant="success" size="sm" className="font-mono">
            {orders.length} Transaksi
          </Badge>
        }
        description="Pantau status verifikasi pembayaran, pengiriman paket, dan riwayat belanja Anda di platform T.STORE."
        actions={
          <button
            type="button"
            onClick={() => fetchOrders()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RotateCw className={cn("w-3.5 h-3.5 text-emerald-400", isLoading && "animate-spin")} />
            <span>Segarkan Data</span>
          </button>
        }
      />

      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Total Seluruh Transaksi</span>
          <div className="text-2xl font-bold font-mono text-slate-100">{stats.total}</div>
        </Card>
        <Card padding="sm" className="border-amber-500/30 space-y-1">
          <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Menunggu Pembayaran</span>
          </span>
          <div className="text-2xl font-bold font-mono text-amber-400">{stats.pending}</div>
        </Card>
        <Card padding="sm" className="border-emerald-500/30 space-y-1">
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Transaksi Sukses (Lunas)</span>
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.paid}</div>
        </Card>
      </div>

      {/* Tabs & Search Controls */}
      <div className="space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
          {[
            { id: "ALL", label: `Semua (${stats.total})` },
            { id: "PENDING_PAYMENT", label: `Menunggu Pembayaran (${stats.pending})` },
            { id: "PAID", label: `Lunas (${stats.paid})` },
            { id: "SHIPPED", label: "Dikirim" },
            { id: "CANCELLED", label: `Dibatalkan (${stats.cancelled})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as StatusTab)}
                className={cn(
                  "px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                    : "bg-[#14161D] border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi berdasarkan Order ID, kode promo, atau ID produk..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14161D] border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs text-slate-200 placeholder:text-slate-500 transition-colors font-mono"
          />
        </div>
      </div>

      {/* Order List Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-[#14161D] rounded-2xl border border-slate-800">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          <span className="text-xs font-medium">Memuat riwayat transaksi dari order-service...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Tidak Ada Transaksi"
          description={
            searchQuery
              ? "Tidak ada transaksi yang cocok dengan kata kunci pencarian Anda."
              : "Anda belum memiliki pesanan pada kategori status ini."
          }
          action={
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Mulai Belanja Sekarang</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === "PENDING_PAYMENT" || order.status === "PENDING";
            const isPaid = order.status === "PAID";
            const dateStr = order.created_at
              ? new Date(order.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Baru saja";

            const finalAmount = order.final_amount || order.total_amount;
            const subtotal = order.total_amount || finalAmount;

            return (
              <Card
                key={order.id}
                variant="interactive"
                className="space-y-4"
              >
                {/* Header: Date, Order ID & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{dateStr}</span>
                    </div>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-mono">Order ID:</span>
                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {order.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(order.id)}
                        title="Salin Order ID"
                        className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      >
                        {copiedId === order.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>{renderStatusBadge(order.status)}</div>
                </div>

                {/* Body: Items List */}
                <div className="space-y-2.5">
                  {order.items && order.items.length > 0 ? (
                    <div className="divide-y divide-slate-800/60 rounded-xl bg-[#0F1116] border border-slate-800/80 p-3 sm:p-4 space-y-2.5">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="pt-2.5 first:pt-0 flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-slate-200 truncate">
                                {it.product_name || `Produk #${it.product_id?.slice(0, 8) || idx + 1}`}
                              </h4>
                              <span className="text-slate-500 font-mono text-[11px]">
                                SKU: {it.product_id}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-slate-100">
                              {formatRupiah(it.unit_price * it.quantity)}
                            </div>
                            <div className="text-slate-500 font-mono text-[11px]">
                              {it.quantity} x {formatRupiah(it.unit_price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-slate-500 italic bg-[#0F1116] rounded-xl border border-slate-800/60">
                      Rincian item pesanan disimpan di database backend.
                    </div>
                  )}
                </div>

                {/* Footer: Price Breakdown & Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Promo & Shipping Notes */}
                  <div className="space-y-1">
                    {order.promo_code && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                        <Tag className="w-3.5 h-3.5" />
                        <span>
                          Voucher {order.promo_code} (-{formatRupiah(order.discount_amount || 0)})
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pengiriman Bebas Ongkir (Reguler)</span>
                    </div>
                  </div>

                  {/* Right: Total Amount & Action CTA */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                        Total Tagihan
                      </span>
                      <div className="font-mono text-lg font-black text-emerald-400">
                        {formatRupiah(finalAmount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={isCancellingId === order.id}
                            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                          >
                            {isCancellingId === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span>Batalkan</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPayGateway(order)}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-slate-950" />
                            <span>Bayar Sekarang</span>
                          </button>
                        </>
                      )}

                      {isPaid && (
                        <Link
                          href="/"
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Beli Lagi</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* POPUP PAYMENT GATEWAY UNTUK ORDER PENDING */}
      {selectedOrderToPay && (
        <PaymentGatewayModal
          isOpen={isGatewayOpen}
          onClose={() => {
            setIsGatewayOpen(false);
            setSelectedOrderToPay(null);
          }}
          orderId={selectedOrderToPay.id}
          amount={selectedOrderToPay.final_amount || selectedOrderToPay.total_amount}
          paymentMethod="QRIS"
          onPaymentSuccess={handleGatewaySuccess}
          onPaymentFailure={handleGatewayFailure}
        />
      )}
    </div>
  );
}
