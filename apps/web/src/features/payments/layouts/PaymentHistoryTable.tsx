"use client";

import React, { useState, useMemo } from "react";
import { Payment } from "../types";
import { formatRupiah } from "../../products/components/ProductCard";
import { PaymentStatusBadge } from "../components/PaymentStatusBadge";
import {
  CheckCircle2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  filterAndSortPayments,
  SortDirection,
  getResponseTimeBadgeClass,
  formatResponseTime,
} from "@/lib/table-helpers";

export function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    CREDIT_CARD: "Kartu Kredit",
    BANK_TRANSFER: "Transfer Bank",
    E_WALLET: "E-Wallet",
    QRIS: "QRIS",
  };
  return map[method] || method;
}

export interface PaymentHistoryTableProps {
  payments: Payment[];
  responseTime?: number | null;
  onSimulateSuccess: (paymentId: string) => Promise<any>;
}

export function PaymentHistoryTable({
  payments,
  responseTime,
  onSimulateSuccess,
}: PaymentHistoryTableProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  // Sorting state
  const [sortField, setSortField] = useState<string | null>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const isFiltered = searchQuery !== "" || statusFilter !== "all" || methodFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setMethodFilter("all");
    setSortField("created_at");
    setSortDirection("desc");
  };

  const filteredAndSortedPayments = useMemo(() => {
    return filterAndSortPayments(payments, {
      searchQuery,
      status: statusFilter,
      paymentMethod: methodFilter,
      sortField,
      sortDirection,
    });
  }, [payments, searchQuery, statusFilter, methodFilter, sortField, sortDirection]);

  const renderSortIndicator = (field: string) => {
    if (sortField === field) {
      return sortDirection === "asc" ? (
        <ArrowUp className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" />
      );
    }
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 inline shrink-0 transition-colors" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-slate-100">Log Riwayat Pembayaran</h3>
        <p className="text-xs text-slate-400">
          Verifikasi status transaksi dari payment gateway simulation dan mutasi saldo.
        </p>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari riwayat berdasarkan Payment ID atau Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">Semua Status</option>
              <option value="PENDING">PENDING</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">Semua Metode</option>
              <option value="BANK_TRANSFER">Transfer Bank</option>
              <option value="QRIS">QRIS</option>
              <option value="CREDIT_CARD">Kartu Kredit</option>
              <option value="E_WALLET">E-Wallet</option>
            </select>
          </div>

          {/* Reset Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors shrink-0"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Counter Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 font-mono px-0.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span>
              Menampilkan{" "}
              <span className="text-cyan-400 font-semibold">
                {filteredAndSortedPayments.length}
              </span>{" "}
              dari <span className="text-slate-200">{payments.length}</span> transaksi
            </span>

            {responseTime !== undefined && responseTime !== null && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${getResponseTimeBadgeClass(
                  responseTime
                )}`}
                title="Waktu respons API Payment Service"
              >
                <Zap className="w-3 h-3 text-current" />
                <span>{formatResponseTime(responseTime)}</span>
              </span>
            )}
          </div>
          {sortField && (
            <div className="text-slate-500 hidden sm:block">
              Urut berdasarkan:{" "}
              <span className="text-slate-300 capitalize">{sortField}</span> (
              {sortDirection === "asc" ? "Menaik" : "Menurun"})
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[580px] xl:max-h-[640px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 shadow-sm">
              <tr className="bg-slate-950/90 text-[11px] font-mono uppercase text-slate-400 select-none">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th
                  onClick={() => handleSort("id")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Payment ID</span>
                    {renderSortIndicator("id")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("order_id")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Order ID Referensi</span>
                    {renderSortIndicator("order_id")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("payment_method")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Metode Bayar</span>
                    {renderSortIndicator("payment_method")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nominal</span>
                    {renderSortIndicator("amount")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Simulasi Sukses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredAndSortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p>
                        {payments.length === 0
                          ? "Belum ada riwayat pembayaran."
                          : "Tidak ada riwayat pembayaran yang cocok dengan kriteria filter."}
                      </p>
                      {isFiltered && (
                        <button
                          onClick={handleResetFilters}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline"
                        >
                          Reset semua filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedPayments.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Sequence (#) */}
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Payment ID */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {p.id}
                    </td>

                    {/* Order ID */}
                    <td className="py-3 px-4 font-mono text-[11px] text-cyan-400/90">
                      {p.order_id}
                    </td>

                    {/* Method */}
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono text-[10px] border border-slate-700/60">
                        {formatPaymentMethod(p.payment_method)}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      {formatRupiah(p.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={p.status} />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      {p.status === "PENDING" && (
                        <button
                          onClick={() => onSimulateSuccess(p.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tandai Lunas</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PaymentHistoryTable;
