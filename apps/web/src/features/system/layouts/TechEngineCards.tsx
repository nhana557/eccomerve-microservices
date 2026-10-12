"use client";

import React from "react";
import { Zap, GitBranch, Layers, Database, Check, HardDrive } from "lucide-react";
import { formatResponseTime, formatDataSizeMB } from "@/lib/table-helpers";

interface TechEngineCardsProps {
  activeMethod: string;
  onSelectMethod: (method: string) => void;
  responseTime?: number | null;
  responseSize?: number | null;
}

export function TechEngineCards({
  activeMethod,
  onSelectMethod,
  responseTime,
  responseSize,
}: TechEngineCardsProps) {
  const engines = [
    {
      id: "btree_index",
      title: "B-Tree + GIN Index",
      shortTitle: "B-Tree + GIN",
      subtitle: "Composite B-Tree & Trigram GIN Scan",
      engine: "PostgreSQL 16 Engine",
      benchmark: "12 - 45 ms",
      icon: Zap,
      variant: "cyan",
      role: "Filtering, Sorting & Pencarian Teks 5M SKU",
      borderActive: "border-cyan-500/80 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/40",
      badgeActive: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
      iconBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    },
    {
      id: "cqrs",
      title: "Pola CQRS (Elasticsearch)",
      shortTitle: "CQRS + ES",
      subtitle: "Read-Model Projection & Inverted Index",
      engine: "Elasticsearch Inverted Index & BM25 Scoring",
      benchmark: "1 - 3 ms",
      icon: GitBranch,
      variant: "emerald",
      role: "Pencarian Teks & Filter CQRS Tanpa Write-Lock",
      borderActive: "border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/40",
      badgeActive: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    {
      id: "in_memory_cache",
      title: "In-Memory Cache",
      shortTitle: "Cache Engine",
      subtitle: "RAM & Redis Key-Value Store",
      engine: "Distributed Cache Layer",
      benchmark: "< 1 ms",
      icon: Layers,
      variant: "indigo",
      role: "Sub-millisecond Retrieval",
      borderActive: "border-indigo-500/80 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-950/40",
      badgeActive: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
      iconBg: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    },
    {
      id: "postgres_filter",
      title: "PostgreSQL Raw Filter",
      shortTitle: "Postgres Filter",
      subtitle: "Sequential Full Table Scan",
      engine: "Baseline Tanpa Optimasi",
      benchmark: "~800 - 1.800 ms",
      icon: Database,
      variant: "amber",
      role: "Pembanding Query Tradisional",
      borderActive: "border-amber-500/80 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/40",
      badgeActive: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200 tracking-tight flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulasi Data Engine &amp; Teknologi Backend (5M SKU)</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            • Klik card untuk menguji response time &amp; payload data
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {engines.map((eng) => {
          const isActive =
            activeMethod === eng.id ||
            (eng.id === "in_memory_cache" && activeMethod === "cache");
          const Icon = eng.icon;

          return (
            <button
              key={eng.id}
              onClick={() => onSelectMethod(eng.id)}
              className={`text-left relative group rounded-2xl p-3.5 sm:p-4 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm border flex flex-col justify-between ${
                isActive
                  ? `bg-slate-900/95 ${eng.borderActive}`
                  : "bg-slate-900/80 border-slate-800/80 hover:border-slate-700/90 hover:bg-slate-900 hover:-translate-y-0.5 shadow-md"
              }`}
            >
              {/* Glow Accent */}
              {isActive && (
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
              )}

              {/* Card Top: Header & Icon */}
              <div className="relative z-10 w-full space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                      isActive
                        ? eng.badgeActive
                        : "bg-slate-800/80 text-slate-400 border-slate-700/60"
                    }`}
                  >
                    {isActive ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Aktif Digunakan</span>
                      </span>
                    ) : (
                      <span>Est: {eng.benchmark}</span>
                    )}
                  </span>

                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                      isActive
                        ? eng.iconBg
                        : "bg-slate-800/80 text-slate-400 border-slate-700/60 group-hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[1.8]" />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100 tracking-tight group-hover:text-white transition-colors flex items-center justify-between">
                    <span>{eng.title}</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                    {eng.subtitle}
                  </p>
                </div>
              </div>

              {/* Card Bottom: Live Metric or Tech Role */}
              <div className="relative z-10 w-full mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                {isActive && responseTime !== undefined && responseTime !== null ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{formatResponseTime(responseTime)}</span>
                    </span>
                    {responseSize !== undefined && responseSize !== null && (
                      <span className="text-cyan-300 font-semibold inline-flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-cyan-400" />
                        <span>{formatDataSizeMB(responseSize)}</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full text-slate-500 group-hover:text-slate-400">
                    <span className="truncate">{eng.role}</span>
                    <span className="text-cyan-400 font-semibold shrink-0 ml-1">Pilih ➔</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
