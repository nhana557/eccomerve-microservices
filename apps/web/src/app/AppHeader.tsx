"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { useCart } from "@/features/cart/context/CartContext";

export function AppHeader() {
  const pathname = usePathname();
  const { totalItems, setIsDrawerOpen } = useCart();

  // Sembunyikan navbar belanja saat berada di halaman dashboard
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return <Navbar cartItemCount={totalItems} onOpenCart={() => setIsDrawerOpen(true)} />;
}
