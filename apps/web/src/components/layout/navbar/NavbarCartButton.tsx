import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavbarCartButtonProps {
  cartItemCount?: number;
  onOpenCart?: () => void;
  className?: string;
}

export function NavbarCartButton({
  cartItemCount = 0,
  onOpenCart,
  className,
}: NavbarCartButtonProps) {
  if (!onOpenCart) return null;

  return (
    <button
      type="button"
      onClick={onOpenCart}
      aria-label="Buka Keranjang Belanja"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-lg',
        'bg-[#1A1D20] hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200',
        'transition-all group relative active:scale-95 cursor-pointer',
        className,
      )}
    >
      <div className="relative">
        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
        {cartItemCount > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md">
            {cartItemCount}
          </span>
        )}
      </div>
      <span className="text-xs font-semibold hidden md:inline">Keranjang</span>
    </button>
  );
}

export default NavbarCartButton;
