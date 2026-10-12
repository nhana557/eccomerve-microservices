"use client";

import React from "react";
import { Package, ShoppingCart, DollarSign, Activity, ChevronRight, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";

export type DashboardTab = "products" | "orders" | "payments" | "health";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  productCount?: number;
  orderCount?: number;
  paymentCount?: number;
  healthyServicesCount?: number;
  totalServicesCount?: number;
}

export function DashboardSidebar({
  activeTab,
  onTabChange,
  productCount = 0,
  orderCount = 0,
  paymentCount = 0,
  healthyServicesCount = 0,
  totalServicesCount = 0,
}: DashboardSidebarProps) {
  const formatCount = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}k`;
    }
    return num.toString();
  };

  const navItems = [
    {
      id: "products" as DashboardTab,
      label: "Katalog Produk",
      subtitle: "Kelola SKU & inventaris",
      icon: Package,
      badge: productCount > 0 ? formatCount(productCount) : undefined,
      badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    },
    {
      id: "orders" as DashboardTab,
      label: "Pesanan (Orders)",
      subtitle: "Status order & cart",
      icon: ShoppingCart,
      badge: orderCount > 0 ? orderCount.toString() : undefined,
      badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    },
    {
      id: "payments" as DashboardTab,
      label: "Pembayaran",
      subtitle: "Riwayat & simulasi GMV",
      icon: DollarSign,
      badge: paymentCount > 0 ? paymentCount.toString() : undefined,
      badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    {
      id: "health" as DashboardTab,
      label: "Status Layanan",
      subtitle: "Monitoring microservices",
      icon: Activity,
      badge:
        totalServicesCount > 0
          ? `${healthyServicesCount}/${totalServicesCount}`
          : undefined,
      badgeColor:
        healthyServicesCount === totalServicesCount && totalServicesCount > 0
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          : "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-4 self-start z-20">
      {/* Mobile view: Horizontal scrollable pills */}
      <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 mb-4 scrollbar-none border-b border-slate-800/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop view: Vertical Sidebar */}
      <div className="hidden lg:flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur">
          <div className="px-3 pt-1 pb-3 text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center justify-between">
            <span>Menu Konsol</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full group text-left flex items-center justify-between p-3 rounded-xl transition-all border ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent text-emerald-200 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-transparent hover:border-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        isActive
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-slate-800/70 text-slate-400 border-slate-700/60 group-hover:text-slate-200 group-hover:border-slate-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isActive ? "text-emerald-200" : "text-slate-200"
                        }`}
                      >
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pl-2 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isActive
                          ? "text-emerald-400 translate-x-0.5"
                          : "text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Quick System Summary Card in Sidebar */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sistem Operasional</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
                {healthyServicesCount > 0
                  ? `${healthyServicesCount} microservices terhubung via PgBouncer.`
                  : "Menghubungkan ke API Gateway..."}
              </div>
            </div>

            <div className="mt-2.5">
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-600 text-[11px] font-semibold transition-all"
              >
                <Store className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lihat T.STORE Frontend</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
