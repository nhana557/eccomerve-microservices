"use client";

import React from "react";

export function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-950/80 text-amber-300 border-amber-800/80",
    SUCCESS: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
    FAILED: "bg-rose-950/80 text-rose-300 border-rose-800/80",
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
