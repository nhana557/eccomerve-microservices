"use client";

import React from "react";
import { useEnvironment } from "./EnvironmentContext";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvironmentToggleProps {
  className?: string;
  compact?: boolean;
}

export function EnvironmentToggle({ className, compact = false }: EnvironmentToggleProps) {
  const { mode, isSandbox, setMode } = useEnvironment();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl p-0.5 bg-slate-900/90 border border-slate-800 select-none shadow-sm",
        className
      )}
      role="group"
      aria-label="Mode Lingkungan Aplikasi"
    >
      {/* Tombol Sandbox Mode */}
      <button
        type="button"
        onClick={() => setMode("sandbox")}
        title="Mode Sandbox: Akses diagnostik teknis, metrik backend, dan simulasi payment"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
          isSandbox
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        )}
      >
        <FlaskConical className={cn("w-3.5 h-3.5", isSandbox ? "text-amber-400" : "text-slate-400")} />
        <span>SANDBOX</span>
        {isSandbox && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {/* Tombol Prod Mode */}
      <button
        type="button"
        onClick={() => setMode("prod")}
        title="Mode Produksi: Mode bersih dengan Payment Gateway terintegrasi penuh"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
          !isSandbox
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        )}
      >
        <ShieldCheck className={cn("w-3.5 h-3.5", !isSandbox ? "text-emerald-400" : "text-slate-400")} />
        <span>PROD</span>
        {!isSandbox && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>
    </div>
  );
}
