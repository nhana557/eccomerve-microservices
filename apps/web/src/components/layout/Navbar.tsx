"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ChevronDown,
  Bell,
  Mail,
  Grid,
} from "lucide-react";
import { apiMetrics, CacheTierLabel, getGatewayUrl } from "@/lib/api-client";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { CategoryMegaMenu } from "@/features/categories/layouts/CategoryMegaMenu";
import { useAuth } from "@/features/auth/context/AuthContext";
import { MultiTierCacheBar } from "./MultiTierCacheBar";
import { EnvironmentToggle } from "./EnvironmentToggle";
import { useEnvironment } from "./EnvironmentContext";
import { cn } from "@/lib/utils";
import { isClerkEnabled } from "@/lib/clerk-config";
import { NavbarBrand } from "./navbar/NavbarBrand";
import { NavbarLatencyBadge } from "./navbar/NavbarLatencyBadge";
import { NavbarSearchBar } from "./navbar/NavbarSearchBar";
import { NavbarCartButton } from "./navbar/NavbarCartButton";
import { NavbarAuth } from "./navbar/NavbarAuth";

/**
 * Properti untuk komponen navigasi utama `Navbar`.
 */
export interface NavbarProps {
  /** Jumlah produk aktif yang terdapat di keranjang belanja */
  cartItemCount?: number;
  /** Handler untuk membuka drawer keranjang belanja */
  onOpenCart?: () => void;
  /** Handler untuk membuka modal riwayat pesanan */
  onOpenOrders?: () => void;
  /** Kelas CSS kustom opsional */
  className?: string;
}

/**
 * Komponen navigasi utama platform e-commerce (T.STORE).
 *
 * Menggabungkan sub-komponen modular:
 * 1. **NavbarLatencyBadge**: Indikator latensi API waktu nyata & status multi-tier cache.
 * 2. **NavbarBrand**: Identitas brand resmi & logo T.STORE.
 * 3. **CategoryMegaMenu**: Navigasi hierarki 40+ sub-kategori produk.
 * 4. **NavbarSearchBar**: Input pencarian dinamis & panel kata kunci populer.
 * 5. **NavbarCartButton**: Tombol akses keranjang belanja & counter badge.
 * 6. **NavbarAuth**: Manajemen sesi pengguna (Clerk SSO vs Internal Auth).
 */
