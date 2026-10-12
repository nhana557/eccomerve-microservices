"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "emerald" | "amber" | "indigo" | "slate" | "cyan";
  badge?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "slate",
  badge,
}: MetricCardProps) {
  const variantStyles = {
    emerald: {
      icon: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      glow: "from-emerald-500/10 to-transparent",
      value: "text-emerald-400",
    },
    amber: {
      icon: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      glow: "from-amber-500/10 to-transparent",
      value: "text-amber-400",
    },
    indigo: {
      icon: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
      glow: "from-indigo-500/10 to-transparent",
      value: "text-indigo-400",
    },
    cyan: {
      icon: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
      glow: "from-cyan-500/10 to-transparent",
      value: "text-cyan-400",
    },
    slate: {
      icon: "text-slate-300 bg-slate-800/80 border-slate-700",
      glow: "from-slate-800/20 to-transparent",
      value: "text-slate-100",
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.slate;

  return (
    <div className="relative group bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-lg backdrop-blur-sm overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 bg-gradient-to-br ${currentVariant.glow} rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform`}
      />

      <div className="relative z-10 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold truncate">
            {title}
          </span>
          {badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
              {badge}
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-100 mt-0.5">
          {value}
        </div>
        {subtitle && (
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
            <span>{subtitle}</span>
          </div>
        )}
      </div>

      <div
        className={`relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border shadow-inner shrink-0 ${currentVariant.icon}`}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
      </div>
    </div>
  );
}
