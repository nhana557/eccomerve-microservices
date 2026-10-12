"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useProducts } from "@/features/products/hooks/use-products";
import { useOrders } from "@/features/orders/hooks/use-orders";
import { usePayments } from "@/features/payments/hooks/use-payments";
import { useDashboardOverview } from "@/features/system/hooks/use-dashboard-overview";
import { TechEngineCards } from "@/features/system/layouts/TechEngineCards";
import { DashboardSidebar, type DashboardTab } from "@/features/system/layouts/DashboardSidebar";
import { ServiceHealthGrid } from "@/features/system/layouts/ServiceHealthGrid";
import { ProductManagementTable } from "@/features/products/layouts/ProductManagementTable";
import { OrderManagementTable } from "@/features/orders/layouts/OrderManagementTable";
import { PaymentHistoryTable } from "@/features/payments/layouts/PaymentHistoryTable";
import { SortDirection } from "@/lib/table-helpers";
import { useEnvironment } from "@/components/layout/EnvironmentContext";
import { EnvironmentToggle } from "@/components/layout/EnvironmentToggle";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ArrowLeft,
  FlaskConical,
  ShieldCheck,
  Zap,
  Layers,
  GitBranch,
  Database,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { mode, isSandbox, isProd } = useEnvironment();

  const {
    products,
    totalCount,
    pageSize,
    setPageSize,
    selectedCategory,
    setSelectedCategory,
    setSort,
    engineMethod,
    setEngineMethod,
    searchQuery,
    setSearchQuery,
    isLoading: isProductsLoading,
    responseTime: productResponseTime,
    responseSize: productResponseSize,
    cacheRemainingSeconds: productCacheRemainingSeconds,
    isFromCache: productIsFromCache,
    activeCacheTier: productCacheTier,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProducts({
    sort: "name_asc",
    noCache: true, // Direct hit API, bypass all caching (T1 & T4) on dashboard console
    method: "btree_index",
  });
  const { orders, responseTime: orderResponseTime, updateStatus: updateOrderStatus } = useOrders();
  const { payments, responseTime: paymentResponseTime, updateStatus: updatePaymentStatus } = usePayments();
  const {
    services,
    userCount,
    isChecking,
    lastChecked,
    responseTime: healthResponseTime,
    checkHealth,
  } = useDashboardOverview();

  const [activeTab, setActiveTab] = useState<DashboardTab>("products");

  const handleSortChange = (field: string, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setSort(`${field}_${direction}`);
  };

  const healthyServicesCount = services.filter(
    (s) => s.status === "HEALTHY" || s.status === "UP"
  ).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Admin & Monitoring Dashboard"
        badge={
          <Badge variant="info" size="sm" shape="rounded">
            T.STORE CONSOLE
          </Badge>
        }
        description="Pusat kendali metrik, katalog produk, pesanan, dan status live microservices platform."
        actions={
          <>
            <EnvironmentToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-sm shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kembali ke T.STORE</span>
            </Link>
          </>
        }
      />

      {/* INDIKATOR TEKNIS BACKEND: SANDBOX VS PRODUCTION */}
      {isSandbox ? (
        <div className="space-y-3 animate-in fade-in-50 duration-200">
          {/* Diagnostic Stats Header Bar */}
          <div className="p-4 rounded-2xl bg-[#14161D] border border-amber-500/40 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <FlaskConical className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">
                    Diagnostik Backend Sandbox &amp; Engine Telemetry
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    LIVE TELEMETRY
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pengujian latensi waktu nyata, verifikasi multi-tier cache, metode query CQRS vs Postgres Raw, dan indeks B-Tree.
                </p>
              </div>
            </div>

            {/* Quick Indicators Pill Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {/* 1. Indikator Response Time */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400 text-[11px]">Latensi:</span>
                <span
                  className={`font-bold ${
                    productResponseTime !== null && productResponseTime < 50
                      ? "text-emerald-400"
                      : productResponseTime !== null && productResponseTime < 200
                      ? "text-cyan-400"
                      : "text-amber-400"
                  }`}
                >
                  {productResponseTime !== null ? `${productResponseTime} ms` : "Mengukur..."}
                </span>
              </div>

              {/* 2. Indikator Cache Tier */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400 text-[11px]">Cache Tier:</span>
                <span className="font-bold text-emerald-400">
                  {productCacheTier ? `Tier ${productCacheTier}` : productIsFromCache ? "Active" : "Bypass (L0)"}
                </span>
              </div>

              {/* 3. Metode Query (CQRS vs B-Tree vs Postgres) */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-400 text-[11px]">Metode Query:</span>
                <span className="font-bold text-purple-300 uppercase">
                  {engineMethod === "cqrs"
                    ? "CQRS ES"
                    : engineMethod === "postgres_filter"
                    ? "Raw PG Scan"
                    : engineMethod === "in_memory_cache"
                    ? "Cache Tier"
                    : "B-Tree + GIN"}
                </span>
              </div>

              {/* 4. Filter PG vs BTree */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 text-[11px]">Filter Index:</span>
                <span className="font-bold text-amber-300">
                  {engineMethod === "postgres_filter" ? "Full Table Scan" : "B-Tree Indexed"}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Interactive Tech Simulation Engine Cards */}
          <TechEngineCards
            activeMethod={engineMethod}
            onSelectMethod={setEngineMethod}
            responseTime={productResponseTime}
            responseSize={productResponseSize}
          />
        </div>
      ) : (
        /* PROD MODE: CLEAN PRODUCTION BANNER */
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-300">
                  Production Mode Dashboard
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PROD ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Konsol operasional produksi bersih. Menjalankan query terindeks B-Tree + GIN, multi-tier cache otomatis, dan checkout payment gateway resmi tanpa simulasi eksperimental.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 text-[11px]">
                Status Platform: <b className="text-emerald-400 font-bold">OPTIMAL</b>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start pt-2">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          productCount={totalCount > 0 ? totalCount : products.length}
          orderCount={orders.length}
          paymentCount={payments.length}
          healthyServicesCount={healthyServicesCount}
          totalServicesCount={services.length}
        />

        <div className="flex-1 min-w-0 w-full">
          {activeTab === "products" && (
            <ProductManagementTable
              products={products}
              totalCount={totalCount}
              limit={pageSize}
              responseTime={productResponseTime}
              responseSize={productResponseSize}
              cacheRemainingSeconds={productCacheRemainingSeconds}
              isFromCache={productIsFromCache}
              cacheTier={productCacheTier}
              isLoading={isProductsLoading}
              selectedCategory={selectedCategory === "All" ? "all" : selectedCategory}
              onCategoryChange={(cat: string) => setSelectedCategory(cat === "all" ? "All" : cat)}
              engineMethod={engineMethod}
              onEngineMethodChange={setEngineMethod}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onLimitChange={setPageSize}
              onCreateProduct={createProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
            />
          )}
          {activeTab === "orders" && (
            <OrderManagementTable
              orders={orders}
              responseTime={orderResponseTime}
              onUpdateStatus={updateOrderStatus}
            />
          )}
          {activeTab === "payments" && (
            <PaymentHistoryTable
              payments={payments}
              responseTime={paymentResponseTime}
              onSimulateSuccess={(id) => updatePaymentStatus(id, "SUCCESS")}
            />
          )}
          {activeTab === "health" && (
            <ServiceHealthGrid
              services={services}
              responseTime={healthResponseTime}
              onTestConnection={checkHealth}
              isTesting={isChecking}
              lastChecked={lastChecked}
            />
          )}
        </div>
      </div>
    </div>
  );
}
