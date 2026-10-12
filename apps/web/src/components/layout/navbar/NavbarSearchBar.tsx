import React from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TRENDING_KEYWORDS = [
  'Mechanical Keyboard',
  'Studio Headphone',
  'Desk Mat',
  'Developer Hoodie',
  'USB-C Dock',
  'Gaming Mouse',
];

export interface NavbarSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSelectKeyword: (keyword: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  className?: string;
}

export function NavbarSearchBar({
  value,
  onChange,
  onSubmit,
  onSelectKeyword,
  isFocused,
  onFocus,
  onBlur,
  className,
}: NavbarSearchBarProps) {
  return (
    <div className={cn('flex-1 max-w-2xl min-w-0 relative', className)}>
      <form onSubmit={onSubmit} className="relative flex items-center w-full">
        <input
          type="text"
          placeholder="Cari di T.STORE..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(
            'w-full bg-[#1A1D20] border border-slate-700/80 rounded-lg shadow-inner',
            'pl-3.5 pr-10 py-2',
            'text-xs sm:text-sm text-slate-100 placeholder-slate-500',
            'hover:border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all',
          )}
        />

        <button
          type="submit"
          aria-label="Cari Produk"
          className="absolute right-1.5 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Panel Saran Pencarian Populer (Muncul Saat Input Aktif) */}
      {isFocused && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            'absolute left-0 right-0 top-full mt-1.5 z-50',
            'bg-[#16191E] border border-slate-800 rounded-xl shadow-2xl p-3.5 space-y-3',
            'animate-in fade-in zoom-in-95 duration-150',
          )}
        >
          {value.trim() && (
            <button
              type="button"
              onClick={() => onSubmit({ preventDefault: () => {} } as any)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 text-xs text-emerald-300 font-medium transition-colors text-left cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Cari &quot;{value}&quot;</span>
            </button>
          )}

          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2 px-0.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Pencarian Populer
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TRENDING_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => onSelectKeyword(kw)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1A1D22] hover:bg-emerald-950/40 hover:border-emerald-500/40 border border-slate-700/60 text-xs text-slate-300 hover:text-emerald-300 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Search className="w-3 h-3 text-slate-500" />
                  <span>{kw}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NavbarSearchBar;
