'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { CartItemRow } from '../components/CartItemRow';
import { formatRupiah } from '../../products/components/ProductCard';
import { X, ShoppingBag, ArrowRight, Tag, Check, Loader2 } from 'lucide-react';

export interface CartDrawerProps {
  onCheckout?: () => void;
}

const QUICK_PROMOS = [
  { code: 'TOKOPEDIA20', label: 'Diskon 20%' },
  { code: 'HEMAT50', label: 'Hemat 50rb' },
  { code: 'BEBASONGKIR', label: 'Bebas Ongkir' },
];

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const router = useRouter();
  const {
    items,
    isDrawerOpen,
    setIsDrawerOpen,
    updateQuantity,
    removeFromCart,
    totalPrice,
    totalItems,
    appliedPromo,
    discountAmount,
    finalPrice,
    applyPromo,
    removePromo,
  } = useCart();

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  if (!isDrawerOpen) return null;

  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || promoCodeInput).trim().toUpperCase();
    if (!code) return;
    setIsValidatingPromo(true);
    try {
      const res = await applyPromo(code);
      if (res.success) {
        setPromoCodeInput('');
      }
    } finally {
      setIsValidatingPromo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#121417] border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-slate-100 text-base">Keranjang Belanja</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                {totalItems} item
              </span>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ShoppingBag className="w-12 h-12 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-400">Keranjang masih kosong</p>
                <p className="text-xs text-slate-500 mt-1">Pilih produk favorit Anda di katalog.</p>
              </div>
            ) : (
              items.map((item) => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  onUpdateQty={(q) => updateQuantity(item.product.id, q)}
                  onRemove={() => removeFromCart(item.product.id)}
                />
              ))
            )}
          </div>

          {/* Footer & Promo Section */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-800 bg-[#16191D] space-y-4">
              {/* Promo Voucher Input Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    Makin Hemat Pakai Promo
                  </span>
                </div>

                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-400 font-mono block">
                          {appliedPromo.code}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {appliedPromo.title} (-{formatRupiah(appliedPromo.discountAmount)})
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={removePromo}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                      title="Hapus voucher"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Kode kupon: TOKOPEDIA20"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPromo();
                          }
                        }}
                        className="flex-1 bg-[#1A1D20] border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
                      />
                      <button
                        type="button"
                        disabled={isValidatingPromo || !promoCodeInput.trim()}
                        onClick={() => handleApplyPromo()}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                      >
                        {isValidatingPromo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Terapkan'
                        )}
                      </button>
                    </div>

                    {/* Quick Promo Pills */}
                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                      {QUICK_PROMOS.map((qp) => (
                        <button
                          key={qp.code}
                          type="button"
                          onClick={() => handleApplyPromo(qp.code)}
                          className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-950/40 hover:border-emerald-500/40 border border-slate-700/60 text-[10px] text-slate-300 hover:text-emerald-300 font-medium whitespace-nowrap transition-all flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5 text-emerald-400" />
                          {qp.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Harga ({totalItems} barang)</span>
                  <span className="font-mono text-slate-200">{formatRupiah(totalPrice)}</span>
                </div>

                {appliedPromo && discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Total Diskon Barang</span>
                    <span className="font-mono font-semibold">-{formatRupiah(discountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-sm font-bold text-slate-100">
                  <span className="text-xs uppercase tracking-wider text-slate-400">
                    Total Tagihan
                  </span>
                  <span className="font-mono text-base text-emerald-400">
                    {formatRupiah(finalPrice)}
                  </span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    if (onCheckout) {
                      onCheckout();
                    } else {
                      router.push('/checkout');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push('/cart');
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs text-center transition-colors cursor-pointer"
                >
                  Lihat Keranjang Penuh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CartDrawer;
