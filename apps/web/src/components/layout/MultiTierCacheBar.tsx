"use client";

import React, { useState } from "react";
import {
  Layers,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { useCacheTiers } from "@/hooks/use-cache-tiers";
import { formatDataSizeMB, formatCountdownString } from "@/lib/table-helpers";
import { cn } from "@/lib/utils";

/**
 * Properti untuk komponen `MultiTierCacheBar`.
 */
export interface MultiTierCacheBarProps {
  /** Jumlah produk aktif yang sedang dimuat atau berada di dalam tampilan */
  activeProductCount?: number;
  /** Kelas CSS tambahan opsional */
  className?: string;
}

/**
 * Komponen Bar Status Arsitektur Multi-Tier Caching.
 *
 * Menampilkan status waktu nyata dari 4 lapisan cache (Tier 1 Next.js Edge,
 * Tier 2 API Gateway, Tier 3 Backend CQRS/Redis, Tier 4 IndexedDB Browser),
 * dilengkapi dengan hitung mundur TTL (Time-To-Live), rincian ukuran data,
 * dan tombol aksi cepat untuk membersihkan (purge) cache klien.
 *
 * @example
 * ```tsx
 * <MultiTierCacheBar activeProductCount={60} />
 * ```
 */
export function MultiTierCacheBar({
  activeProductCount = 0,
  className,
}: MultiTierCacheBarProps) {
  const {
    tiers,
    storedCount,
    totalTiers,
    isPurging,
    purgingTier,
    purgeTier,
    purgeCache,
    remainingSeconds,
    countdownText,
    recentApiCaches,
  } = useCacheTiers(activeProductCount);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPurgeMenuOpen, setIsPurgeMenuOpen] = useState(false);

  return (
    <aside
      aria-label="Status Indikator Multi-Tier Cache"
      className={cn(
        // 1. Layout & Sizing: Lebar penuh dengan border bawah pemisah
        "w-full overflow-visible select-none",
        // 2. Visual Styling: Background obsidian gelap (#0B0D0F) dan border slate redup
        "bg-[#0B0D0F] border-b border-slate-800/80",
        // 3. Tipografi: Font monospace 11px untuk nuansa data engineering
        "text-[11px] font-mono",
        // 4. Custom Override
        className
      )}
    >
      {/* Compact Status Bar Utama */}
      <div
        className={cn(
          // 1. Layout & Box Model: Container responsif terpusat dengan padding proporsional
          "max-w-7xl mx-auto px-4 sm:px-8 py-1.5",
          // 2. Flex Alignment: Baris sejajar antara status kiri, pill tengah, dan tombol kanan
          "flex items-center justify-between gap-3 flex-wrap overflow-visible"
        )}
      >
        {/* Sisi Kiri: Status Tersimpan & Badge Live TTL Countdown */}
        <div
          className={cn(
            // 1. Layout: Baris sejajar tidak menyusut (shrink-0)
            "flex items-center gap-2.5 shrink-0"
          )}
        >
          {/* Indikator Titik Hijau Pulsa & Counter Tier */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                // 1. Dimensi: Bulatan kecil 6px
                "w-1.5 h-1.5 rounded-full",
                // 2. Warna & Animasi: Hijau emerald dengan efek pulse
                "bg-emerald-400 animate-pulse"
              )}
            />
            <span className="text-slate-400 text-[10px] font-semibold">
              Cache:{" "}
              <span className="text-emerald-400 font-bold">
                {storedCount}/{totalTiers} Tersimpan
              </span>
            </span>
          </div>

          {/* Badge Hitung Mundur Live TTL (5 Menit / 300 Detik) */}
          {remainingSeconds !== null && remainingSeconds > 0 ? (
            <div
              className={cn(
                // 1. Flex Layout: Baris kompak dengan gap kecil
                "flex items-center gap-1 px-2 py-0.5 rounded-md",
                // 2. Visual Styling: Latar hijau tua semi-transparan dengan border emerald
                "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 shadow-sm",
                // 3. Tipografi
                "text-[10px] font-mono"
              )}
              title={`Cache aktif selama 5 menit (300 detik). Sisa countdown kedaluwarsa: ${remainingSeconds} detik.`}
            >
              <Clock className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
              <span className="text-slate-400 hidden sm:inline">TTL:</span>
              <span className="font-bold text-emerald-300">{countdownText}</span>
            </div>
          ) : (
            <div
              className={cn(
                // 1. Flex Layout & Dimensi
                "flex items-center gap-1 px-2 py-0.5 rounded-md",
                // 2. Visual Styling: Slate netral standby
                "bg-slate-900/60 border border-slate-800 text-slate-400",
                // 3. Tipografi
                "text-[10px] font-mono"
              )}
              title="Cache siap menerima request API baru (TTL 5 Menit / 300s)"
            >
              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="text-slate-500">TTL: 05:00 Standby</span>
            </div>
          )}
        </div>

        {/* Sisi Tengah: Pills Tier T1 - T4 dengan Hover Tooltip */}
        <div
          className={cn(
            // 1. Flex Layout: Membungkus otomatis jika ruang sempit
            "flex items-center gap-1.5 flex-wrap justify-center sm:justify-start lg:justify-center overflow-visible"
          )}
        >
          {tiers.map((t) => {
            const isStored = t.isStored;
            return (
              <div
                key={t.tier}
                className={cn(
                  // 1. Positioning & Group: Diperlukan untuk penempatan absolut tooltip anak
                  "group relative",
                  // 2. Flex Layout & Box Model: Pill horizontal kompak
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] transition-all",
                  // 3. Conditional Theme: Emerald aktif jika tersimpan, slate redup jika standby
                  isStored
                    ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/35"
                    : "bg-slate-900/60 text-slate-500 border-slate-800/80"
                )}
                title={`Tier ${t.tier}: ${t.name} (${t.latencyLabel})`}
              >
                <span
                  className={cn(
                    // 1. Dot status warna
                    "w-1 h-1 rounded-full",
                    isStored ? "bg-emerald-400" : "bg-slate-600"
                  )}
                />
                <span className="font-semibold text-slate-300">T{t.tier}:</span>
                <span>{t.shortName}</span>
                {isStored && <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}

                {/* Lightweight Hover Tooltip Popover */}
                <div
                  className={cn(
                    // 1. Positioning: Terpusat horizontal di bawah pill
                    "absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50",
                    // 2. Dimensi & Visibilitas: Tersembunyi default, muncul saat hover group
                    "hidden group-hover:block w-64 p-2.5 pointer-events-none group-hover:pointer-events-auto",
                    // 3. Visual Styling: Slate gelap pekat, border tegas, elevasi bayangan tinggi
                    "bg-slate-950 border border-slate-700/80 rounded-lg shadow-xl text-left"
                  )}
                >
                  <div
                    className={cn(
                      // Header Tooltip
                      "flex items-center justify-between text-[11px] font-bold text-slate-200 pb-1 border-b border-slate-800"
                    )}
                  >
                    <span>T{t.tier}: {t.name}</span>
                    <span className="text-emerald-400 text-[9px]">{t.latencyLabel}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans leading-tight">
                    {t.description}
                  </p>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
                    <div>
                      <span>{t.medium}</span>
                      <span className="text-cyan-400 font-semibold block">{t.ttl}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        purgeTier(`T${t.tier}` as any);
                      }}
                      disabled={isPurging}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-colors shrink-0",
                        purgingTier === `T${t.tier}`
                          ? "bg-rose-500/30 text-rose-200 border border-rose-500/50 animate-pulse"
                          : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      title={`Purge khusus Tier ${t.tier}`}
                    >
                      <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                      <span>{purgingTier === `T${t.tier}` ? "Purging..." : `Purge T${t.tier}`}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sisi Kanan: Tombol Aksi Cepat (Rincian & Purge Dropdown) */}
        <div
          className={cn(
            // 1. Layout: Baris sejajar tidak menyusut
            "flex items-center gap-1.5 shrink-0"
          )}
        >
          {/* Tombol Toggle Panel Rincian */}
          <button
            type="button"
            onClick={() => setIsDetailOpen(!isDetailOpen)}
            className={cn(
              // 1. Flex & Spacing: Tombol ringkas bersudut rounded halus
              "inline-flex items-center gap-1 px-2 py-0.5 rounded",
              // 2. Visual Styling: Background slate dengan border halus
              "bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px]",
              // 3. Interaksi & Hover: Menjadi lebih terang
              "hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            )}
            title="Tampilkan ringkasan data cache"
          >
            <span>{isDetailOpen ? "Tutup" : "Rincian"}</span>
            {isDetailOpen ? (
              <ChevronUp className="w-3 h-3 text-cyan-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-cyan-400" />
            )}
          </button>

          {/* Tombol Purge Cache dengan Pilihan Per-Tier */}
          <div className="relative inline-flex items-center">
            {/* Tombol Utama: Purge All */}
            <button
              type="button"
              onClick={purgeCache}
              disabled={isPurging}
              className={cn(
                // 1. Flex & Spacing: Tombol aksi rose/merah bagian kiri
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-l border-y border-l text-[10px] transition-colors cursor-pointer",
                "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border-rose-500/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Purge seluruh cache (T1, T2, T3, T4, T5)"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>{isPurging && (!purgingTier || purgingTier === "all") ? "Purging..." : "Purge"}</span>
            </button>

            {/* Tombol Trigger Menu Dropdown */}
            <button
              type="button"
              onClick={() => setIsPurgeMenuOpen(!isPurgeMenuOpen)}
              disabled={isPurging}
              className={cn(
                "inline-flex items-center px-1 py-0.5 rounded-r border text-[10px] transition-colors cursor-pointer",
                "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border-rose-500/30 border-l-rose-500/20",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Pilih tier cache tertentu untuk dibersihkan"
            >
              <ChevronDown className={cn("w-3 h-3 text-rose-400 transition-transform duration-150", isPurgeMenuOpen && "rotate-180")} />
            </button>

            {/* Menu Popover Dropdown Pilihan Per-Tier */}
            {isPurgeMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 z-50 w-52 p-1.5 bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setIsPurgeMenuOpen(false)}
              >
                <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                  <span>Purge Cache Per Tier</span>
                  <span className="text-cyan-400 text-[9px]">T1 - T5</span>
                </div>
                <button
                  type="button"
                  onClick={() => purgeTier("all")}
                  disabled={isPurging}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-rose-300 hover:bg-rose-500/20 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Purge Semua (All)</span>
                  </span>
                  <span className="text-[9px] text-slate-500">T1 - T5</span>
                </button>
                {tiers.map((t) => (
                  <button
                    key={t.tier}
                    type="button"
                    onClick={() => purgeTier(`T${t.tier}` as any)}
                    disabled={isPurging}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-slate-300 hover:text-white hover:bg-slate-900 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className="font-semibold">T{t.tier}: {t.shortName}</span>
                    </span>
                    <span className="text-[9px] text-slate-500">{t.medium.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Compact Info Panel (Panel Ekstensi Rincian) */}
      {isDetailOpen && (
        <div
          className={cn(
            // 1. Layout & Spacing: Area panel lipat dengan padding atas dan bawah
            "border-t border-slate-800/80 px-4 sm:px-8 py-3",
            // 2. Visual Styling: Latar belakang gelap slate pekat
            "bg-slate-950/95",
            // 3. Animasi Muncul: Efek slide halus dari atas
            "animate-in slide-in-from-top-1 duration-150"
          )}
        >
          <div className="max-w-7xl mx-auto space-y-3">
            {/* Grid 5 Kolom Kartu Rincian Masing-Masing Tier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-[10px]">
              {tiers.map((t) => (
                <div
                  key={t.tier}
                  className={cn(
                    // 1. Box Model & Layout
                    "p-2.5 rounded-lg border flex flex-col justify-between",
                    // 2. Visual Tema Berdasarkan Status Aktif/Standby
                    t.isStored
                      ? "bg-slate-900/80 border-emerald-500/35"
                      : "bg-slate-900/30 border-slate-800"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-300">T{t.tier}: {t.shortName}</span>
                      <span className={t.isStored ? "text-emerald-400" : "text-slate-500"}>
                        {t.isStored ? "Aktif" : "Standby"}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1 font-sans text-[9px] line-clamp-2">
                      {t.description}
                    </p>
                    {t.details && (
                      <p className="text-cyan-400/90 mt-1 font-mono text-[9px] truncate">
                        {t.details}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>{t.latencyLabel}</span>
                      {t.sizeBytes !== undefined && t.sizeBytes > 0 && (
                        <span className="text-cyan-400 font-semibold">{formatDataSizeMB(t.sizeBytes)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => purgeTier(`T${t.tier}` as any)}
                      disabled={isPurging}
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer",
                        purgingTier === `T${t.tier}`
                          ? "bg-rose-500/30 text-rose-200 border border-rose-500/50 animate-pulse"
                          : "bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      title={`Purge Cache Tier ${t.tier}: ${t.name}`}
                    >
                      <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                      <span>{purgingTier === `T${t.tier}` ? "Purging..." : `Purge T${t.tier}`}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Live API Request Cache Tracker Countdown Row */}
            {recentApiCaches.length > 0 && (
              <div
                className={cn(
                  // 1. Layout & Border
                  "pt-2 border-t border-slate-800/80",
                  // 2. Alignment: Responsif baris pada desktop, tumpuk pada layar kecil
                  "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2",
                  // 3. Tipografi
                  "text-[9px] text-slate-400"
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-300 shrink-0">
                  <Clock className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Countdown Cache Request API Terkini:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {recentApiCaches.slice(-4).map((item) => {
                    const itemRem = Math.max(0, Math.floor((item.expiry - Date.now()) / 1000));
                    return (
                      <span
                        key={item.endpoint}
                        className={cn(
                          // 1. Box Model & Padding
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded",
                          // 2. Visual Styling
                          "bg-slate-900 border border-slate-800 font-mono text-[9px]"
                        )}
                      >
                        <span className="text-slate-400">{item.endpoint.replace("/api/v1/", "")}:</span>
                        <span className="text-emerald-300 font-bold">{formatCountdownString(itemRem)}</span>
                        <span className="text-cyan-400 font-semibold">
                          ({item.cacheTier ? `Cache ${item.cacheTier} ` : ""}{item.responseTimeMs}ms)
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
