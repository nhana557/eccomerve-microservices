"use client";

import React, { useState, useMemo } from "react";
import { Order } from "../types";
import { formatRupiah } from "../../products/components/ProductCard";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  filterAndSortOrders,
  SortDirection,
  getResponseTimeBadgeClass,
  formatResponseTime,
} from "@/lib/table-helpers";

export interface OrderManagementTableProps {
  orders: Order[];
  responseTime?: number | null;
  onUpdateStatus: (orderId: string, status: string) => Promise<any>;
}

export function OrderManagementTable({ orders, responseTime, onUpdateStatus }: OrderManagementTableProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const isFiltered = searchQuery !== "" || statusFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortField("created_at");
    setSortDirection("desc");
  };

  const filteredAndSortedOrders = useMemo(() => {
    return filterAndSortOrders(orders, {
      searchQuery,
      status: statusFilter,
      sortField,
      sortDirection,
    });
  }, [orders, searchQuery, statusFilter, sortField, sortDirection]);

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
        <h3 className="text-base font-semibold text-slate-100">Daftar Transaksi Pesanan</h3>
        <p className="text-xs text-slate-400">
          Monitoring status siklus pesanan pembeli dan pemrosesan barang.
        </p>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari order berdasarkan Order ID atau User ID..."
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
          <div className="w-full sm:w-48 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">Semua Status</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="CANCELLED">CANCELLED</option>
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
                {filteredAndSortedOrders.length}
              </span>{" "}
              dari <span className="text-slate-200">{orders.length}</span> pesanan
            </span>

            {responseTime !== undefined && responseTime !== null && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${getResponseTimeBadgeClass(
                  responseTime
                )}`}
                title="Waktu respons API Order Service"
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
                    <span>Order ID &amp; User</span>
                    {renderSortIndicator("id")}
                  </div>
                </th>
                <th className="py-3 px-4">Item Detail</th>
                <th
                  onClick={() => handleSort("total_amount")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Total Amount</span>
                    {renderSortIndicator("total_amount")}
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
                <th className="py-3 px-4 text-right">Ubah Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredAndSortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p>
                        {orders.length === 0
                          ? "Belum ada order transaksi tercatat."
                          : "Tidak ada pesanan yang cocok dengan kriteria pencarian/filter."}
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
                filteredAndSortedOrders.map((o, idx) => (
                  <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Sequence (#) */}
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Order ID & User */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-slate-200">{o.id}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        User: {o.user_id}
                      </div>
                    </td>

                    {/* Items */}
                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-medium text-slate-200">
                        {o.items?.length || 0} item
                      </span>
                      {o.items && o.items.length > 0 && (
                        <span className="text-[11px] text-slate-400 ml-1.5 font-mono">
                          ({o.items.map((i) => `${i.quantity}x`).join(", ")})
                        </span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      {formatRupiah(o.total_amount)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <OrderStatusBadge status={o.status} />
                    </td>

                    {/* Status Select Action */}
                    <td className="py-3 px-4 text-right">
                      <select
                        value={o.status}
                        onChange={(e) => onUpdateStatus(o.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
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

export default OrderManagementTable;
