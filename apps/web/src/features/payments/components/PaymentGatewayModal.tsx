"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  X,
  QrCode,
  Building2,
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { formatRupiah } from "../../products/components/ProductCard";
import { useEnvironment } from "@/components/layout/EnvironmentContext";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

export interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  paymentMethod?: string;
  onPaymentSuccess: () => Promise<void> | void;
  onPaymentFailure?: (reason: string) => Promise<void> | void;
}

type PGChannel = "qris" | "va" | "cc" | "ewallet";

export function PaymentGatewayModal({
  isOpen,
  onClose,
  orderId,
  amount,
  paymentMethod = "QRIS",
  onPaymentSuccess,
  onPaymentFailure,
}: PaymentGatewayModalProps) {
  const { isSandbox, isProd } = useEnvironment();
  const [selectedChannel, setSelectedChannel] = useState<PGChannel>("qris");
  const [selectedBank, setSelectedBank] = useState<"BCA" | "MANDIRI" | "BRI" | "BNI">("BCA");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(899); // 14:59 min

  // CC form state
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8892");
  const [cardExp, setCardExp] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("•••");

  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setIsProcessing(false);
      return;
    }

    // Default channel matching paymentMethod
    if (paymentMethod.includes("VA")) {
      setSelectedChannel("va");
      if (paymentMethod.includes("MANDIRI")) setSelectedBank("MANDIRI");
      else if (paymentMethod.includes("BRI")) setSelectedBank("BRI");
      else if (paymentMethod.includes("BNI")) setSelectedBank("BNI");
      else setSelectedBank("BCA");
    } else {
      setSelectedChannel("qris");
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentMethod]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getVANumber = () => {
    const prefix =
      selectedBank === "BCA"
        ? "88012"
        : selectedBank === "MANDIRI"
        ? "89022"
        : selectedBank === "BRI"
        ? "88033"
        : "88044";
    return `${prefix}081299834102`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setProcessingStep("Menghubungkan ke Bank Host...");

    try {
      await new Promise((r) => setTimeout(r, 600));
      setProcessingStep("Memverifikasi token & idempotency key...");
      await new Promise((r) => setTimeout(r, 700));
      setProcessingStep("Mengonfirmasi settlement transaksi...");
      await new Promise((r) => setTimeout(r, 600));

      setIsSuccess(true);
      setProcessingStep("Pembayaran Berhasil Terverifikasi!");
      await onPaymentSuccess();

      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsProcessing(false);
      if (onPaymentFailure) {
        onPaymentFailure(err?.message || "Pembayaran gagal diproses oleh Payment Gateway.");
      }
    }
  };

  const handleSimulateFail = async () => {
    setIsProcessing(true);
    setProcessingStep("Memproses permintaan penolakan bank...");
    await new Promise((r) => setTimeout(r, 800));
    setIsProcessing(false);
    if (onPaymentFailure) {
      onPaymentFailure("Gateway Decline: Saldo tidak mencukupi atau kartu ditolak oleh penerbit (HTTP 402).");
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      padding="none"
      showCloseButton={false}
      className="bg-[#0F1115] border-slate-700/80 max-h-[92vh]"
    >
      {/* Top Header Gateway */}
      <div className="px-5 py-3.5 bg-[#14171D] border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-white">T-PAY GATEWAY</span>
              <Badge
                variant={isProd ? "success" : "warning"}
                size="sm"
                shape="rounded"
                className="font-mono text-[9px] px-1.5 py-0"
              >
                {isProd ? "PRODUCTION" : "SANDBOX"}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400">Enkripsi 256-bit TLS • PCI-DSS Compliant</p>
          </div>
        </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="px-5 py-3 bg-[#111318] border-b border-slate-800/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Tagihan Pembayaran
            </span>
            <div className="font-mono text-lg font-bold text-emerald-400">
              {formatRupiah(amount)}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono font-semibold justify-end">
              <Clock className="w-3 h-3" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              ID: {orderId ? orderId.slice(0, 14) : "ORD-TEST"}...
            </div>
          </div>
        </div>

        {/* Main Body: Channel Selector & Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Channel Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setSelectedChannel("qris")}
              className={cn(
                "py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all",
                selectedChannel === "qris"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QRIS</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel("va")}
              className={cn(
                "py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all",
                selectedChannel === "va"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>VA Bank</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel("cc")}
              className={cn(
                "py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all",
                selectedChannel === "cc"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel("ewallet")}
              className={cn(
                "py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all",
                selectedChannel === "ewallet"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>E-Wallet</span>
            </button>
          </div>

          {/* CHANNEL 1: QRIS */}
          {selectedChannel === "qris" && (
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-center space-y-3">
              <div className="w-44 h-44 mx-auto bg-white rounded-xl p-3 flex flex-col items-center justify-between shadow-md">
                <span className="text-[10px] font-black tracking-widest text-zinc-900 uppercase">
                  QRIS NASIONAL
                </span>
                <div className="grid grid-cols-6 gap-1 w-28 h-28 p-1 bg-zinc-100 rounded">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xs",
                        (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 5 || i === 30 || i === 35
                          ? "bg-zinc-900"
                          : "bg-emerald-600"
                      )}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-zinc-500">NMID: ID10928374921</span>
              </div>

              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Scan kode QR menggunakan GoPay, OVO, ShopeePay, DANA, atau Mobile Banking apa pun.
              </p>
            </div>
          )}

          {/* CHANNEL 2: VIRTUAL ACCOUNT */}
          {selectedChannel === "va" && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {(["BCA", "MANDIRI", "BRI", "BNI"] as const).map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={cn(
                      "py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all",
                      selectedBank === bank
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {bank}
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Nomor Virtual Account {selectedBank}</span>
                  <span className="text-emerald-400 font-semibold">Otomatis Verifikasi</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-slate-800">
                  <span className="font-mono text-base font-bold text-slate-100 tracking-wider">
                    {getVANumber()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(getVANumber())}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? "Disalin" : "Salin"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Bayar melalui ATM, M-Banking, atau Internet Banking dengan memasukkan nomor VA di atas.
                </p>
              </div>
            </div>
          )}

          {/* CHANNEL 3: KARTU KREDIT */}
          {selectedChannel === "cc" && (
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-semibold">Nomor Kartu</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Masa Berlaku</label>
                  <input
                    type="text"
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">CVV</label>
                  <input
                    type="text"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulasi 3D-Secure One-Time Password diaktifkan</span>
              </div>
            </div>
          )}

          {/* CHANNEL 4: E-WALLET */}
          {selectedChannel === "ewallet" && (
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-semibold">Nomor Handphone E-Wallet</label>
                <input
                  type="text"
                  defaultValue="081298765432"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300">
                Notifikasi pop-up pembayaran akan dikirimkan langsung ke aplikasi GoPay / OVO di ponsel Anda.
              </div>
            </div>
          )}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="px-5 py-2.5 bg-emerald-950/40 border-t border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            ) : (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            )}
            <span className="font-medium font-mono">{processingStep}</span>
          </div>
        )}

        {/* Action Footer */}
        <div className="p-4 bg-[#14171D] border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleProcessPayment}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
            )}
            <span>Konfirmasi Pembayaran ({formatRupiah(amount)})</span>
          </button>

          {isSandbox && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSimulateFail}
              title="Uji respon penolakan gateway (HTTP 402)"
              className="w-full sm:w-auto py-3 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulasi Decline (402)</span>
            </button>
          )}
        </div>
    </Modal>
  );
}
