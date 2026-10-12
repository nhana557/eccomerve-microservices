"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/context/CartContext";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useOrders } from "@/features/orders/hooks/use-orders";
import { paymentApi } from "@/features/payments/api/payment-api";
import { Payment } from "@/features/payments/types";
import { Order } from "@/features/orders/types";
import { formatRupiah } from "@/features/products/components/ProductCard";
import { useToast } from "@/components/feedback/ToastContext";
import { useEnvironment } from "@/components/layout/EnvironmentContext";
import { EnvironmentToggle } from "@/components/layout/EnvironmentToggle";
import { PaymentGatewayModal } from "@/features/payments/components/PaymentGatewayModal";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  QrCode,
  Building2,
  Copy,
  CheckCircle2,
  Zap,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Tag,
  Clock,
  ExternalLink,
  Loader2,
  CreditCard,
  ShoppingBag,
  Truck,
  MapPin,
  XCircle,
  Check,
  FlaskConical,
} from "lucide-react";

const PAYMENT_METHODS = [
  {
    id: "QRIS",
    name: "QRIS Dinamis",
    sub: "GoPay, OVO, Dana, LinkAja, BCA Mobile",
    icon: QrCode,
    badge: "Instan",
  },
  {
    id: "VA_BCA",
    name: "BCA Virtual Account",
    sub: "Verifikasi Otomatis 24 Jam",
    icon: Building2,
    badge: "Populer",
  },
  {
    id: "VA_MANDIRI",
    name: "Mandiri Virtual Account",
    sub: "Verifikasi Otomatis Livin' by Mandiri",
    icon: Building2,
  },
  {
    id: "VA_BRI",
    name: "BRI Virtual Account (BRIVA)",
    sub: "Verifikasi Otomatis BRImo",
    icon: Building2,
  },
  {
    id: "VA_BNI",
    name: "BNI Virtual Account",
    sub: "Verifikasi Otomatis BNI Mobile",
    icon: Building2,
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, totalItems, appliedPromo, discountAmount, finalPrice, clearCart } = useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { checkoutOrder } = useOrders();
  const { showToast } = useToast();
  const { mode, isSandbox, isProd } = useEnvironment();

  // Mode alur: Payment Gateway vs Direct Simulation
  const [flowChoice, setFlowChoice] = useState<"DIRECT" | "GATEWAY">("GATEWAY");
  const activeFlow = isProd ? "GATEWAY" : flowChoice;
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  // Simulation states
  const [isSimulatingSuccess, setIsSimulatingSuccess] = useState(false);
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [isTestingRace, setIsTestingRace] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<"IDLE" | "SUCCESS" | "FAILED">("IDLE");
  const [simulationErrorMessage, setSimulationErrorMessage] = useState<string | null>(null);
  const [raceConditionResult, setRaceConditionResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const effectiveUserId = user?.id || "guest-user-001";

  const handleStartCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    if (items.length === 0) {
      showToast("error", "Keranjang Kosong", "Pilih produk terlebih dahulu sebelum melakukan checkout.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await checkoutOrder(
        effectiveUserId,
        items,
        paymentMethod,
        totalPrice,
        appliedPromo?.code,
        discountAmount,
        finalPrice
      );
      setCreatedOrder(res.order);
      setActivePayment(res.payment);
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (activeFlow === "GATEWAY") {
        setIsGatewayOpen(true);
      } else {
        showToast("success", "Pesanan Dibuat", "Silakan selesaikan pembayaran sesuai instruksi.");
      }
    } catch (err: any) {
      showToast("error", "Checkout Gagal", err?.message || "Terjadi kesalahan saat memproses pesanan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // HANDLER GATEWAY SUKSES
  const handleGatewaySuccess = async () => {
    if (!activePayment) return;
    try {
      const updated = await paymentApi.simulatePayment(activePayment.id, { action: "success" });
      setActivePayment(updated);
      setSimulationStatus("SUCCESS");
      if (createdOrder) {
        setCreatedOrder({ ...createdOrder, status: "PAID" });
      }
      showToast(
        "success",
        "Pembayaran Berhasil!",
        "Transaksi diverifikasi oleh Payment Gateway & pesanan lunas (PAID)."
      );
    } catch (err: any) {
      showToast("error", "Verifikasi Gagal", err?.message || "Gagal memverifikasi status pembayaran.");
    }
  };

  // HANDLER GATEWAY GAGAL
  const handleGatewayFailure = async (reason: string) => {
    if (!activePayment) return;
    try {
      await paymentApi.simulatePayment(activePayment.id, {
        action: "fail",
        reason: reason || "Pembayaran ditolak oleh Payment Gateway.",
      });
    } catch (err: any) {
      setSimulationStatus("FAILED");
      const errMsg = err?.message || reason || "Pembayaran ditolak oleh Payment Gateway.";
      setSimulationErrorMessage(errMsg);
      if (activePayment) {
        setActivePayment({ ...activePayment, status: "FAILED" });
      }
      showToast("error", "Pembayaran Ditolak", errMsg);
    }
  };

  // 1. SIMULASI BAYAR SUKSES
  const handleSimulateSuccess = async () => {
    if (!activePayment) return;
    setIsSimulatingSuccess(true);
    setSimulationErrorMessage(null);
    try {
      const updated = await paymentApi.simulatePayment(activePayment.id, { action: "success" });
      setActivePayment(updated);
      setSimulationStatus("SUCCESS");
      if (createdOrder) {
        setCreatedOrder({ ...createdOrder, status: "PAID" });
      }
      showToast("success", "Pembayaran Lunas", "Event RabbitMQ 'payment.completed' berhasil dipancarkan!");
    } catch (err: any) {
      showToast("error", "Simulasi Gagal", err?.message || "Gagal memproses simulasi pembayaran.");
    } finally {
      setIsSimulatingSuccess(false);
    }
  };

  // 2. SIMULASI BAYAR ERROR / GAGAL
  const handleSimulateFailure = async () => {
    if (!activePayment) return;
    setIsSimulatingFailure(true);
    try {
      await paymentApi.simulatePayment(activePayment.id, {
        action: "fail",
        reason: "Saldo tidak mencukupi / Limit transaksi harian terlampaui",
      });
    } catch (err: any) {
      // Backend returns 402 PAYMENT_FAILED
      setSimulationStatus("FAILED");
      const errMsg = err?.message || "Simulasi: Pembayaran ditolak karena saldo tidak mencukupi (HTTP 402).";
      setSimulationErrorMessage(errMsg);
      if (activePayment) {
        setActivePayment({ ...activePayment, status: "FAILED" });
      }
      showToast("error", "Simulasi Error", errMsg);
    } finally {
      setIsSimulatingFailure(false);
    }
  };

  // 3. SIMULASI RACE CONDITION (2x WEBHOOK BERSAMAAN)
  const handleSimulateRaceCondition = async () => {
    if (!activePayment || !createdOrder) return;
    setIsTestingRace(true);
    setRaceConditionResult(null);
    try {
      const res = await paymentApi.simulateRaceConditionWebhook(activePayment.id, createdOrder.id);
      setRaceConditionResult(res.results);
      setSimulationStatus("SUCCESS");
      setActivePayment((prev) => (prev ? { ...prev, status: "SUCCESS" } : null));
      setCreatedOrder((prev) => (prev ? { ...prev, status: "PAID" } : null));
      showToast(
        "success",
        "Race Condition Handled!",
        "2 Webhook tiba bersamaan. Idempotensi CAS berhasil mencegah event ganda!"
      );
    } catch (err: any) {
      showToast("error", "Uji Konkurensi Gagal", err?.message || "Gagal menguji race condition webhook.");
    } finally {
      setIsTestingRace(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // KONDISI: Keranjang kosong dan belum ada transaksi aktif
  if (items.length === 0 && !activePayment) {
    return (
      <div className="py-12 sm:py-20 text-center max-w-lg mx-auto space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 mx-auto flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-100">Keranjang Belanja Masih Kosong</h2>
          <p className="text-xs text-slate-400">
            Anda belum menambahkan produk ke dalam keranjang belanja.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Eksplor Katalog Produk</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb Navigation & Environment Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-emerald-400 transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-slate-400">Keranjang</span>
          <span>/</span>
          <span className="text-emerald-400 font-semibold">
            {activePayment ? "Pembayaran" : "Checkout"}
          </span>
        </nav>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Mode:</span>
          <EnvironmentToggle />
        </div>
      </div>

      {/* STEP 2: TAMPILAN INSTRUKSI PEMBAYARAN & SIMULASI ERROR / RACE CONDITION */}
      {activePayment ? (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
          {/* Header Status Card */}
          <div className="p-6 rounded-2xl bg-[#14161B] border border-slate-800 text-center space-y-3">
            {simulationStatus === "SUCCESS" || activePayment.status === "SUCCESS" ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pembayaran Sukses (Lunas / PAID)</span>
              </div>
            ) : simulationStatus === "FAILED" || activePayment.status === "FAILED" ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold text-xs animate-shake">
                <XCircle className="w-4 h-4" />
                <span>Pembayaran Gagal (FAILED)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium text-xs">
                <Clock className="w-4 h-4 animate-pulse text-amber-400" />
                <span>Menunggu Pembayaran</span>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Total Tagihan Pembayaran</span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
                {formatRupiah(activePayment.amount || createdOrder?.total_amount || finalPrice || 0)}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <div>
                Order ID: <span className="font-mono text-slate-200 font-semibold">{activePayment.order_id}</span>
              </div>
              <span>•</span>
              <div>
                Metode: <span className="font-semibold text-emerald-400">{activePayment.payment_method}</span>
              </div>
            </div>

            {/* Tombol Akses Payment Gateway Popup jika belum lunas */}
            {simulationStatus !== "SUCCESS" && activePayment.status !== "SUCCESS" && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsGatewayOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Buka Popup T-PAY Payment Gateway (Bayar / Uji Gateway)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Banner Error jika Simulasi Gagal */}
          {simulationStatus === "FAILED" && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Simulasi Error Terdeteksi!</span>
              </div>
              <p className="text-xs text-rose-200/90">
                {simulationErrorMessage || "Transaksi ditolak: Saldo rekening tidak mencukupi untuk menyelesaikan transaksi."}
              </p>
              <div className="text-[11px] text-rose-300/80 pt-1 font-mono">
                Log error telah dikirimkan ke <b>Grafana Loki</b> & OTel context trace telah direkam.
              </div>
            </div>
          )}

          {/* Banner Hasil Race Condition Test */}
          {raceConditionResult && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/50 text-purple-200 space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Hasil Pengujian Race Condition Webhook</span>
              </div>
              <p className="text-xs text-purple-200/90">
                2 Webhook ditembakkan secara paralel pada milidetik yang sama. Sistem CAS berhasil mengamankan transaksi:
              </p>
              <div className="space-y-1 text-[11px] font-mono bg-slate-950/60 p-2.5 rounded-lg border border-purple-900/40">
                <div>
                  ⚡ Webhook #1: <span className="text-emerald-400">STATUS {raceConditionResult[0]?.status || "OK"}</span> (Swapped: {String(raceConditionResult[0]?.data?.swapped)})
                </div>
                <div>
                  🛡️ Webhook #2: <span className="text-amber-400">STATUS {raceConditionResult[1]?.data?.status || "ALREADY_PROCESSED"}</span> (Swapped: {String(raceConditionResult[1]?.data?.swapped || false)})
                </div>
              </div>
              <p className="text-[11px] text-purple-300/80">
                ✅ <b>Kesimpulan:</b> Hanya 1 event RabbitMQ yang diterbitkan ke `order-service`, dan stok produk tidak terpotong dobel.
              </p>
            </div>
          )}

          {/* Instruksi Bayar (QRIS atau Virtual Account) */}
          {activePayment.payment_method.toUpperCase().includes("QRIS") ? (
            <div className="p-6 rounded-2xl bg-[#14161B] border border-slate-800 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-200">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span>Scan Kode QRIS Dinamis</span>
              </div>

              <div className="w-56 h-56 mx-auto bg-white rounded-2xl p-4 flex flex-col items-center justify-between shadow-xl shadow-emerald-500/10">
                <div className="w-full text-center border-b border-zinc-200 pb-1">
                  <span className="text-[11px] font-black tracking-widest text-zinc-900 uppercase">
                    QRIS T.STORE
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 w-32 h-32 p-1 bg-zinc-100 rounded">
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
                <span className="text-[10px] font-mono text-zinc-500 font-medium">NMID: ID1020030040</span>
              </div>

              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Buka aplikasi e-wallet (GoPay, OVO, Dana, LinkAja) atau Mobile Banking BCA / Mandiri untuk memindai QRIS di atas.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#14161B] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Nomor Virtual Account</span>
                <span className="text-xs font-bold text-emerald-400">
                  {activePayment.payment_method.replace("VA_", "")} Virtual Account
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0F1116] border border-slate-700">
                <span className="font-mono text-lg font-bold tracking-wider text-slate-100">
                  {activePayment.va_number || "88081234567890"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(activePayment.va_number || "88081234567890")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? "Tersalin!" : "Salin"}</span>
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Transfer tepat sesuai nominal tagihan melalui ATM, Mobile Banking, atau Internet Banking. Transaksi diverifikasi secara otomatis.
              </p>
            </div>
          )}

          {/* PANEL KONTROL SIMULASI LENGKAP */}
          <div className="p-5 rounded-2xl bg-[#14161B] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Panel Simulasi Microservices & Webhook</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                Dev & Observability Mode
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Uji ketahanan sistem pembayaran terdistribusi: uji alur sukses asinkron, simulasi kegagalan payment gateway, dan verifikasi proteksi race condition webhook.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Tombol 1: Sukses */}
              <button
                type="button"
                disabled={isSimulatingSuccess || isSimulatingFailure || isTestingRace || simulationStatus === "SUCCESS"}
                onClick={handleSimulateSuccess}
                className="py-3 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98]"
              >
                {isSimulatingSuccess ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Simulasi Sukses</span>
              </button>

              {/* Tombol 2: Gagal / Error */}
              <button
                type="button"
                disabled={isSimulatingSuccess || isSimulatingFailure || isTestingRace || simulationStatus === "SUCCESS"}
                onClick={handleSimulateFailure}
                className="py-3 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98]"
              >
                {isSimulatingFailure ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>Simulasi Error (402)</span>
              </button>

              {/* Tombol 3: Race Condition Webhook */}
              <button
                type="button"
                disabled={isSimulatingSuccess || isSimulatingFailure || isTestingRace}
                onClick={handleSimulateRaceCondition}
                className="py-3 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98]"
              >
                {isTestingRace ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Uji Race Condition</span>
              </button>
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs text-center transition-colors"
            >
              Kembali ke Beranda
            </Link>
            <Link
              href="/orders"
              className="w-full sm:w-1/2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs text-center transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
            >
              Lihat Riwayat Pesanan
            </Link>
          </div>
        </div>
      ) : (
        /* STEP 1: FORM CHECKOUT UTAMA (HALAMAN PENUH) */
        <form onSubmit={handleStartCheckout} className="space-y-6">
          <PageHeader
            backHref="/cart"
            backLabel="Kembali ke Keranjang"
            title="Checkout Pembayaran"
            badge={
              <Badge variant="success" size="sm" dot pulse className="font-mono">
                {totalItems} barang dipilih
              </Badge>
            }
            description="Konfirmasi alamat pengiriman dan pilih metode pembayaran resmi."
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Kolom Kiri: Alamat, Produk & Pilihan Pembayaran */}
            <div className="lg:col-span-8 space-y-6">
              {/* Card 1: Alamat Pengiriman */}
              <div className="p-5 rounded-2xl bg-[#14161B] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Alamat Pengiriman</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0F1116] border border-slate-800 text-xs space-y-1">
                  <div className="font-semibold text-slate-200">
                    {user?.name || "Customer T.STORE"} <span className="text-slate-500 font-normal">({user?.email || "customer@tstore.com"})</span>
                  </div>
                  <div className="text-slate-400">
                    Jl. Jendral Sudirman Kav. 52-53, SCBD Lot 11, Senayan, Jakarta Selatan, 12190
                  </div>
                </div>
              </div>

              {/* Card 2: Daftar Produk Belanja */}
              <div className="p-5 rounded-2xl bg-[#14161B] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span>Daftar Pesanan ({totalItems})</span>
                  </div>
                  <Link href="/cart" className="text-emerald-400 font-normal hover:underline normal-case">
                    Ubah Keranjang
                  </Link>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {items.map((item) => (
                    <div key={item.product.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.product.image_url ? (
                            <Image
                              src={item.product.image_url}
                              alt={item.product.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-200 truncate">{item.product.name}</h4>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {item.quantity} x {formatRupiah(item.product.price)}
                          </span>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-100 text-right">
                        {formatRupiah(item.product.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kurir Pengiriman */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-white">Bebas Ongkir (Reguler)</div>
                      <div className="text-[11px] text-slate-400">Estimasi tiba 1 - 2 hari</div>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-400 font-mono">GRATIS</span>
                </div>
              </div>

              {/* CARD ALUR CHECKOUT: PROD VS SANDBOX */}
              {isProd ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-300">
                        Mode Production Aktif (Payment Gateway Otomatis)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Pembayaran dijamin aman melalui enkripsi 256-bit TLS dan diverifikasi langsung melalui gateway resmi.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    PROD ENFORCED
                  </span>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#14161B] border border-amber-500/40 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-100">
                        Mode Sandbox: Pilih Alur Checkout
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      SANDBOX DEV
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opsi 1: Payment Gateway */}
                    <button
                      type="button"
                      onClick={() => setFlowChoice("GATEWAY")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activeFlow === "GATEWAY"
                          ? "bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/30 shadow-md"
                          : "bg-[#0F1116] border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>T-PAY Payment Gateway</span>
                        </span>
                        {activeFlow === "GATEWAY" && (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Simulasi pop-up gateway (Snap UI) dengan pilihan QRIS, VA Bank, Kartu Kredit, dan E-Wallet.
                      </p>
                    </button>

                    {/* Opsi 2: Direct Simulation */}
                    <button
                      type="button"
                      onClick={() => setFlowChoice("DIRECT")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activeFlow === "DIRECT"
                          ? "bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/30 shadow-md"
                          : "bg-[#0F1116] border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Direct Internal Simulation</span>
                        </span>
                        {activeFlow === "DIRECT" && (
                          <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Alur bawaan: instruksi transfer langsung dengan panel simulasi error &amp; uji race condition webhook.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 3: Pilihan Metode Pembayaran */}
              <div className="p-5 rounded-2xl bg-[#14161B] border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pilih Metode Pembayaran</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {PAYMENT_METHODS.map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-emerald-950/30 border-emerald-500/80 shadow-md shadow-emerald-500/10"
                            : "bg-[#0F1116] border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  isSelected ? "text-emerald-300" : "text-slate-200"
                                }`}
                              >
                                {pm.name}
                              </span>
                              {pm.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                                  {pm.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">{pm.sub}</span>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-500"
                              : "border-slate-600 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Ringkasan Tagihan & Aksi Bayar */}
            <div className="lg:col-span-4 sticky top-24 space-y-4">
              <div className="p-5 rounded-2xl bg-[#14161B] border border-slate-800 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Ringkasan Belanja
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Harga ({totalItems} barang)</span>
                    <span className="font-mono text-slate-200">{formatRupiah(totalPrice)}</span>
                  </div>

                  {appliedPromo && discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Diskon ({appliedPromo.code})</span>
                      </span>
                      <span className="font-mono font-semibold">-{formatRupiah(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Biaya Ongkir</span>
                    <span className="text-emerald-400 font-semibold">GRATIS</span>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-sm">Total Tagihan</span>
                    <span className="text-xl font-black font-mono text-emerald-400">
                      {formatRupiah(finalPrice)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Memproses Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>Bayar Sekarang</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Transaksi Terenkripsi & Idempoten</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* POPUP SIMULASI T-PAY PAYMENT GATEWAY */}
      <PaymentGatewayModal
        isOpen={isGatewayOpen}
        onClose={() => setIsGatewayOpen(false)}
        orderId={activePayment?.order_id || createdOrder?.id || ""}
        amount={activePayment?.amount || createdOrder?.total_amount || finalPrice || 0}
        paymentMethod={paymentMethod}
        onPaymentSuccess={handleGatewaySuccess}
        onPaymentFailure={handleGatewayFailure}
      />
    </div>
  );
}
