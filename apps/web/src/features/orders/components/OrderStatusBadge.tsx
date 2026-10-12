"use client";

import React from "react";

export function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-950/80 text-amber-300 border-amber-800/80",
    PAID: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
    SHIPPED: "bg-indigo-950/80 text-indigo-300 border-indigo-800/80",
    CANCELLED: "bg-rose-950/80 text-rose-300 border-rose-800/80",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
        styles[status] || "bg-slate-800 text-slate-300 border-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
