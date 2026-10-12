import React from 'react';
import { ReceiptText, LogOut } from 'lucide-react';
import { formatUserDisplayName } from '@/features/auth/api/auth-api';
import { Show, UserButton } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

export interface NavbarAuthProps {
  isAuthenticated: boolean;
  user: any;
  clerkActive: boolean;
  onOpenOrders: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  className?: string;
}

export function NavbarAuth({
  isAuthenticated,
  user,
  clerkActive,
  onOpenOrders,
  onOpenAuthModal,
  onLogout,
  className,
}: NavbarAuthProps) {
  // 1. Kasus Login Akun Internal / Demo
  if (isAuthenticated && user) {
    return (
      <div className={cn('flex items-center gap-2 pl-1', className)}>
        {/* Tombol Pesanan Saya */}
        <button
          type="button"
          onClick={onOpenOrders}
          title="Lihat Pesanan Saya"
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A1D20] hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 text-xs font-medium transition-all cursor-pointer',
          )}
        >
          <ReceiptText className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Pesanan Saya</span>
        </button>

        {/* Avatar dan Nama Pengguna */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center shadow-sm">
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-xs text-slate-200 font-medium hidden lg:inline">
            {formatUserDisplayName(user.name)}
          </span>
        </div>

        {/* Tombol Logout */}
        <button
          type="button"
          onClick={onLogout}
          title="Keluar dari akun"
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 2. Kasus Clerk SSO Aktif
  if (clerkActive) {
    return (
      <div className={cn('flex items-center gap-2 pl-1', className)}>
        <Show when="signed-in">
          <div className="flex items-center gap-2 pl-1">
            <button
              type="button"
              onClick={onOpenOrders}
              title="Lihat Pesanan Saya"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A1D20] hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 text-xs font-medium transition-all cursor-pointer"
            >
              <ReceiptText className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Pesanan Saya</span>
            </button>

            <div className="flex items-center pl-1">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox:
                      'w-7 h-7 sm:w-8 sm:h-8 ring-2 ring-emerald-500/40 hover:ring-emerald-400 transition-all',
                  },
                }}
              />
            </div>
          </div>
        </Show>

        <Show when="signed-out">
          <div className="flex items-center gap-2 pl-1">
            <button
              type="button"
              onClick={() => onOpenAuthModal('login')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/10 transition-all cursor-pointer"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal('register')}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-all shadow-sm shadow-emerald-500/30 cursor-pointer"
            >
              Daftar
            </button>
          </div>
        </Show>
      </div>
    );
  }

  // 3. Kasus Belum Login (Guest)
  return (
    <div className={cn('flex items-center gap-2 pl-1', className)}>
      <button
        type="button"
        onClick={() => onOpenAuthModal('login')}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/10 transition-all cursor-pointer"
      >
        Masuk
      </button>

      <button
        type="button"
        onClick={() => onOpenAuthModal('register')}
        className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-all shadow-sm shadow-emerald-500/30 cursor-pointer"
      >
        Daftar
      </button>
    </div>
  );
}

export default NavbarAuth;
