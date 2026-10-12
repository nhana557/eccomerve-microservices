"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Product } from "../types";
import { ProductCard } from "../components/ProductCard";
import { PackageOpen } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  onAddToCart: (product: Product) => void;
  onRowCountChange?: (count: number) => void;
}

// Approximate height of a product card including row gap (~380px)
const CARD_ROW_HEIGHT = 380;
// Target window size of rows rendered in DOM (13 baris DOM)
const TARGET_DOM_ROWS = 13;

function getColumnCount(width: number): number {
  if (width >= 1280) return 6; // xl:grid-cols-6
  if (width >= 1024) return 5; // lg:grid-cols-5
  if (width >= 768) return 4;  // md:grid-cols-4
  if (width >= 640) return 3;  // sm:grid-cols-3
  return 2;                    // grid-cols-2
}

export function ProductGrid({
  products,
  isLoading,
  onAddToCart,
  onRowCountChange,
}: ProductGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<number>(6);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(800);

  useEffect(() => {
    const updateDimensions = () => {
      const width = typeof window !== "undefined" ? window.innerWidth : 1280;
      setColumns(getColumnCount(width));
      setViewportHeight(typeof window !== "undefined" ? window.innerHeight : 800);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions, { passive: true });
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Relative scroll within the catalog container
      const relativeTop = Math.max(0, -rect.top);
      setScrollTop(relativeTop);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const totalItems = products.length;
  const isVirtual = totalItems > 30;

  const { topSpacerHeight, bottomSpacerHeight, visibleProducts, renderedRowsCount } = useMemo(() => {
    const totalRows = Math.ceil(totalItems / columns);

    if (!isVirtual || totalRows <= TARGET_DOM_ROWS) {
      return {
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        visibleProducts: products,
        renderedRowsCount: totalRows,
      };
    }

    // Calculate current scroll row with 4-5 rows buffer above
    const currentRow = Math.floor(scrollTop / CARD_ROW_HEIGHT);
    const start = Math.max(0, Math.min(currentRow - 4, totalRows - TARGET_DOM_ROWS));
    const end = Math.min(totalRows, start + TARGET_DOM_ROWS);

    const topSpacer = start * CARD_ROW_HEIGHT;
    const bottomSpacer = Math.max(0, (totalRows - end) * CARD_ROW_HEIGHT);
    const sliceStart = start * columns;
    const sliceEnd = end * columns;
    const slice = products.slice(sliceStart, sliceEnd);
    const rowCount = end - start;

    return {
      topSpacerHeight: topSpacer,
      bottomSpacerHeight: bottomSpacer,
      visibleProducts: slice,
      renderedRowsCount: rowCount,
    };
  }, [products, isVirtual, totalItems, columns, scrollTop, viewportHeight]);

  useEffect(() => {
    if (onRowCountChange) {
      onRowCountChange(renderedRowsCount);
    }
  }, [renderedRowsCount, onRowCountChange]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div
            key={i}
            className="bg-[#1A1D20] border border-slate-800 rounded-xl p-3 h-72 animate-pulse flex flex-col justify-between"
          >
            <div>
              <div className="w-full aspect-square bg-slate-800/80 rounded-lg mb-3" />
              <div className="w-3/4 h-3 bg-slate-800 rounded mb-2" />
              <div className="w-1/2 h-2.5 bg-slate-800/70 rounded mb-2" />
              <div className="w-2/3 h-4 bg-slate-700/60 rounded" />
            </div>
            <div className="pt-2 border-t border-slate-800/60">
              <div className="w-full h-7 bg-slate-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-[#1A1D20] border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-500">
          <PackageOpen className="w-8 h-8" />
        </div>
        <h4 className="text-slate-200 font-semibold text-sm sm:text-base">
          Produk tidak ditemukan
        </h4>
        <p className="text-slate-400 text-xs mt-1 max-w-sm">
          Coba gunakan kata kunci lain atau pilih kategori lain di atas untuk melihat katalog produk Tokopedia Dark.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 relative will-change-transform"
    >
      {/* Top Virtual Spacer */}
      {topSpacerHeight > 0 && (
        <div
          style={{ height: `${topSpacerHeight}px` }}
          className="col-span-full w-full pointer-events-none transition-none"
          aria-hidden="true"
        />
      )}

      {/* Rendered Windowed Product Cards (Up to 13 baris DOM) */}
      {visibleProducts.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
      ))}

      {/* Bottom Virtual Spacer */}
      {bottomSpacerHeight > 0 && (
        <div
          style={{ height: `${bottomSpacerHeight}px` }}
          className="col-span-full w-full pointer-events-none transition-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
