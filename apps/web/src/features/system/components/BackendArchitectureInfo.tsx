"use client";

import React, { useState } from "react";
import {
  Database,
  Layers,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Zap,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  HardDrive,
} from "lucide-react";
import { formatDataSizeMB } from "@/lib/table-helpers";

interface BackendArchitectureInfoProps {
  activeMethod?: string;
  onSelectMethod?: (method: string) => void;
  responseSize?: number | null;
}

export function BackendArchitectureInfo({
  activeMethod = "btree_index",
  onSelectMethod,
  responseSize,
}: BackendArchitectureInfoProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm transition-all">
      {/* Header with Title & Expand/Collapse Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                Metode Pengolahan Data &amp; Arsitektur Backend (BE)
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                10M SKU Engine
              </span>
              {responseSize !== undefined && responseSize !== null && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800/90 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-cyan-400" />
                  <span>Payload: {formatDataSizeMB(responseSize)}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pilih dan bandingkan kecepatan response time dari 3 metode: PostgreSQL Page Filter, B-Tree Indexing, dan CQRS.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60 text-xs font-medium transition-colors shrink-0 self-start sm:self-center cursor-pointer"
        >
          <span>{isExpanded ? "Tutup Rincian" : "Lihat Rincian Metode"}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
          )}
        </button>
      </div>

      {/* Summary Pipeline Bar (Clickable quick method switcher) */}
      <div className="mt-3.5 flex items-center justify-between gap-2 overflow-x-auto py-1 text-[11px] font-mono text-slate-300 border border-slate-800/60 rounded-xl bg-slate-950/50 px-3">
        <button
          onClick={() => onSelectMethod && onSelectMethod("postgres_filter")}
          className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            activeMethod === "postgres_filter"
              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Uji PostgreSQL Filter standar (~800ms - 2s)"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeMethod === "postgres_filter" ? "bg-amber-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          <span>1. Postgres Filter (~800ms - 2s)</span>
        </button>

        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

        <button
          onClick={() => onSelectMethod && onSelectMethod("btree_index")}
          className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            activeMethod === "btree_index"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm shadow-cyan-950/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Uji B-Tree Indexing (12-30ms)"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeMethod === "btree_index" ? "bg-cyan-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          <span>2. B-Tree Indexing (12-30ms)</span>
        </button>

        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

        <button
          onClick={() => onSelectMethod && onSelectMethod("cqrs")}
          className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            activeMethod === "cqrs"
              ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/40 font-semibold shadow-sm shadow-indigo-950/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Uji CQRS Read-Model (1-5ms)"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeMethod === "cqrs" ? "bg-indigo-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          <span>3. Pola CQRS (1-5ms)</span>
        </button>
      </div>

      {/* Expanded 3-Card Architecture Breakdown */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Page Filter di PostgreSQL */}
            <div
              className={`bg-slate-950/70 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
                activeMethod === "postgres_filter"
                  ? "border-rose-500/60 ring-1 ring-rose-500/30 shadow-lg shadow-rose-950/30"
                  : "border-slate-800/80 hover:border-slate-700/80"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                    Tahap 1 • Baseline SQL
                  </span>
                  <Database className="w-4 h-4 text-amber-400 shrink-0" />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center justify-between">
                    <span>PostgreSQL Page Filter</span>
                    {activeMethod === "postgres_filter" && (
                      <span className="text-[10px] font-mono text-rose-400 font-semibold inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Aktif
                      </span>
                    )}
                  </h4>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Pagination &amp; Filtering Dasar
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Query langsung menggunakan klausa standar SQL{" "}
                  <code className="px-1 py-0.5 rounded bg-slate-900 text-amber-300 text-[10px] font-mono">
                    WHERE category = ? ORDER BY ... LIMIT n OFFSET m
                  </code>.
                </p>

                <div className="space-y-1.5 pt-1 text-[11px] text-slate-400">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Pada 10.000.000 baris, memicu <em>Sequential Table Scan</em> yang boros I/O disk.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0 mt-1.5 ml-1" />
                    <span>Latensi query real-time ~800ms – 2.000ms akibat sequential scan &amp; exact count 10M baris.</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Response Time Real-Time:</span>
                  <span className="text-amber-400 font-bold">~800 ms – 2.000 ms</span>
                </div>
                {onSelectMethod && (
                  <button
                    onClick={() => onSelectMethod("postgres_filter")}
                    className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeMethod === "postgres_filter"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {activeMethod === "postgres_filter" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Sedang Digunakan</span>
                      </>
                    ) : (
                      <span>Uji Metode Ini (Real-time ~0.8-2s)</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 2. B-Tree Indexing */}
            <div
              className={`bg-slate-950/70 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
                activeMethod === "btree_index"
                  ? "border-cyan-500/60 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-950/40"
                  : "border-slate-800/80 hover:border-slate-700/80"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35">
                    Tahap 2 • Aktif di Product Service
                  </span>
                  <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>B-Tree Composite Indexing</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </span>
                    {activeMethod === "btree_index" && (
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Aktif
                      </span>
                    )}
                  </h4>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    Multi-Column B-Tree Index (10M SKU)
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Penerapan composite index PostgreSQL{" "}
                  <code className="px-1 py-0.5 rounded bg-slate-900 text-cyan-300 text-[10px] font-mono">
                    idx_products_cat_price
                  </code>,{" "}
                  <code className="px-1 py-0.5 rounded bg-slate-900 text-cyan-300 text-[10px] font-mono">
                    idx_products_cat_created_at
                  </code>.
                </p>

                <div className="space-y-1.5 pt-1 text-[11px] text-slate-300">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Struktur pohon seimbang $O(\log N)$ mendukung pembacaan dua arah (forward/backward scan).
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Eliminasi filesort: data 10 juta produk tersaring dalam 12–30 ms tanpa lag.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Response Time:</span>
                  <span className="text-emerald-400 font-bold">12 ms – 30 ms (Instan)</span>
                </div>
                {onSelectMethod && (
                  <button
                    onClick={() => onSelectMethod("btree_index")}
                    className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeMethod === "btree_index"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {activeMethod === "btree_index" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Sedang Digunakan (Default)</span>
                      </>
                    ) : (
                      <span>Gunakan B-Tree Indexing</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 3. CQRS Pattern */}
            <div
              className={`bg-slate-950/70 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
                activeMethod === "cqrs"
                  ? "border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-950/40"
                  : "border-slate-800/80 hover:border-slate-700/80"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/35">
                    Tahap 3 • Arsitektur Microservices
                  </span>
                  <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center justify-between">
                    <span>Pola CQRS</span>
                    {activeMethod === "cqrs" && (
                      <span className="text-[10px] font-mono text-indigo-400 font-semibold inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Aktif
                      </span>
                    )}
                  </h4>
                  <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                    Command Query Responsibility Segregation
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Pemisahan tegas jalur operasi <strong>Command (Write)</strong> dari alur <strong>Query (Read)</strong> demi skalabilitas tinggi.
                </p>

                <div className="space-y-1.5 pt-1 text-[11px] text-slate-300">
                  <div className="flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Command</strong>: Order &amp; Payment write tetap konsisten ACID tanpa terganggu load query besar.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Query</strong>: Read katalog &amp; dashboard membaca dari model projection teroptimasi (&lt;2ms).
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Response Time:</span>
                  <span className="text-indigo-300 font-bold">1 ms – 5 ms (Ultra-Fast)</span>
                </div>
                {onSelectMethod && (
                  <button
                    onClick={() => onSelectMethod("cqrs")}
                    className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeMethod === "cqrs"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {activeMethod === "cqrs" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Sedang Digunakan</span>
                      </>
                    ) : (
                      <span>Uji Pola CQRS (1-5ms)</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Architecture Pipeline Flow Diagram */}
          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Diagram Alur CQRS &amp; B-Tree Indexing Engine:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <span className="text-emerald-400 font-bold">▶ JALUR READ (QUERY):</span>
                <span className="text-slate-300">
                  Gateway ➔ {activeMethod === "cqrs" ? "CQRS Read Model Cache (1-5ms)" : "B-Tree Composite Index (12-30ms)"}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <span className="text-indigo-400 font-bold">▶ JALUR WRITE (COMMAND):</span>
                <span className="text-slate-300">
                  Checkout/Bayar ➔ ACID Transaction ➔ PgBouncer Pool ➔ Zero Read Lag
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
