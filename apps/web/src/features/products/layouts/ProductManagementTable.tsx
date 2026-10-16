"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Product, CreateProductInput } from "../types";
import { formatRupiah } from "../components/ProductCard";
import { ProductModal } from "../components/ProductModal";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw,
  Zap,
  Loader2,
  Check,
  Cpu,
  HardDrive,
  Clock,
} from "lucide-react";
import {
  filterAndSortProducts,
  SortDirection,
  getResponseTimeBadgeClass,
  formatResponseTime,
  formatDataSizeMB,
  formatCountdownString,
} from "@/lib/table-helpers";
import { useCategories } from "../../categories/hooks/use-categories";
import { CacheTierLabel } from "@/lib/api-client";

export const OFFICIAL_PARENT_CATEGORIES = [
  "Elektronik",
  "Komputer & Laptop",
  "Handphone & Tablet",
  "Fashion Pria",
  "Fashion Wanita",
  "Otomotif",
  "Rumah Tangga",
  "Hobi & Koleksi",
  "Kesehatan & Kecantikan",
  "Makanan & Minuman",
];

export const PRESET_LIMITS = [20, 60, 120, 500, 1000, 5000, 10000, 50000, 100000];
const ROW_HEIGHT = 58;
const OVERSCAN = 10;

interface ProductManagementTableProps {
  products: Product[];
  totalCount?: number;
  limit?: number;
  responseTime?: number | null;
  responseSize?: number | null;
  isLoading?: boolean;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  engineMethod?: string;
  onEngineMethodChange?: (method: string) => void;
  sortField?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (field: string, direction: SortDirection) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  categories?: { id: string; name: string }[];
  onLimitChange?: (limit: number) => void;
  cacheRemainingSeconds?: number | null;
  isFromCache?: boolean;
  cacheTier?: CacheTierLabel;
  onCreateProduct: (data: CreateProductInput) => Promise<any>;
  onUpdateProduct: (id: string, data: Partial<CreateProductInput>) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
}