export function Navbar({
  cartItemCount = 0,
  onOpenCart,
  onOpenOrders,
  className,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [apiResponseTime, setApiResponseTime] = useState<number | null>(null);
  const [apiIsCache, setApiIsCache] = useState<boolean>(false);
  const [apiCacheTier, setApiCacheTier] = useState<CacheTierLabel>("T4");
  const [navSearch, setNavSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);

  const { categories: apiCategories } = useCategories();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { isSandbox } = useEnvironment();
  const clerkActive = isClerkEnabled();

  // Ping Gateway Health & Subscribe to API metrics
  useEffect(() => {
    const start = performance.now();
    const gateway = getGatewayUrl();
    const healthUrl = gateway ? `${gateway}/api/v1/health` : "/api/health";

    fetch(healthUrl)
      .then((res) => {
        const ms = Math.round(performance.now() - start);
        setApiResponseTime(ms);
        setApiIsCache(false);
        setApiCacheTier(null);
        setGatewayUp(res.ok);
      })
      .catch(() => {
        // Fallback to local /api/health route
        fetch("/api/health")
          .then((res) => setGatewayUp(res.ok))
          .catch(() => setGatewayUp(false));
      });

    const unsubscribe = apiMetrics.subscribe((_endpoint, ms, isCache, tier) => {
      setApiResponseTime(ms);
      setApiIsCache(Boolean(isCache));
      setApiCacheTier(tier || (isCache ? "T4" : null));
      setGatewayUp(true);
    });

    return () => unsubscribe();
  }, []);

  // Debounced search trigger for home page catalog
  useEffect(() => {
    if (pathname !== "/") return;
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("tokopedia:search", { detail: navSearch }));
    }, 350);
    return () => clearTimeout(timer);
  }, [navSearch, pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      setIsSearchFocused(false);
      window.dispatchEvent(new CustomEvent("tokopedia:search", { detail: navSearch }));
      if (pathname !== "/") {
        router.push(`/?q=${encodeURIComponent(navSearch)}`);
      }
    }
  };

  const handleKeywordClick = (kw: string) => {
    setNavSearch(kw);
    setIsSearchFocused(false);
    window.dispatchEvent(new CustomEvent("tokopedia:search", { detail: kw }));
    if (pathname !== "/") {
      router.push(`/?q=${encodeURIComponent(kw)}`);
    }
  };

  const handleSelectMegaCategory = (cat: { id?: string; name: string }) => {
    window.dispatchEvent(new CustomEvent("tokopedia:category", { detail: cat }));
    if (pathname !== "/") {
      const qs = new URLSearchParams();
      if (cat.id) qs.set("category_id", cat.id);
      if (cat.name) qs.set("category", cat.name);
      router.push(`/?${qs.toString()}`);
    }
  };

  const handleOpenOrders = () => {
    if (onOpenOrders) {
      onOpenOrders();
    } else {
      router.push("/orders");
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* 1. TOP STICKY BAR: Response Time API ke atas (Cache Status & Live API Response Time) */}
      <div
        className={cn(
          "sticky top-0 z-40 overflow-visible",
          "bg-[#121417] border-b border-slate-800/80 shadow-md"
        )}
      >
        {/* Multi-Tier Caching Architecture Indicator Bar (Khusus di Halaman Utama '/' pada Mode Sandbox) */}
        {pathname === "/" && isSandbox && <MultiTierCacheBar />}

        {/* TOP SUB-HEADER BAR: Live API Response Time Indicator, Gateway UP, Admin Dashboard */}
        <div className="bg-[#16191D] px-4 sm:px-8 py-1.5 text-[11px] text-slate-400">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Kiri: Sub-komponen Indikator Waktu Respons API Live */}
            <NavbarLatencyBadge
              apiResponseTime={apiResponseTime}
              apiIsCache={apiIsCache}
              apiCacheTier={apiCacheTier}
            />

            {/* Kanan: Indikator Gateway & Link Admin Dashboard */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Status Pill Gateway :8080 */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    gatewayUp === true
                      ? "bg-emerald-400 animate-pulse"
                      : gatewayUp === false
                      ? "bg-rose-400"
                      : "bg-amber-400"
                  )}
                />
                <span className="font-mono text-[10px] text-slate-300">
                  {gatewayUp === true
                    ? "Gateway :8080 UP"
                    : gatewayUp === false
                    ? "Gateway Offline"
                    : "Checking..."}
                </span>
              </div>

              {/* Indikator Mesin Autentikasi Aktif (Clerk vs Fallback Internal) */}
              <div
                title={
                  clerkActive
                    ? "Autentikasi Terintegrasi dengan Clerk & Google SSO"
                    : "Autentikasi Lokal/Internal Aktif (Publishable Key Clerk belum dikonfigurasi)"
                }
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono",
                  clerkActive
                    ? "border-cyan-500/30 bg-cyan-950/20 text-cyan-300"
                    : "border-slate-800 bg-[#16191D] text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    clerkActive ? "bg-cyan-400" : "bg-emerald-400"
                  )}
                />
                <span>Auth: {clerkActive ? "Clerk SSO" : "Internal"}</span>
              </div>

              {/* Mode Lingkungan Toggle: PROD vs SANDBOX */}
              <EnvironmentToggle />

              {/* Tautan Navigasi ke Dashboard Admin */}
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                  pathname === "/dashboard"
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-slate-300 hover:text-emerald-400"
                )}
              >
                <LayoutDashboard className="w-3 h-3" />
                <span>Admin Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Logo, Kategori, Search Bar, Keranjang, dan Pengguna) */}
      <header className="relative z-30 bg-[#121417] border-b border-slate-800/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
          {/* Sub-komponen 1: Logo Brand */}
          <NavbarBrand />

          {/* Trigger Tombol Dropdown Mega-Menu Kategori */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setIsMegaMenuOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all shrink-0",
                isMegaMenuOpen
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                  : "text-slate-200 hover:text-emerald-400 hover:bg-slate-800/80 border-transparent hover:border-slate-800"
              )}
            >
              <Grid className="w-4 h-4 text-emerald-400" />
              <span>Kategori</span>
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-slate-400 transition-transform duration-200",
                  isMegaMenuOpen && "rotate-180 text-emerald-400"
                )}
              />
            </button>

            <CategoryMegaMenu
              categories={apiCategories}
              isOpen={isMegaMenuOpen}
              onClose={() => setIsMegaMenuOpen(false)}
              onSelectCategory={handleSelectMegaCategory}
            />
          </div>

          {/* Sub-komponen 2: Kolom Pencarian dengan Saran Otomatis */}
          <NavbarSearchBar
            value={navSearch}
            onChange={setNavSearch}
            onSubmit={handleSearchSubmit}
            onSelectKeyword={handleKeywordClick}
            isFocused={isSearchFocused}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />

          {/* Sisi Kanan: Notifikasi, Pesan, Keranjang & Autentikasi User */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Tombol Notifikasi */}
            <button
              type="button"
              aria-label="Notifikasi"
              className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5" />
            </button>

            {/* Tombol Pesan/Envelope */}
            <button
              type="button"
              aria-label="Pesan"
              className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors hidden sm:block cursor-pointer"
            >
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Divider Vertikal */}
            <div className="w-[1px] h-5 bg-slate-800 mx-1" />

            {/* Sub-komponen 3: Tombol Keranjang Belanja */}
            <NavbarCartButton
              cartItemCount={cartItemCount}
              onOpenCart={onOpenCart}
            />

            {/* Sub-komponen 4: Manajemen Akun / Autentikasi Pengguna */}
            <NavbarAuth
              isAuthenticated={isAuthenticated}
              user={user}
              clerkActive={clerkActive}
              onOpenOrders={handleOpenOrders}
              onOpenAuthModal={openAuthModal}
              onLogout={logout}
            />
          </div>
        </div>
      </header>
    </div>
  );
}

export default Navbar;
