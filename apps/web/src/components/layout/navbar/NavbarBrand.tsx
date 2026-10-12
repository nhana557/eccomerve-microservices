import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface NavbarBrandProps {
  className?: string;
}

export function NavbarBrand({ className }: NavbarBrandProps) {
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-2.5 group shrink-0', className)}
    >
      <div className="relative w-9 h-9 shrink-0 group-hover:scale-105 transition-transform">
        <Image
          src="/icon.svg"
          alt="T.S Logo"
          width={36}
          height={36}
          className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(14,165,233,0.35)]"
          priority
        />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight leading-none group-hover:text-cyan-300 transition-colors">
            T<span className="text-cyan-400">.</span>STORE
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            OFFICIAL
          </span>
        </div>
        <span className="text-[9px] font-mono text-cyan-400/90 block tracking-widest mt-0.5 font-medium uppercase">
          SYSTEMS COMMERCE
        </span>
      </div>
    </Link>
  );
}

export default NavbarBrand;