export function ProductManagementTable({
  products,
  totalCount,
  limit = 60,
  responseTime,
  responseSize,
  cacheRemainingSeconds,
  isFromCache,
  cacheTier,
  isLoading = false,
  selectedCategory: selectedCategoryProp,
  onCategoryChange,
  engineMethod = "btree_index",
  onEngineMethodChange,
  sortField: sortFieldProp,
  sortDirection: sortDirectionProp,
  onSortChange,
  searchQuery: searchQueryProp,
  onSearchChange,
  categories: categoriesProp,
  onLimitChange,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ProductManagementTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Search state
  const [internalSearch, setInternalSearch] = useState(searchQueryProp || "");
  const activeSearch = searchQueryProp !== undefined ? searchQueryProp : internalSearch;
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    if (searchQueryProp !== undefined) {
      setInternalSearch(searchQueryProp);
      setIsDebouncing(false);
    }
  }, [searchQueryProp]);

  // Debounced search to parent onSearchChange (350ms delay)
  useEffect(() => {
    if (!onSearchChange) return;
    if (internalSearch === (searchQueryProp || "")) {
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const timer = setTimeout(() => {
      onSearchChange(internalSearch);
      setIsDebouncing(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [internalSearch, onSearchChange, searchQueryProp]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setIsDebouncing(false);
      if (onSearchChange && internalSearch !== searchQueryProp) {
        onSearchChange(internalSearch);
      }
    }
  };

  // Category state (controlled or uncontrolled)
  const [internalCategory, setInternalCategory] = useState("all");
  const activeCategory = selectedCategoryProp !== undefined ? selectedCategoryProp : internalCategory;

  const handleCategorySelect = (cat: string) => {
    if (selectedCategoryProp === undefined) {
      setInternalCategory(cat);
    }
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
  };

  // Stock Status Filter state (client-side)
  const [stockStatus, setStockStatus] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");

  // Sorting state (controlled or uncontrolled)
  const [internalSortField, setInternalSortField] = useState<string | null>("name");
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>("asc");
  const activeSortField = sortFieldProp !== undefined ? sortFieldProp : internalSortField;
  const activeSortDirection = sortDirectionProp !== undefined ? sortDirectionProp : internalSortDirection;

  const handleSort = (field: string) => {
    let nextDirection: SortDirection = "asc";
    if (activeSortField === field) {
      nextDirection = activeSortDirection === "asc" ? "desc" : "asc";
    }
    if (sortFieldProp === undefined) {
      setInternalSortField(field);
      setInternalSortDirection(nextDirection);
    }
    if (onSortChange) {
      onSortChange(field, nextDirection);
    }
  };

  // Limit input state (allows user to type custom limit up to 100,000 or select preset)
  const [inputLimit, setInputLimit] = useState<string>(String(limit));

  useEffect(() => {
    setInputLimit(String(limit));
  }, [limit]);

  const handleApplyLimit = (valStr?: string) => {
    const target = valStr !== undefined ? valStr : inputLimit;
    let num = parseInt(target, 10);
    if (isNaN(num) || num <= 0) {
      num = 60;
    } else if (num > 100000) {
      num = 100000;
    }
    setInputLimit(String(num));
    if (num !== limit && onLimitChange) {
      onLimitChange(num);
    }
  };

  // Debounced auto-apply limit while typing
  useEffect(() => {
    if (!onLimitChange) return;
    const num = parseInt(inputLimit, 10);
    if (!isNaN(num) && num >= 1 && num <= 100000 && num !== limit) {
      const timer = setTimeout(() => {
        onLimitChange(num);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [inputLimit, limit, onLimitChange]);

  // Available categories: combines official parent categories, API categories, and product categories
  const { categories: fetchedCategories } = useCategories();
  const availableCategories = useMemo(() => {
    const list: string[] = [...OFFICIAL_PARENT_CATEGORIES];
    const set = new Set<string>(list);

    if (categoriesProp && categoriesProp.length > 0) {
      categoriesProp.forEach((c) => {
        if (c.name && !set.has(c.name)) {
          set.add(c.name);
          list.push(c.name);
        }
      });
    }

    if (fetchedCategories && fetchedCategories.length > 0) {
      fetchedCategories.forEach((c) => {
        if (c.name && !set.has(c.name)) {
          set.add(c.name);
          list.push(c.name);
        }
      });
    }

    products.forEach((p) => {
      if (p.category && !set.has(p.category)) {
        set.add(p.category);
        list.push(p.category);
      }
    });

    return list;
  }, [categoriesProp, fetchedCategories, products]);

  const isFiltered =
    activeSearch !== "" ||
    (activeCategory !== "all" && activeCategory !== "All") ||
    stockStatus !== "all";

  const handleResetFilters = () => {
    setInternalSearch("");
    if (onSearchChange) onSearchChange("");
    if (onCategoryChange) onCategoryChange("all");
    setInternalCategory("all");
    setStockStatus("all");
    if (onSortChange) onSortChange("name", "asc");
    setInternalSortField("name");
    setInternalSortDirection("asc");
    setInputLimit("60");
    if (onLimitChange) onLimitChange(60);
  };

  const filteredAndSortedProducts = useMemo(() => {
    // If parent handles category and sort via server API
    if (onCategoryChange || onSortChange) {
      let result = products;
      // Handle local stock status filter if active
      if (stockStatus && stockStatus !== "all") {
        result = result.filter((p) => {
          if (stockStatus === "out_of_stock") return p.stock <= 0;
          if (stockStatus === "low_stock") return p.stock > 0 && p.stock <= 5;
          if (stockStatus === "in_stock") return p.stock > 5;
          return true;
        });
      }
      return result;
    }

    // Fallback client-side filtering and sorting
    return filterAndSortProducts(products, {
      searchQuery: activeSearch,
      category: activeCategory,
      stockStatus,
      sortField: activeSortField,
      sortDirection: activeSortDirection,
    });
  }, [
    products,
    onCategoryChange,
    onSortChange,
    stockStatus,
    activeSearch,
    activeCategory,
    activeSortField,
    activeSortDirection,
  ]);

  // Virtual Scrolling Windowing state & calculations
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    setContainerHeight(el.clientHeight || 600);

    const handleResize = () => {
      if (el) setContainerHeight(el.clientHeight || 600);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset scroll to top whenever filter, sort, or limit changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [activeCategory, activeSortField, activeSortDirection, limit]);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalItems = filteredAndSortedProducts.length;
  const isVirtual = totalItems > 60;

  const { startIndex, topSpacerHeight, bottomSpacerHeight, visibleProducts } = useMemo(() => {
    if (!isVirtual) {
      return {
        startIndex: 0,
        endIndex: totalItems,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        visibleProducts: filteredAndSortedProducts,
      };
    }

    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(totalItems, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
    const topSpacer = start * ROW_HEIGHT;
    const bottomSpacer = (totalItems - end) * ROW_HEIGHT;
    const slice = filteredAndSortedProducts.slice(start, end);

    return {
      startIndex: start,
      endIndex: end,
      topSpacerHeight: topSpacer,
      bottomSpacerHeight: bottomSpacer,
      visibleProducts: slice,
    };
  }, [filteredAndSortedProducts, isVirtual, totalItems, scrollTop, containerHeight]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: CreateProductInput) => {
    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, data);
    } else {
      await onCreateProduct(data);
    }
  };

  const renderSortIndicator = (field: string) => {
    if (activeSortField === field) {
      return activeSortDirection === "asc" ? (
        <ArrowUp className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" />
      );
    }
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 inline shrink-0 transition-colors" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Katalog Produk</h3>
          <p className="text-xs text-slate-400">
            Kelola inventaris, harga, dan ketersediaan barang di platform.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Response Time API Badge (Langsung menampilkan state loading di dalam card tanpa tombol/badge terpisah) */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs font-semibold border shadow-sm transition-all ${
              isLoading
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                : responseTime !== undefined && responseTime !== null
                ? getResponseTimeBadgeClass(responseTime)
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
            title={
              isLoading
                ? "Sedang mengukur response time dan mengambil data dari backend..."
                : isFromCache
                ? `Mengambil data dari Cache ${cacheTier || "T4"}`
                : "Direct live query langsung ke database PostgreSQL (Bypass Cache)"
            }
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-current" />
            )}
            <span className="text-slate-400 font-normal">Response Time API:</span>
            <span className={`font-bold ${isLoading ? "text-cyan-300 animate-pulse" : ""}`}>
              {isLoading
                ? "Memuat..."
                : responseTime !== undefined && responseTime !== null
                ? formatResponseTime(responseTime)
                : "Mengukur..."}
            </span>
            <span className="text-[10px] opacity-75 border-l border-current/30 pl-1.5 ml-0.5 uppercase tracking-wide">
              {isFromCache
                ? `CACHE ${cacheTier || "T4"}`
                : `DIRECT • ${
                    engineMethod === "cqrs"
                      ? "CQRS"
                      : engineMethod === "in_memory_cache" || engineMethod === "cache"
                      ? "CACHE"
                      : engineMethod === "postgres_filter"
                      ? "PG Filter"
                      : "B-Tree"
                  }`}
            </span>
          </div>

          {/* Response Payload Size Badge */}
          {responseSize !== undefined && responseSize !== null && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm"
              title="Total ukuran payload data response yang diterima dari server"
            >
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formatDataSizeMB(responseSize)}</span>
            </div>
          )}

          {/* Add Product Button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Metrics */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
        {/* Tier 1: Wide Search Bar & Primary Actions */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Search Box - Expanded & Spacious */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari produk (mendukung koreksi typo otomatis e.g. separu -> sepatu)..."
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-14 py-2.5 bg-slate-950/90 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner"
            />
            {isDebouncing && (
              <span className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </span>
            )}
            {internalSearch && (
              <button
                onClick={() => {
                  setInternalSearch("");
                  if (onSearchChange) onSearchChange("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* BE Processing Method Selector */}
          {onEngineMethodChange && (
            <div className="flex items-center bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs shrink-0 transition-colors">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 mr-2 shrink-0" />
              <span className="text-[11px] font-mono text-slate-400 select-none mr-2 shrink-0">
                Metode BE:
              </span>
              <select
                value={engineMethod}
                onChange={(e) => onEngineMethodChange(e.target.value)}
                className="bg-transparent text-cyan-300 font-semibold font-mono text-xs focus:outline-none cursor-pointer"
                title="Pilih metode pengolahan data backend untuk membandingkan kecepatan response time"
              >
                <option value="btree_index" className="bg-slate-900 text-cyan-300">
                  ⚡ B-Tree + GIN Index (12-45ms)
                </option>
                <option value="cqrs" className="bg-slate-900 text-emerald-300">
                  🚀 Pola CQRS (1-3ms)
                </option>
                <option value="in_memory_cache" className="bg-slate-900 text-indigo-300">
                  💾 In-Memory Cache (&lt;1ms)
                </option>
                <option value="postgres_filter" className="bg-slate-900 text-amber-300">
                  🐢 PostgreSQL Filter (~800ms - 2s)
                </option>
              </select>
            </div>
          )}

          {/* Reset Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
              title="Reset semua filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Tier 2: Filters (Category, Limit, Stock) & Sort Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Dropdown */}
            <div className="w-48 sm:w-56 shrink-0">
              <select
                value={activeCategory}
                onChange={(e) => handleCategorySelect(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                title="Filter kategori (hit server API langsung)"
              >
                <option value="all">Semua Kategori ({availableCategories.length})</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Limit Input & Preset Selector (Supports up to 100,000 SKU) */}
            {onLimitChange && (
              <div className="shrink-0 flex items-center">
                <div
                  className={`flex items-center bg-slate-950/80 border rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                    inputLimit !== String(limit)
                      ? "border-cyan-500/80 ring-1 ring-cyan-500/30"
                      : "border-slate-800 focus-within:border-cyan-500"
                  }`}
                  title="Ketik jumlah limit (1 - 100.000) lalu tekan Enter atau pilih preset"
                >
                  <span className="text-[11px] font-mono text-slate-400 select-none mr-1.5 shrink-0">
                    Limit:
                  </span>
                  <input
                    list="table-limit-presets"
                    type="number"
                    min={1}
                    max={100000}
                    value={inputLimit}
                    onChange={(e) => setInputLimit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyLimit();
                      }
                    }}
                    onBlur={() => handleApplyLimit()}
                    className="w-16 sm:w-20 bg-transparent text-cyan-300 font-mono font-semibold text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center"
                    placeholder="60"
                  />
                  <datalist id="table-limit-presets">
                    {PRESET_LIMITS.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>

                  {inputLimit !== String(limit) ? (
                    <button
                      onClick={() => handleApplyLimit()}
                      className="ml-1 p-0.5 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      title="Terapkan limit sekarang"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <select
                      aria-label="Preset limit cepat"
                      value={PRESET_LIMITS.includes(limit) ? limit : ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val) {
                          setInputLimit(String(val));
                          handleApplyLimit(String(val));
                        }
                      }}
                      className="w-4 bg-transparent text-slate-500 hover:text-cyan-400 border-none p-0 text-[10px] cursor-pointer focus:outline-none ml-1"
                      title="Pilih preset limit"
                    >
                      <option value="" disabled hidden>
                        ▾
                      </option>
                      {PRESET_LIMITS.map((p) => (
                        <option key={p} value={p} className="bg-slate-900 text-slate-200">
                          {p >= 1000 ? `${p / 1000}k` : p}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Stock Status Filter */}
            <div className="w-40 sm:w-44 shrink-0">
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="all">Semua Status Stok</option>
                <option value="in_stock">Stok Aman (&gt; 5)</option>
                <option value="low_stock">Stok Rendah (1 - 5)</option>
                <option value="out_of_stock">Stok Habis (0)</option>
              </select>
            </div>
          </div>

          {/* Active Sort Indicator */}
          {activeSortField && (
            <div className="text-[11px] font-mono text-slate-400 shrink-0">
              Urut berdasarkan: <span className="text-slate-200 font-semibold capitalize">{activeSortField}</span> (
              {activeSortDirection === "asc" ? "A-Z / Terendah" : "Z-A / Tertinggi"})
            </div>
          )}
        </div>

        {/* Tier 3: Clean Metadata & Counter Bar (Between: Kiri dan Kanan, Single Row) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/50">
          {/* Sisi Kiri: Counter Data */}
          <div className="flex items-center gap-2 shrink min-w-0">
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 inline shrink-0" />}
            <span className="truncate">
              Menampilkan{" "}
              <span className="text-cyan-400 font-semibold">
                {filteredAndSortedProducts.length.toLocaleString("id-ID")}
              </span>{" "}
              dari{" "}
              <span className="text-slate-200 font-semibold">
                {totalCount && totalCount > products.length
                  ? totalCount.toLocaleString("id-ID")
                  : products.length.toLocaleString("id-ID")}
              </span>{" "}
              total produk {totalCount && totalCount > products.length ? `(limit ${limit.toLocaleString("id-ID")})` : ""}
            </span>
          </div>

          {/* Sisi Kanan: Badges Berjejer Rapi Satu Baris Tanpa Wrap */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap justify-end">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-slate-800/90 border border-slate-700/60 shadow-sm shrink-0 whitespace-nowrap">
              <span className="text-slate-400">Metode:</span>
              <strong
                className={
                  engineMethod === "cqrs"
                    ? "text-emerald-400 font-bold"
                    : engineMethod === "in_memory_cache" || engineMethod === "cache"
                    ? "text-indigo-400 font-bold"
                    : engineMethod === "postgres_filter"
                    ? "text-amber-400 font-bold"
                    : "text-cyan-400 font-bold"
                }
              >
                {engineMethod === "cqrs"
                  ? "CQRS"
                  : engineMethod === "in_memory_cache" || engineMethod === "cache"
                  ? "In-Memory"
                  : engineMethod === "postgres_filter"
                  ? "PG Filter"
                  : "B-Tree"}
              </strong>
            </span>

            {responseSize !== undefined && responseSize !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-semibold bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 shadow-sm shrink-0 whitespace-nowrap">
                <HardDrive className="w-3 h-3 text-cyan-400" />
                <span>{formatDataSizeMB(responseSize)}</span>
              </span>
            )}

            {isVirtual && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-[10px] text-cyan-300 font-mono shadow-sm shrink-0 whitespace-nowrap">
                <span>⚡ Virtual Scroll ({visibleProducts.length} baris DOM)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table Container with Virtual Scroll */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div
          ref={tableContainerRef}
          onScroll={handleTableScroll}
          className={`overflow-x-auto max-h-[580px] xl:max-h-[640px] overflow-y-auto transition-opacity duration-200 will-change-scroll ${
            isLoading ? "opacity-70" : "opacity-100"
          }`}
        >
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 shadow-sm">
              <tr className="bg-slate-950/90 text-[11px] font-mono uppercase text-slate-400 select-none">
                <th className="py-3 px-3 w-14 text-center">#</th>
                <th
                  onClick={() => handleSort("name")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors w-[38%]"
                  title="Urutkan berdasarkan Nama Produk"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Produk</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("category")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors w-[18%]"
                  title="Urutkan berdasarkan Kategori"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kategori</span>
                    {renderSortIndicator("category")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("price")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors w-[18%]"
                  title="Urutkan berdasarkan Harga"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Harga</span>
                    {renderSortIndicator("price")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("stock")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 group transition-colors w-[14%]"
                  title="Urutkan berdasarkan Stok"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Stok</span>
                    {renderSortIndicator("stock")}
                  </div>
                </th>
                <th className="py-3 px-4 text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredAndSortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p>
                        {isLoading
                          ? "Memuat data dari database..."
                          : products.length === 0
                          ? "Belum ada produk di database."
                          : "Tidak ada produk yang cocok dengan pencarian atau filter yang dipilih."}
                      </p>
                      {isFiltered && !isLoading && (
                        <button
                          onClick={handleResetFilters}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline"
                        >
                          Reset semua filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {/* Top Virtual Spacer */}
                  {topSpacerHeight > 0 && (
                    <tr style={{ height: `${topSpacerHeight}px` }} aria-hidden="true">
                      <td colSpan={6} className="p-0 border-0" />
                    </tr>
                  )}

                  {/* Visible Windowed Products */}
                  {visibleProducts.map((p, idx) => {
                    const actualIndex = startIndex + idx;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-800/30 transition-colors h-[58px]"
                      >
                        {/* Sequence Number (#) */}
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                          {actualIndex + 1}
                        </td>

                        {/* Product Name & ID */}
                        <td className="py-3 px-4 font-medium text-slate-200">
                          <div className="font-semibold text-slate-100 truncate max-w-sm" title={p.name}>
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            ID: {p.id}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700/60 font-mono text-[10px] inline-block truncate max-w-[140px]">
                            {p.category || "Uncategorized"}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                          {formatRupiah(p.price)}
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono text-xs px-2.5 py-1 rounded-md font-medium inline-block ${
                              p.stock <= 0
                                ? "bg-rose-950/80 text-rose-300 border border-rose-800/40"
                                : p.stock <= 5
                                ? "bg-amber-950/80 text-amber-300 border border-amber-800/40"
                                : "bg-slate-800/60 text-slate-300 border border-slate-700/40"
                            }`}
                          >
                            {p.stock} unit
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Produk"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus ${p.name}?`)) {
                                  onDeleteProduct(p.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Bottom Virtual Spacer */}
                  {bottomSpacerHeight > 0 && (
                    <tr style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true">
                      <td colSpan={6} className="p-0 border-0" />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingProduct || undefined}
      />
    </div>
  );
}
