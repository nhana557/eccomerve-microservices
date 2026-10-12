"use client";

import React from "react";
import {
  LayoutGrid,
  Zap,
  Laptop,
  Shirt,
  Layers,
  ShieldCheck,
  Truck,
  CreditCard,
} from "lucide-react";

interface QuickCategoryRowProps {
  activeId: string;
  onSelectQuickItem: (id: string, name?: string) => void;
  categories?: Array<{ id: string; name: string; slug?: string }>;
}

interface QuickItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isHot?: boolean;
}

const QUICK_ITEMS: QuickItem[] = [
  { id: "all", label: "Semua Kategori", icon: LayoutGrid },
  { id: "flash", label: "Kejar Diskon", icon: Zap, isHot: true },
  { id: "elec", label: "Elektronik", icon: Laptop },
  { id: "apparel", label: "Apparel & Fashion", icon: Shirt },
  { id: "acc", label: "Aksesoris Meja", icon: Layers },
  { id: "os", label: "Official Store", icon: ShieldCheck },
  { id: "ongkir", label: "Bebas Ongkir", icon: Truck },
  { id: "topup", label: "Top-Up & Tagihan", icon: CreditCard },
];

export function QuickCategoryRow({ activeId, onSelectQuickItem }: QuickCategoryRowProps) {
  return (
    <div className="w-full bg-[#1A1D20] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span>Kategori Pilihan</span>
          <span className="text-[10px] text-emerald-400 font-mono font-normal">#TokopediaDark</span>
        </h3>
        <span
          onClick={() => onSelectQuickItem("all")}
          className="text-xs text-slate-400 font-medium hover:text-emerald-400 cursor-pointer transition-colors"
        >
          Lihat Semua
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
        {QUICK_ITEMS.map((item) => {
          const Icon = item.icon;
          // Strictly unique active state: only one item can match item.id === activeId
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectQuickItem(item.id)}
              className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all duration-200 group relative ${
                isActive
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/15 scale-[1.02]"
                  : "bg-slate-900/90 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-slate-100"
              }`}
            >
              {item.isHot && (
                <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[9px] uppercase tracking-tighter shadow-sm animate-pulse">
                  HOT
                </span>
              )}

              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110 ${
                  isActive
                    ? "bg-emerald-500/25 text-emerald-400"
                    : "bg-slate-800/90 text-slate-300 group-hover:text-emerald-400 group-hover:bg-emerald-500/10"
                }`}
              >
                <Icon className="w-5 h-5 stroke-[1.8]" />
              </div>

              <span className="text-[11px] sm:text-xs font-medium line-clamp-1 leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
