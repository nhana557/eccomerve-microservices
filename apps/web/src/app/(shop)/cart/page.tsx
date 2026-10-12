"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/context/CartContext";
import { useProducts } from "@/features/products/hooks/use-products";
import { ProductCard, formatRupiah } from "@/features/products/components/ProductCard";
import { getProductImage, handleProductImageError } from "@/features/products/utils/tokopedia-helpers";
import { useToast } from "@/components/feedback/ToastContext";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  Check,
  X,
  Loader2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

const QUICK_PROMOS = [
  { code: "TOKOPEDIA20", label: "Diskon 20%" },
  { code: "HEMAT50", label: "Hemat 50rb" },
  { code: "BEBASONGKIR", label: "Bebas Ongkir" },
];

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    totalPrice,
    totalItems,
    appliedPromo,
    discountAmount,
    finalPrice,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyPromo,
    removePromo,
    addToCart,
  } = useCart();
  const { showToast } = useToast();

  // Load recommended products
  const { products: recommendedProducts, isLoading: isLoadingRecommended } = useProducts({
    method: "cqrs",
    limit: 12,
  });

  const [promoInput, setPromoInput] = useState("");
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    if (!code) {
      showToast("error", "Kode Kosong", "Masukkan kode promo terlebih dahulu.");
      return;
    }
    setIsValidatingPromo(true);
    try {
      const res = await applyPromo(code);
      if (res.success) {
        setPromoInput("");
      }
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleAddToCartRecommended = (product: any) => {
    addToCart(product);
    showToast(
      "success",
      "Ditambahkan ke Keranjang",
      `${product.name.slice(0, 30)}... berhasil masuk ke keranjang.`
    );
  };

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto">
      {/* Page Header Terpadu */}
      <PageHeader
        backHref="/"
        backLabel="Kembali ke Beranda"
        icon={ShoppingBag}
        title="Keranjang Belanja"
        badge={
          <Badge variant="success" size="sm" className="font-mono">
            {totalItems} Barang
          </Badge>
        }
        description="Kelola daftar produk pilihan Anda sebelum melanjutkan ke proses pembayaran."
        actions={
          items.length > 0 ? (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-rose-950/20 border border-transparent hover:border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Keranjang</span>
            </button>
          ) : undefined
        }
      />

      {/* Main Cart Content */}
      {items.length === 0 ? (
        /* Empty Cart State */
        <EmptyState
          icon={ShoppingBag}
          size="lg"
          title="Wah, keranjang belanjamu kosong"
          description="Yuk, isi dengan barang-barang impianmu! Cek rekomendasi produk menarik di bawah ini."
          action={
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mulai Belanja</span>
            </Link>
          }
        />
      ) : (
        /* Cart Grid Layout: Items on Left, Summary on Right */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Daftar Item Belanja & Voucher */}
          <div className="lg:col-span-8 space-y-4">
            {/* List of Cart Items */}
            <Card padding="sm" className="space-y-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80 font-semibold">
                <span>Daftar Produk ({items.length} Macam)</span>
                <span>Subtotal Item</span>
              </div>

              <div className="divide-y divide-slate-800/60">
                {items.map((item) => {
                  const imageUrl = getProductImage(item.product);
                  const itemSubtotal = item.product.price * item.quantity;

                  return (
                    <div
                      key={item.product.id}
                      className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Product Info & Photo */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="relative w-16 h-16 rounded-xl bg-[#0F1116] border border-slate-800 overflow-hidden shrink-0">
                          <Image
                            src={imageUrl}
                            alt={item.product.name}
                            fill
                            sizes="64px"
                            className="object-cover object-center"
                            unoptimized={typeof imageUrl === "string" && imageUrl.startsWith("data:")}
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-200 line-clamp-2 leading-snug">
                            {item.product.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-400">
                              {formatRupiah(item.product.price)}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              / unit
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Selector & Item Subtotal */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                        {/* Qty Box */}
                        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            aria-label="Kurangi Jumlah"
                            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-xs w-7 text-center text-slate-200 font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            aria-label="Tambah Jumlah"
                            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right min-w-24">
                          <div className="font-mono text-sm font-bold text-slate-100">
                            {formatRupiah(itemSubtotal)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info Pengiriman Bebas Ongkir */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-white">Promo Bebas Ongkir Aktif</span>
                    <span className="text-[11px] text-slate-400 block">Estimasi pengiriman kilat 1 - 2 hari ke seluruh Indonesia</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400">GRATIS</span>
              </div>
            </Card>

            {/* Card Voucher & Promo Code */}
            <Card padding="sm" className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>Makin Hemat Pakai Promo</span>
              </div>

              {appliedPromo ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-mono font-bold text-emerald-300">{appliedPromo.code}</span>
                      <span className="text-slate-400 ml-1.5 font-medium">({appliedPromo.title})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removePromo}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                    title="Hapus Promo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan kode voucher..."
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#0F1116] border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs text-slate-200 placeholder:text-slate-500 font-mono uppercase"
                    />
                    <button
                      type="button"
                      disabled={isValidatingPromo || !promoInput.trim()}
                      onClick={() => handleApplyPromo()}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {isValidatingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Gunakan"}
                    </button>
                  </div>

                  {/* Quick Promo Pills */}
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMOS.map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => handleApplyPromo(p.code)}
                        className="px-2.5 py-1 rounded-lg bg-[#0F1116] hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 text-[11px] font-mono text-slate-300 hover:text-emerald-300 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Tag className="w-3 h-3 text-emerald-400" />
                        <span>{p.code}</span>
                        <span className="text-slate-500 font-normal">({p.label})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Kolom Kanan: Ringkasan Belanja Sticky */}
          <div className="lg:col-span-4 sticky top-24 space-y-4">
            <Card variant="elevated" className="space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Ringkasan Belanja
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Harga ({totalItems} barang)</span>
                  <span className="font-mono text-slate-200">{formatRupiah(totalPrice)}</span>
                </div>

                {appliedPromo && discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Diskon ({appliedPromo.code})</span>
                    </span>
                    <span className="font-mono font-semibold">-{formatRupiah(discountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-400">
                  <span>Biaya Pengiriman</span>
                  <span className="text-emerald-400 font-semibold font-mono">GRATIS</span>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-sm">Total Tagihan</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    {formatRupiah(finalPrice)}
                  </span>
                </div>
              </div>

              {/* Action Button to Checkout */}
              <button
                type="button"
                onClick={() => router.push("/checkout")}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>Beli Langsung ({totalItems})</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Transaksi Terenkripsi &amp; Idempoten</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEKSI BAWAH: REKOMENDASI PRODUK PILIHAN                                    */}
      {/* ========================================================================= */}
      <section className="pt-6 border-t border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Star className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
                Rekomendasi Pilihan Untukmu
              </h2>
              <p className="text-xs text-slate-400">
                Temukan berbagai produk unggulan lainnya dengan harga terbaik hari ini.
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>Lihat Semua Produk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recommended Grid */}
        {isLoadingRecommended && (!recommendedProducts || recommendedProducts.length === 0) ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs">Memuat rekomendasi produk...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {recommendedProducts.slice(0, 12).map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onAddToCart={handleAddToCartRecommended}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
