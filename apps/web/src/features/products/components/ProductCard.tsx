"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Product } from "../types";
import {
  calculateOriginalPrice,
  formatSalesCount,
  getProductImage,
  DEFAULT_PRODUCT_FALLBACK,
} from "../utils/tokopedia-helpers";
import {
  Plus,
  Star,
  ShieldCheck,
  Truck,
  CheckCircle2,
} from "lucide-react";

export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Consistent mock rating & discount data based on product id
function getProductMockStats(product: Product) {
  const hash = product.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const discountPercent = (hash % 4) * 5 + 10; // 10%, 15%, 20%, 25%
  const rating = (4.7 + ((hash % 3) * 0.1)).toFixed(1);
  const sold = ((hash % 10) + 1) * 35; // e.g. 140, 210, etc.
  const city = hash % 2 === 0 ? "Jakarta Barat" : "Jakarta Selatan";

  return {
    discountPercent,
    rating,
    sold,
    city,
  };
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const stats = getProductMockStats(product);
  const originalPrice = calculateOriginalPrice(product.price, stats.discountPercent);
  const imageUrl = getProductImage(product);
  const [imgSrc, setImgSrc] = useState(imageUrl);

  useEffect(() => {
    setImgSrc(imageUrl);
  }, [imageUrl]);

  return (
    <div className="group relative bg-[#1A1D20] hover:bg-[#212529] border border-slate-800 hover:border-emerald-500/60 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-950/30 transition-all duration-200 flex flex-col justify-between">
      {/* Real Product Image Showcase Container */}
      <div className="relative w-full aspect-square bg-[#121417] flex items-center justify-center border-b border-slate-800/80 overflow-hidden">
        {/* Real Product Photo */}
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
          onError={() => setImgSrc(DEFAULT_PRODUCT_FALLBACK)}
          className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
          unoptimized={typeof imgSrc === "string" && imgSrc.startsWith("data:")}
        />

        {/* Subtle Gradient Overlay for Badges Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1D20]/80 via-transparent to-black/40 pointer-events-none" />

        {/* Top Left: Official Store Badge */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#121417]/85 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Official</span>
          </span>
        </div>

        {/* Top Right: Stock Status */}
        <div className="absolute top-2 right-2 z-10">
          {isOutOfStock ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/85 text-rose-300 border border-rose-500/40 backdrop-blur-md">
              Habis
            </span>
          ) : product.stock <= 5 ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-950/85 text-amber-300 border border-amber-500/40 backdrop-blur-md">
              Sisa {product.stock}
            </span>
          ) : null}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Product Name (2 Lines truncation ala Tokopedia) */}
          <h3 className="text-xs sm:text-sm text-slate-200 font-normal leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
            {product.name}
          </h3>

          {/* Price & Discount */}
          <div className="mt-1.5">
            <div className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight">
              {formatRupiah(product.price)}
            </div>

            {/* Discount tag and original crossed price */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-black text-rose-400 bg-rose-500/15 px-1 py-0.2 rounded font-mono">
                {stats.discountPercent}%
              </span>
              <span className="text-[11px] text-slate-500 line-through font-mono">
                {formatRupiah(originalPrice)}
              </span>
            </div>
          </div>

          {/* Merchant / Location row */}
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 truncate">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">{stats.city}</span>
          </div>

          {/* Rating & Sales */}
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-0.5 text-amber-400">
              <Star className="w-3 h-3 fill-amber-400" />
              <span className="font-semibold text-slate-200">{stats.rating}</span>
            </div>
            <span>•</span>
            <span className="text-slate-400">{formatSalesCount(stats.sold)}</span>
          </div>

          {/* Tokopedia Bebas Ongkir Badge */}
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/80">
              <Truck className="w-3 h-3 text-emerald-400" />
              <span>Bebas Ongkir</span>
            </span>
          </div>
        </div>

        {/* Add to Cart Action */}
        <div className="mt-2 pt-2 border-t border-slate-800/60">
          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Keranjang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
