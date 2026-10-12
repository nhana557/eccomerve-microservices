"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { CartItem } from "../types";
import { formatRupiah } from "../../products/components/ProductCard";
import {
  getProductImage,
  DEFAULT_PRODUCT_FALLBACK,
} from "../../products/utils/tokopedia-helpers";
import { Plus, Minus, Trash2 } from "lucide-react";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onUpdateQty, onRemove }: CartItemRowProps) {
  const imageUrl = getProductImage(item.product);
  const [imgSrc, setImgSrc] = useState(imageUrl);

  useEffect(() => {
    setImgSrc(imageUrl);
  }, [imageUrl]);

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1D20] border border-slate-800 hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {/* Real Product Thumbnail Image */}
        <div className="relative w-12 h-12 rounded-lg bg-[#121417] border border-slate-800 overflow-hidden shrink-0">
          <Image
            src={imgSrc}
            alt={item.product.name}
            fill
            sizes="48px"
            onError={() => setImgSrc(DEFAULT_PRODUCT_FALLBACK)}
            className="object-cover object-center"
            unoptimized={typeof imgSrc === "string" && imgSrc.startsWith("data:")}
          />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-slate-100 truncate">{item.product.name}</h4>
          <div className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5">
            {formatRupiah(item.product.price)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => onUpdateQty(item.quantity - 1)}
            aria-label="Kurangi Jumlah"
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-mono text-xs w-6 text-center text-slate-200 font-bold">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQty(item.quantity + 1)}
            aria-label="Tambah Jumlah"
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={onRemove}
          aria-label="Hapus Item"
          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
