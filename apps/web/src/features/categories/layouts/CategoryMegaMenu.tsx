'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Category } from '../types';
import { handleCategoryImageError } from '../utils/category-helpers';
import { ChevronRight, Grid, Layers, ArrowUpRight, X, ExternalLink } from 'lucide-react';

interface CategoryMegaMenuProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (category: { id?: string; name: string }) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryMegaMenu({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isOpen,
  onClose,
}: CategoryMegaMenuProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Default active category to the first one or the currently selected one
  useEffect(() => {
    if (categories && categories.length > 0) {
      if (selectedCategoryId) {
        const found = categories.find(
          (c) =>
            c.id === selectedCategoryId || c.children?.some((sub) => sub.id === selectedCategoryId),
        );
        if (found) {
          setActiveCategoryId(found.id);
          return;
        }
      }
      if (!activeCategoryId) {
        setActiveCategoryId(categories[0].id);
      }
    }
  }, [categories, selectedCategoryId, activeCategoryId]);

  // Handle outside click & escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];

  const handleCategoryClick = (cat: Category) => {
    onSelectCategory({ id: cat.id, name: cat.name });
    onClose();
  };

  const handleSubCategoryClick = (sub: Category) => {
    onSelectCategory({ id: sub.id, name: sub.name });
    onClose();
  };

  const handleSelectAll = () => {
    onSelectCategory({ id: undefined, name: 'All' });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute top-full left-0 mt-2 w-[760px] max-w-[95vw] bg-[#16191D] border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Top Banner Header */}
      <div className="bg-[#1C2025] px-5 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Kategori Belanja T.STORE</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                10 Kategori Resmi
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Jelajahi produk berkualitas dari 40+ sub-kategori resmi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-1 rounded transition-colors"
          >
            Lihat Semua Kategori
          </button>
          <button
            onClick={onClose}
            aria-label="Tutup Menu Kategori"
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two Column Layout: Main Categories on Left, Subcategories on Right */}
      <div className="flex h-[420px]">
        {/* Left Column: List of 10 Parent Categories */}
        <div className="w-64 border-r border-slate-800/80 overflow-y-auto py-2 bg-[#14161A] scrollbar-thin">
          <div className="px-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Kategori Utama
          </div>
          <div className="space-y-0.5 px-2">
            {categories.map((cat) => {
              const isActive = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  onMouseEnter={() => setActiveCategoryId(cat.id)}
                  onClick={() => handleCategoryClick(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all group ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 font-semibold border-l-2 border-emerald-500 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {cat.icon_url ? (
                      <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                        <Image
                          src={cat.icon_url}
                          alt={cat.name}
                          fill
                          sizes="20px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <Layers className="w-3 h-3" />
                      </div>
                    )}
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isActive
                        ? 'text-emerald-400 translate-x-0.5'
                        : 'text-slate-600 group-hover:text-slate-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Subcategories & Parent Fast Action */}
        <div className="flex-1 p-5 overflow-y-auto bg-[#16191D]">
          {activeCategory ? (
            <div className="space-y-4">
              {/* Category Header with Banner Action */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  {activeCategory.icon_url && (
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-700/80 shadow-md shrink-0">
                      <Image
                        src={activeCategory.icon_url}
                        alt={activeCategory.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{activeCategory.name}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Pilihan sub-kategori terbaik untuk {activeCategory.name.toLowerCase()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCategoryClick(activeCategory)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <span>Lihat Semua</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Subcategories Grid (Tokopedia Style) */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 mb-2.5">
                  Sub-Kategori Populer:
                </div>
                {activeCategory.children && activeCategory.children.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {activeCategory.children.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSubCategoryClick(sub)}
                        className="group flex items-center gap-3 p-2.5 rounded-xl bg-[#1C2025] hover:bg-slate-800/90 border border-slate-800/80 hover:border-emerald-500/40 text-left transition-all cursor-pointer shadow-sm hover:shadow"
                      >
                        {sub.icon_url ? (
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700/60 group-hover:scale-105 transition-transform">
                            <Image
                              src={sub.icon_url}
                              alt={sub.name}
                              fill
                              sizes="32px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                            <Grid className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 truncate transition-colors">
                            {sub.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>Buka katalog</span>
                            <ChevronRight className="w-2.5 h-2.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-6 text-center">
                    Tidak ada sub-kategori khusus. Klik "Lihat Semua" untuk melihat semua produk
                    dalam kategori ini.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">
              Pilih kategori di sebelah kiri untuk melihat sub-kategori
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="bg-[#121417] px-5 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Terhubung ke 1.000.000 Produk PostgreSQL Microservice</span>
        </div>
        <button
          onClick={handleSelectAll}
          className="text-slate-400 hover:text-emerald-400 transition-colors font-medium"
        >
          Reset Kategori (Semua)
        </button>
      </div>
    </div>
  );
}
