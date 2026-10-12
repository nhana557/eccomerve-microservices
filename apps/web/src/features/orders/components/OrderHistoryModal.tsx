"use client";

import React, { useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useOrders } from "../hooks/use-orders";
import { formatRupiah } from "../../products/components/ProductCard";
import { Order } from "../types";
import {
  ReceiptText,
  Clock,
  CheckCircle2,
  Package,
  RotateCw,
  Tag,
  Loader2,
  Calendar,
} from "lucide-react";

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderToPay?: (order: Order) => void;
}

export function OrderHistoryModal({ isOpen, onClose }: OrderHistoryModalProps) {
  const { orders, isLoading, fetchOrders } = useOrders();

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, fetchOrders]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge variant="success" size="sm" leftIcon={CheckCircle2}>
            LUNAS (PAID)
          </Badge>
        );
      case "PENDING_PAYMENT":
      case "PENDING":
        return (
          <Badge variant="warning" size="sm" dot pulse>
            MENUNGGU BAYAR
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge variant="info" size="sm">
            DIKIRIM
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Riwayat Pesanan Saya">
      <div className="space-y-4">
        {/* Subtitle & Refresh */}
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
          <span>Daftar transaksi tersimpan di order-service</span>
          <button
            onClick={() => fetchOrders()}
            disabled={isLoading}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs">Memuat daftar pesanan...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Package className="w-12 h-12 mx-auto stroke-[1.5] text-slate-600" />
            <p className="text-sm font-medium text-slate-400">Belum ada riwayat pesanan</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Lakukan checkout produk di keranjang belanja untuk membuat pesanan pertama Anda.
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {orders.map((order) => {
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

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-xl bg-[#14161B] border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                >
                  {/* Top: Order ID, Date & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {order?.id ? (order.id.length > 18 ? `${order.id.slice(0, 18)}...` : order.id) : "-"}
                      </span>
                    </div>
                    {renderStatusBadge(order.status)}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>

                  {/* Items count summary */}
                  {order.items && order.items.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-[#0F1116] border border-slate-800/80 text-xs space-y-1.5">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400 font-mono text-[11px]">
                            Produk #{it.product_id ? it.product_id.slice(0, 8) : idx + 1}
                          </span>
                          <span className="text-slate-200 font-mono text-[11px]">
                            {it.quantity}x @ {formatRupiah(it.unit_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Promo & Total */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      {order.promo_code && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                          <Tag className="w-3 h-3" />
                          <span>Promo {order.promo_code} (-{formatRupiah(order.discount_amount || 0)})</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Total Pesanan</span>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        {formatRupiah(finalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
