"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Product } from "../types";
import { formatRupiah } from "../components/ProductCard";
import {
  formatCountdown,
  calculateOriginalPrice,
  getProductImage,
  DEFAULT_PRODUCT_FALLBACK,
} from "../utils/tokopedia-helpers";
import { Flame, Clock, Plus, AlertTriangle } from "lucide-react";

interface FlashSaleSectionProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

interface FlashSaleCardProps {
  product: Product;
  discountPercent: number;
  originalPrice: number;
  percentSold: number;
  onAddToCart: (product: Product) => void;
}

function FlashSaleCard({
  product,
  discountPercent,
  originalPrice,
  percentSold,
  onAddToCart,
}: FlashSaleCardProps) {
  const imageUrl = getProductImage(product);
  const [imgSrc, setImgSrc] = useState(imageUrl);

  useEffect(() => {
    setImgSrc(imageUrl);
  }, [imageUrl]);

  return (
    <div className="bg-[#212529] border border-slate-800/90 hover:border-rose-500/50 rounded-xl p-3 flex flex-col justify-between transition-all duration-200 group hover:shadow-lg hover:shadow-rose-950/20">
      <div>
        {/* Visual Square Box with Real Product Image */}
        <div className="relative w-full aspect-square rounded-lg bg-[#121417] border border-slate-800/80 mb-2.5 overflow-hidden flex items-center justify-center">
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            onError={() => setImgSrc(DEFAULT_PRODUCT_FALLBACK)}
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
            unoptimized={typeof imgSrc === "string" && imgSrc.startsWith("data:")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1D20]/80 via-transparent to-black/30 pointer-events-none" />

          {/* Discount Badge */}
          <div className="absolute top-2 left-2 z-10">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white shadow-md">
              -{discountPercent}%
            </span>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xs text-slate-200 font-medium line-clamp-2 group-hover:text-rose-300 transition-colors">
          {product.name}
        </h4>

        {/* Prices */}
        <div className="mt-1.5">
          <div className="text-sm font-bold text-slate-100 font-mono">
            {formatRupiah(product.price)}
          </div>
          <div className="text-[11px] text-slate-500 line-through font-mono">
            {formatRupiah(originalPrice)}
          </div>
        </div>
      </div>

      {/* Stock Bar & Button */}
      <div className="mt-3 space-y-2">
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-medium">
            <span className="text-rose-400 flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" /> Segera Habis
            </span>
            <span>{percentSold}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
              style={{ width: `${percentSold}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => onAddToCart(product)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Beli Sekarang</span>
        </button>
      </div>
    </div>
  );
}

export function FlashSaleSection({ products, onAddToCart }: FlashSaleSectionProps) {
  // 3 hours, 24 minutes, 15 seconds countdown
  const [secondsLeft, setSecondsLeft] = useState(3 * 3600 + 24 * 60 + 15);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { hours, minutes, seconds } = formatCountdown(secondsLeft);

  // Take first 4 products as flash sale items
  const flashProducts = products.slice(0, 4);
  if (flashProducts.length === 0) return null;

  return (
    <div id="kejar-diskon" className="w-full bg-[#1A1D20] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden scroll-mt-28">
      {/* Red/Amber accent glow in corner */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Countdown Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <Flame className="w-5 h-5 fill-rose-500/40" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>KEJAR DISKON</span>
                <span className="text-rose-400 font-extrabold">SPESIAL</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">Harga miring kuota terbatas, reset setiap 4 jam!</p>
          </div>
        </div>

        {/* Live Countdown Timer (Tokopedia Style Boxes) */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs text-slate-400 font-medium">Berakhir dalam</span>
          <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-100">
            <span className="px-1.5 py-0.5 rounded bg-rose-600/90 text-white shadow-sm">{hours}</span>
            <span className="text-rose-400">:</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-600/90 text-white shadow-sm">{minutes}</span>
            <span className="text-rose-400">:</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-600/90 text-white shadow-sm">{seconds}</span>
          </div>
        </div>
      </div>

      {/* Flash Sale Items Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {flashProducts.map((p, idx) => {
          const discountPercent = [45, 30, 50, 35][idx % 4];
          const originalPrice = calculateOriginalPrice(p.price, discountPercent);
          const percentSold = [82, 65, 91, 74][idx % 4];

          return (
            <FlashSaleCard
              key={`flash-${p.id}`}
              product={p}
              discountPercent={discountPercent}
              originalPrice={originalPrice}
              percentSold={percentSold}
              onAddToCart={onAddToCart}
            />
          );
        })}
      </div>
    </div>
  );
}

export default FlashSaleSection;
