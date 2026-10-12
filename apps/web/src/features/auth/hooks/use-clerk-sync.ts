"use client";

import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { apiRequest } from "../../../lib/api-client";

export interface ClerkSyncPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export function buildClerkSyncPayload(user: any): ClerkSyncPayload {
  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Pengguna";
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  return {
    id: user?.id || "",
    name,
    email,
    role: "customer",
    avatar_url: user?.imageUrl,
  };
}

export function useClerkSync() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!isSignedIn || !user) return;

    const syncKey = `tstore_clerk_synced_${user.id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(syncKey)) {
      return;
    }

    const syncWithBackend = async () => {
      try {
        const token = await getToken();
        const payload = buildClerkSyncPayload(user);
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        await apiRequest("/api/v1/auth/sync", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        sessionStorage.setItem(syncKey, "true");
      } catch {
        // Non-blocking background sync failure
      }
    };

    syncWithBackend();
  }, [isSignedIn, user, getToken]);
}
