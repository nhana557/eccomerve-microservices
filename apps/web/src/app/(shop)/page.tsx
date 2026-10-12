"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/features/products/hooks/use-products";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useCart } from "@/features/cart/context/CartContext";
import { useOrders } from "@/features/orders/hooks/use-orders";
import { useToast } from "@/components/feedback/ToastContext";
import { PromoBannerCarousel } from "@/features/products/layouts/PromoBannerCarousel";
import { QuickCategoryRow } from "@/features/products/layouts/QuickCategoryRow";
import { FlashSaleSection } from "@/features/products/layouts/FlashSaleSection";
import { ProductGrid } from "@/features/products/layouts/ProductGrid";
import { ProductFilter } from "@/features/products/components/ProductFilter";
import { CartDrawer } from "@/features/cart/layouts/CartDrawer";
import { CheckoutModal } from "@/features/orders/components/CheckoutModal";
import { OrderHistoryModal } from "@/features/orders/components/OrderHistoryModal";
import { getQuickCategoryActiveId } from "@/features/products/utils/tokopedia-helpers";
import {
  getResponseTimeBadgeClass,
  formatResponseTime,
  formatDataSizeMB,
  formatCountdownString,
} from "@/lib/table-helpers";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Headphones,
  Loader2,
  ChevronDown,
  Zap,
  HardDrive,
  ArrowDown,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const {
    filteredProducts,
    products,
    totalCount,
    pageSize,
    setPageSize,
    responseTime: productResponseTime,
    responseSize: productResponseSize,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    selectedCategory,
    setSelectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    searchQuery,
    setSearchQuery,
    minPrice,
    maxPrice,
    setPriceRange,
    minStock,
    setMinStock,
    resetFilters,
    cacheRemainingSeconds,
    isFromCache,
    activeCacheTier,
  } = useProducts({
    method: "cqrs",
    limit: 60,
  });

  const { categories: apiCategories } = useCategories();

  const { addToCart, items, totalPrice } = useCart();
  const { checkoutOrder } = useOrders();
  const { showToast } = useToast();

  const [activeQuickId, setActiveQuickId] = useState<string>("all");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [virtualRowCount, setVirtualRowCount] = useState<number>(13);

  // Sync with Tokopedia Navbar open orders custom event
  useEffect(() => {
    const handleOpenOrders = () => setIsOrdersOpen(true);
    window.addEventListener("tokopedia:open-orders", handleOpenOrders);
    return () => window.removeEventListener("tokopedia:open-orders", handleOpenOrders);
  }, []);

  // Check query parameter on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q && q.trim()) {
        setSearchQuery(q.trim());
        setSelectedCategory("All");
        setSelectedCategoryId(undefined);
        setActiveQuickId("all");
        setTimeout(() => {
          document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, [setSearchQuery, setSelectedCategory, setSelectedCategoryId]);

  // Sync with Tokopedia Navbar search bar custom event
  useEffect(() => {
    const handleTokopediaSearch = (e: any) => {
      if (e.detail !== undefined) {
        setSearchQuery(e.detail);
        if (e.detail && typeof e.detail === "string" && e.detail.trim() !== "") {
          setSelectedCategory("All");
          setSelectedCategoryId(undefined);
          setActiveQuickId("all");
        }
        document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("tokopedia:search", handleTokopediaSearch);
    return () => window.removeEventListener("tokopedia:search", handleTokopediaSearch);
  }, [setSearchQuery, setSelectedCategory, setSelectedCategoryId]);

  // Sync with Tokopedia Navbar Mega-Menu category selection event
  useEffect(() => {
    const handleTokopediaCategory = (e: any) => {
      if (e.detail) {
        const { id, name } = e.detail;
        if (name === "All") {
          setSelectedCategory("All");
          setSelectedCategoryId(undefined);
          setActiveQuickId("all");
        } else {
          setSelectedCategory(name);
          setSelectedCategoryId(id);
          setActiveQuickId(getQuickCategoryActiveId(name));
        }
        document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("tokopedia:category", handleTokopediaCategory);
    return () => window.removeEventListener("tokopedia:category", handleTokopediaCategory);
  }, [setSelectedCategory, setSelectedCategoryId]);

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (apiCategories) {
      for (const cat of apiCategories) {
        map[cat.id] = cat.name;
        if (cat.children) {
          for (const sub of cat.children) {
            map[sub.id] = sub.name;
          }
        }
      }
    }
    return map;
  }, [apiCategories]);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    if (apiCategories && apiCategories.length > 0) {
      apiCategories.forEach((c) => {
        if (c.name) set.add(c.name);
      });
    }
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [apiCategories, products]);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const matched = apiCategories?.find(
      (c) => c.name.toLowerCase() === cat.toLowerCase()
    );
    setSelectedCategoryId(matched ? matched.id : undefined);
    setActiveQuickId(getQuickCategoryActiveId(cat));
  };

  const handleSelectQuickItem = (id: string) => {
    setActiveQuickId(id);

    if (id === "all") {
      setSelectedCategory("All");
      setSelectedCategoryId(undefined);
      document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "flash") {
      document.getElementById("kejar-diskon")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "elec") {
      const matched = apiCategories?.find(
        (c) => c.name.toLowerCase().includes("elektronik") || c.name.toLowerCase().includes("electronic")
      );
      setSelectedCategory(matched ? matched.name : "Elektronik");
      setSelectedCategoryId(matched ? matched.id : undefined);
      document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "apparel") {
      const matched = apiCategories?.find(
        (c) => c.name.toLowerCase().includes("fashion pria") || c.name.toLowerCase().includes("fashion") || c.name.toLowerCase().includes("apparel")
      );
      setSelectedCategory(matched ? matched.name : "Fashion Pria");
      setSelectedCategoryId(matched ? matched.id : undefined);
      document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "acc") {
      const matched = apiCategories?.find(
        (c) => c.name.toLowerCase().includes("komputer") || c.name.toLowerCase().includes("aksesoris")
      );
      setSelectedCategory(matched ? matched.name : "Komputer & Laptop");
      setSelectedCategoryId(matched ? matched.id : undefined);
      document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "os") {
      setSelectedCategory("All");
      setSelectedCategoryId(undefined);
      document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
      showToast("info", "Official Store", "Menampilkan produk resmi toko terverifikasi.");
    } else if (id === "ongkir") {
      setSelectedCategory("All");
      setSelectedCategoryId(undefined);
      document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" });
      showToast("info", "Bebas Ongkir", "Menampilkan produk bertanda Bebas Ongkir se-Indonesia.");
    } else if (id === "topup") {
      showToast("info", "Top-Up & Tagihan", "Layanan pembayaran tagihan PLN, Pulsa, & BPJS segera hadir di NovaStore.");
    }
  };

  const handleConfirmCheckout = async (
    userId: string,
    paymentMethod: string,
    rawTotal: number,
    promoCode?: string,
    discountAmount?: number,
    finalAmount?: number
  ) => {
    return checkoutOrder(userId, items, paymentMethod, rawTotal, promoCode, discountAmount, finalAmount);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* 1. Tokopedia Hero Carousel Promo Banner (Disabled / Hidden) */}
      {/* <PromoBannerCarousel /> */}

      {/* 2. Tokopedia Quick Category Icons ("Kategori Pilihan") (Disabled / Hidden) */}
      {/* <QuickCategoryRow
        activeId={activeQuickId}
        onSelectQuickItem={handleSelectQuickItem}
        categories={apiCategories}
      /> */}

      {/* 3. Tokopedia "Kejar Diskon" (Flash Sale with Live Timer & Stock Bars) (Disabled / Hidden) */}
      {/* <FlashSaleSection products={products} onAddToCart={addToCart} /> */}

      {/* 4. Tokopedia Main Catalog: "Rekomendasi Untuk Anda" */}
      <section id="rekomendasi" className="space-y-4 pt-2 scroll-mt-28">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <span>Rekomendasi Untuk Anda</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {totalCount > filteredProducts.length
              ? `${filteredProducts.length} dari ${totalCount.toLocaleString("id-ID")} produk pilihan`
              : `${filteredProducts.length} produk pilihan`}
          </span>
        </div>

        {/* Tokopedia Category Tabs, Price Range & Stock Filters */}
        <ProductFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          selectedCategoryId={selectedCategoryId}
          onSelectCategoryId={setSelectedCategoryId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onPriceChange={setPriceRange}
          minStock={minStock}
          onStockChange={setMinStock}
          onResetFilters={resetFilters}
          categoryNameMap={categoryNameMap}
          limit={pageSize}
          onLimitChange={setPageSize}
        />

        {/* Clean Catalog Metadata & Counter Bar (Between: Kiri dan Kanan, Single Row) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 font-mono py-1.5 px-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          {/* Sisi Kiri: Counter Data */}
          <div className="flex items-center gap-2 shrink min-w-0">
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 inline shrink-0" />}
            <span className="truncate">
              Menampilkan{" "}
              <span className="text-emerald-400 font-semibold">
                {filteredProducts.length.toLocaleString("id-ID")}
              </span>{" "}
              dari{" "}
              <span className="text-slate-200 font-semibold">
                {totalCount > filteredProducts.length
                  ? totalCount.toLocaleString("id-ID")
                  : filteredProducts.length.toLocaleString("id-ID")}
              </span>{" "}
              produk pilihan {totalCount > filteredProducts.length ? `(batch ${pageSize.toLocaleString("id-ID")})` : ""}
            </span>
          </div>

          {/* Sisi Kanan: Badges Berjejer Rapi Satu Baris Tanpa Wrap */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap justify-end">
            {isFromCache ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-sm shrink-0 whitespace-nowrap">
                <span>CACHE {activeCacheTier || "T1"}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm shrink-0 whitespace-nowrap">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>LIVE CQRS ({productResponseTime !== null ? `${productResponseTime} ms` : "Live"})</span>
              </span>
            )}

            {productResponseSize !== undefined && productResponseSize !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-semibold bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 shadow-sm shrink-0 whitespace-nowrap">
                <HardDrive className="w-3 h-3 text-cyan-400" />
                <span>{formatDataSizeMB(productResponseSize)}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-[10px] text-emerald-300 font-mono shadow-sm shrink-0 whitespace-nowrap">
              <span>⚡ Virtual Scroll ({virtualRowCount} baris DOM)</span>
            </span>
          </div>
        </div>

        {/* Tokopedia 5-6 Column Compact Product Card Grid with Virtual Scroll */}
        <ProductGrid
          products={filteredProducts}
          isLoading={isLoading}
          onAddToCart={addToCart}
          onRowCountChange={setVirtualRowCount}
        />

        {/* Load More Button & Fastest Combination Engine Bar */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="pt-8 pb-3 flex flex-col items-center justify-center gap-3.5 text-center">
            {/* Load More Button */}
            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 hover:border-emerald-500/70 text-emerald-300 hover:text-white font-semibold text-xs sm:text-sm shadow-xl shadow-emerald-950/40 transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Muat produk berikutnya dengan kombinasi tercepat (CQRS Cache & B-Tree Indexing)"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Memuat Produk Tambahan...</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                    <span>
                      Muat Lebih Banyak (+{Math.min(pageSize, totalCount - filteredProducts.length).toLocaleString("id-ID")} Produk)
                    </span>
                    <ChevronDown className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                  </>
                )}
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 font-medium shadow-inner">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Semua {filteredProducts.length.toLocaleString("id-ID")} produk pilihan telah selesai ditampilkan</span>
              </div>
            )}

            {/* Performance, Engine & Counter Badges */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center text-xs text-slate-300 font-medium pt-1">
              <span>
                Menampilkan{" "}
                <span className="text-cyan-400 font-semibold font-mono">
                  {filteredProducts.length.toLocaleString("id-ID")}
                </span>{" "}
                dari{" "}
                <span className="text-slate-100 font-semibold font-mono">
                  {totalCount.toLocaleString("id-ID")}
                </span>{" "}
                produk pilihan
              </span>

              {/* Fast Hybrid Method Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/35 shadow-sm">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Kombinasi Tercepat (CQRS + B-Tree)</span>
              </span>

              {/* Response Time Badge */}
              {productResponseTime !== null && productResponseTime !== undefined && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-semibold border transition-colors ${
                    isFromCache
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/40"
                      : getResponseTimeBadgeClass(productResponseTime)
                  }`}
                  title={
                    isFromCache
                      ? `Data disajikan instan dari Browser Persistent Cache (Tier 4 IndexedDB). Latency pembacaan: ${productResponseTime} ms`
                      : "Waktu respons API Katalog Produk ke server"
                  }
                >
                  <Zap className="w-3 h-3 text-current" />
                  {isFromCache && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-400/25 text-emerald-300 font-bold">
                      CACHE {activeCacheTier || "T4"}
                    </span>
                  )}
                  <span>{formatResponseTime(productResponseTime)}</span>
                </span>
              )}

              {/* Payload Size Badge in MB */}
              {productResponseSize !== null && productResponseSize !== undefined && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  title="Total ukuran payload data response yang diterima"
                >
                  <HardDrive className="w-3 h-3 text-cyan-400" />
                  <span>{formatDataSizeMB(productResponseSize)}</span>
                </span>
              )}

              {/* Live Request Cache Countdown Badge */}
              {cacheRemainingSeconds !== null && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-semibold border shadow-sm transition-all ${
                    isFromCache
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                      : "bg-cyan-950/80 text-cyan-300 border-cyan-500/40"
                  }`}
                  title={
                    isFromCache
                      ? `Data disajikan instan dari Cache Tier ${activeCacheTier || "T4"}. Sisa masa berlaku cache: ${cacheRemainingSeconds} detik.`
                      : `Data baru dari API Gateway & disimpan di cache (TTL 5 Menit / 300 detik). Sisa TTL: ${cacheRemainingSeconds} detik.`
                  }
                >
                  <Clock className="w-3 h-3 text-current animate-pulse shrink-0" />
                  <span className="text-slate-400">{isFromCache ? "Cache Hit:" : "Cache Baru:"}</span>
                  <span className="font-bold text-white tracking-wide">
                    {formatCountdownString(cacheRemainingSeconds)}
                  </span>
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Batch: {pageSize} produk per muat (ubah jumlah batch di samping tab kategori di atas)
            </div>
          </div>
        )}
      </section>

      {/* 5. Tokopedia Trust & Guarantee Dark Footer Banner */}
      <section className="mt-12 rounded-2xl bg-[#1A1D20] border border-slate-800 p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-xs sm:text-sm">Bebas Ongkir Extra</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Gratis pengiriman se-Indonesia tanpa kuota.</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-xs sm:text-sm">100% Produk Original</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Jaminan garansi resmi toko terverifikasi.</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-xs sm:text-sm">Pembayaran Aman</div>
              <div className="text-[11px] text-slate-400 mt-0.5">GoPay, QRIS, Virtual Account, & Kartu Kredit.</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-xs sm:text-sm">Layanan 24/7 Toko Care</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Bantuan kendala pesanan siap kapan saja.</div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">T<span className="text-cyan-400">.</span>STORE</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">Official Store</span>
            <span>• Microservices Monorepo</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Kebijakan Privasi</span>
            <span>Syarat & Ketentuan</span>
            <span>Pusat Edukasi Seller</span>
          </div>
        </div>
      </section>

      {/* 6. Slide-over Cart & Order History Modal */}
      <CartDrawer onCheckout={() => router.push("/checkout")} />
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirmCheckout={handleConfirmCheckout}
        onViewOrders={() => setIsOrdersOpen(true)}
      />
      <OrderHistoryModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
      />
    </div>
  );
}
