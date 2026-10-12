"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  Package,
  BadgePercent,
  Layers,
} from "lucide-react";
import {
  formatRupiah,
  parseRupiahInput,
  PRICE_PRESETS,
  STOCK_PRESETS,
  countActiveFilters,
  formatPriceRangeLabel,
  formatStockFilterLabel,
  PricePreset,
  StockPreset,
} from "../utils/tokopedia-helpers";

interface ProductFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedCategoryId?: string;
  onSelectCategoryId?: (categoryId?: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  minPrice?: number;
  maxPrice?: number;
  onPriceChange: (min?: number, max?: number) => void;
  minStock?: number;
  onStockChange: (stock?: number) => void;
  onResetFilters: () => void;
  categoryNameMap?: Record<string, string>;
  limit?: number;
  onLimitChange?: (limit: number) => void;
}

export function ProductFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedCategoryId,
  onSelectCategoryId,
  searchQuery,
  onSearchChange,
  minPrice,
  maxPrice,
  onPriceChange,
  minStock,
  onStockChange,
  onResetFilters,
  categoryNameMap = {},
  limit = 60,
  onLimitChange,
}: ProductFilterProps) {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Local draft states for filter panel before applying
  const [draftMinPrice, setDraftMinPrice] = useState<string>(
    minPrice && minPrice > 0 ? String(minPrice) : ""
  );
  const [draftMaxPrice, setDraftMaxPrice] = useState<string>(
    maxPrice && maxPrice > 0 ? String(maxPrice) : ""
  );
  const [draftMinStock, setDraftMinStock] = useState<string>(
    minStock && minStock > 0 ? String(minStock) : ""
  );

  // Sync draft states when external props change
  useEffect(() => {
    setDraftMinPrice(minPrice && minPrice > 0 ? String(minPrice) : "");
  }, [minPrice]);

  useEffect(() => {
    setDraftMaxPrice(maxPrice && maxPrice > 0 ? String(maxPrice) : "");
  }, [maxPrice]);

  useEffect(() => {
    setDraftMinStock(minStock && minStock > 0 ? String(minStock) : "");
  }, [minStock]);

  const activeFilterCount = countActiveFilters({
    categoryId: selectedCategoryId,
    category: selectedCategory,
    minPrice,
    maxPrice,
    minStock,
  });

  const getCategoryLabel = (cat: string) => {
    if (cat === "All") return "Untuk Anda";
    if (cat === "Electronics") return "Elektronik";
    if (cat === "Apparel") return "Apparel";
    if (cat === "Accessories") return "Aksesoris";
    return cat;
  };

  const handleApplyFilters = () => {
    const minVal = parseRupiahInput(draftMinPrice);
    const maxVal = parseRupiahInput(draftMaxPrice);
    const stockVal = parseInt(draftMinStock, 10);

    onPriceChange(minVal > 0 ? minVal : undefined, maxVal > 0 ? maxVal : undefined);
    onStockChange(!isNaN(stockVal) && stockVal > 0 ? stockVal : undefined);
    setIsFilterPanelOpen(false);
  };

  const handleSelectPricePreset = (preset: PricePreset) => {
    setDraftMinPrice(preset.min && preset.min > 0 ? String(preset.min) : "");
    setDraftMaxPrice(preset.max && preset.max > 0 ? String(preset.max) : "");
  };

  const handleSelectStockPreset = (preset: StockPreset) => {
    setDraftMinStock(String(preset.min));
  };

  const handleResetDraftsAndApply = () => {
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setDraftMinStock("");
    onResetFilters();
    setIsFilterPanelOpen(false);
  };

  const activePriceLabel = formatPriceRangeLabel(minPrice, maxPrice);
  const activeStockLabel = formatStockFilterLabel(minStock);

  const getDisplayCategoryName = () => {
    if (selectedCategoryId && categoryNameMap[selectedCategoryId]) {
      return categoryNameMap[selectedCategoryId];
    }
    if (selectedCategory && selectedCategory !== "All") {
      return getCategoryLabel(selectedCategory);
    }
    return null;
  };

  const activeCategoryName = getDisplayCategoryName();

  return (
    <div className="w-full space-y-3">
      {/* 1. STICKY TOP TAB & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Category Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-1">
          {categories.map((cat) => {
            const isSelected =
              !selectedCategoryId &&
              selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => {
                  onSelectCategory(cat);
                  if (onSelectCategoryId) onSelectCategoryId(undefined);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                    : "bg-[#1A1D20] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80"
                }`}
              >
                {cat === "All" && <Layers className="w-3 h-3 text-emerald-300" />}
                <span>{getCategoryLabel(cat)}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Trigger Button & Search within Catalog */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Limit / Page Size Selector */}
          {onLimitChange && (
            <div className="flex items-center gap-1.5 bg-[#1A1D20] border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline uppercase tracking-wider">
                Batch:
              </span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-cyan-400 focus:outline-none cursor-pointer font-mono"
                title="Pilih jumlah produk per muat"
              >
                <option value={60} className="bg-slate-900 text-slate-200">60 / batch</option>
                <option value={120} className="bg-slate-900 text-slate-200">120 / batch</option>
                <option value={240} className="bg-slate-900 text-slate-200">240 / batch</option>
                <option value={480} className="bg-slate-900 text-slate-200">480 / batch</option>
                <option value={960} className="bg-slate-900 text-slate-200">960 / batch</option>
              </select>
            </div>
          )}

          {/* Advanced Filter Button */}
          <button
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
              isFilterPanelOpen || activeFilterCount > 0
                ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-900/30"
                : "bg-[#1A1D20] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {isFilterPanelOpen ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </button>

          {/* Search within Catalog */}
          <div className="relative flex items-center min-w-[200px] sm:min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari dalam katalog..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#1A1D20] border border-slate-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors leading-normal"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                aria-label="Hapus Pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. ACTIVE FILTER BADGES ROW */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
          <span className="text-[11px] text-slate-400 font-medium">Filter Aktif:</span>

          {/* Active Category Badge */}
          {activeCategoryName && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>Kategori: {activeCategoryName}</span>
              <button
                onClick={() => {
                  onSelectCategory("All");
                  if (onSelectCategoryId) onSelectCategoryId(undefined);
                }}
                className="hover:text-white transition-colors cursor-pointer ml-0.5"
                aria-label="Hapus Filter Kategori"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Active Price Badge */}
          {activePriceLabel && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
              <BadgePercent className="w-3 h-3 text-emerald-400" />
              <span>Harga: {activePriceLabel}</span>
              <button
                onClick={() => onPriceChange(undefined, undefined)}
                className="hover:text-white transition-colors cursor-pointer ml-0.5"
                aria-label="Hapus Filter Harga"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Active Stock Badge */}
          {activeStockLabel && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
              <Package className="w-3 h-3 text-emerald-400" />
              <span>{activeStockLabel}</span>
              <button
                onClick={() => onStockChange(undefined)}
                className="hover:text-white transition-colors cursor-pointer ml-0.5"
                aria-label="Hapus Filter Stok"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Reset All Button */}
          <button
            onClick={onResetFilters}
            className="text-[11px] text-slate-400 hover:text-rose-400 underline transition-colors cursor-pointer ml-1"
          >
            Hapus Semua
          </button>
        </div>
      )}

      {/* 3. EXPANDABLE ADVANCED FILTER PANEL (Price & Stock) */}
      {isFilterPanelOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#16191D] border border-slate-800 shadow-xl space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                Filter Detail Produk (Range Harga & Stok)
              </h3>
            </div>
            <button
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section 1: Rentang Harga */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span>Rentang Harga Produk</span>
                <span className="text-[10px] text-slate-400 font-normal">Mata uang IDR (Rp)</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Min Price Input */}
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-slate-400">Harga Minimum</span>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs text-slate-500 font-semibold pointer-events-none">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={50000}
                      placeholder="0"
                      value={draftMinPrice}
                      onChange={(e) => setDraftMinPrice(e.target.value)}
                      className="w-full bg-[#1A1D20] border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Max Price Input */}
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-slate-400">Harga Maksimum</span>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs text-slate-500 font-semibold pointer-events-none">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={50000}
                      placeholder="Contoh: 5.000.000"
                      value={draftMaxPrice}
                      onChange={(e) => setDraftMaxPrice(e.target.value)}
                      className="w-full bg-[#1A1D20] border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Price Preset Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-400">Pilihan Cepat Harga:</span>
                <div className="flex flex-wrap gap-2">
                  {PRICE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectPricePreset(preset)}
                      className="px-2.5 py-1 rounded-lg bg-[#1C2025] hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Ketersediaan Stok */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span>Filter Stok Minimum</span>
                <span className="text-[10px] text-slate-400 font-normal">Kuantitas inventori</span>
              </label>

              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-400">
                  Minimal Stok Tersedia di Gudang
                </span>
                <div className="relative flex items-center">
                  <Package className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                  <input
                    type="number"
                    min={0}
                    step={10}
                    placeholder="Contoh: 100"
                    value={draftMinStock}
                    onChange={(e) => setDraftMinStock(e.target.value)}
                    className="w-full bg-[#1A1D20] border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Stock Preset Chips (termasuk Stok > 100 sesuai request) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-400">Pilihan Cepat Stok:</span>
                <div className="flex flex-wrap gap-2">
                  {STOCK_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectStockPreset(preset)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                        draftMinStock === String(preset.min)
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                          : "bg-[#1C2025] hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-emerald-300"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Terapkan & Reset */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetDraftsAndApply}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-600 bg-transparent text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Terapkan Filter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
