"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Zap, Gift } from "lucide-react";

interface PromoSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  icon: React.ElementType;
  gradient: string;
  accentColor: string;
  heroImage: string;
}

const SLIDES: PromoSlide[] = [
  {
    id: "slide-1",
    badge: "WAKTU INDONESIA BELANJA",
    title: "Mega Elektronik Sale",
    subtitle: "Cashback hingga Rp500.000 + Cicilan 0% dengan GoPayLater & Kartu Kredit pilihan.",
    ctaText: "Klaim Voucher Sekarang",
    icon: Zap,
    gradient: "from-[#0c1c14] via-[#132219] to-[#121417]",
    accentColor: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    heroImage: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "slide-2",
    badge: "BEBAS ONGKIR EXTRA",
    title: "Kirim Cepat Tanpa Batas",
    subtitle: "Gratis ongkir ke seluruh Indonesia tanpa batas kuota untuk semua produk bertanda Official Store.",
    ctaText: "Belanja Sekarang",
    icon: Gift,
    gradient: "from-[#0a1b1d] via-[#102426] to-[#121417]",
    accentColor: "text-teal-400 border-teal-500/40 bg-teal-500/10",
    heroImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "slide-3",
    badge: "KEJAR DISKON SPESIAL",
    title: "Diskon Kilat Hingga 75%",
    subtitle: "Dapatkan aksesoris komputer, headphone wireless, dan mechanical keyboard dengan harga terendah.",
    ctaText: "Lihat Produk Diskon",
    icon: Zap,
    gradient: "from-[#20170a] via-[#241c10] to-[#121417]",
    accentColor: "text-amber-400 border-amber-500/40 bg-amber-500/10",
    heroImage: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
  },
];

export function PromoBannerCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto slide every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const active = SLIDES[currentSlide];
  const Icon = active.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#1A1D20] shadow-xl group">
      {/* Slide Container */}
      <div
        className={`relative min-h-[220px] sm:min-h-[260px] flex items-center justify-between bg-gradient-to-r ${active.gradient} transition-all duration-500 overflow-hidden`}
      >
        {/* Left: Text & CTA Content */}
        <div className="relative z-10 p-6 sm:p-10 max-w-xl space-y-3 flex-1">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border backdrop-blur-md ${active.accentColor}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{active.badge}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
            {active.title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
            {active.subtitle}
          </p>

          <div className="pt-2 flex items-center gap-4">
            <button className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 shadow-md shadow-emerald-500/20">
              {active.ctaText}
            </button>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              *S&K berlaku
            </span>
          </div>
        </div>

        {/* Right: Real Hero Product Photography Container */}
        <div className="hidden md:block relative w-[320px] lg:w-[420px] h-[260px] shrink-0 overflow-hidden">
          <Image
            src={active.heroImage}
            alt={active.title}
            fill
            sizes="(max-width: 1024px) 320px, 420px"
            className="object-cover object-center"
            priority
          />
          {/* Smooth gradient blend into left dark content */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#121417] via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121417]/80 via-transparent to-black/30 pointer-events-none" />
        </div>
      </div>

      {/* Prev / Next Nav Buttons */}
      <button
        onClick={prevSlide}
        aria-label="Previous Slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 flex items-center justify-center border border-slate-700/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next Slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 flex items-center justify-center border border-slate-700/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentSlide
                ? "w-6 bg-emerald-400 shadow-sm shadow-emerald-400"
                : "w-2 bg-slate-600 hover:bg-slate-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
