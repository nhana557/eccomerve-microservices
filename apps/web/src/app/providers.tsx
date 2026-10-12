"use client";

import React, { useEffect } from "react";
import { ToastProvider } from "@/components/feedback/ToastContext";
import { ToastContainer } from "@/components/feedback/Toast";
import { EnvironmentProvider } from "@/components/layout/EnvironmentContext";
import { CartProvider } from "@/features/cart/context/CartContext";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { useClerkSync } from "@/features/auth/hooks/use-clerk-sync";
import { useAuth } from "@clerk/nextjs";
import { setAuthTokenGetter } from "@/lib/api-client";
import { isClerkEnabled } from "@/lib/clerk-config";

function ClerkSyncManager() {
  useClerkSync();
  const { getToken } = useAuth();

  useEffect(() => {
    if (typeof getToken === "function") {
      setAuthTokenGetter(getToken);
    }
  }, [getToken]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const clerkActive = isClerkEnabled();

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <EnvironmentProvider>
            {clerkActive && <ClerkSyncManager />}
            {children}
            <AuthModal />
            <ToastContainer />
          </EnvironmentProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
