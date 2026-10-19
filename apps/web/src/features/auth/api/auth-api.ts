import { User, AuthResponse } from "../types";
import { getGatewayUrl, getAuthToken } from "@/lib/api-client";

export function formatUserDisplayName(name: string): string {
  if (!name || !name.trim()) return "Pengguna";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export function validateAuthForm(
  email: string,
  pass: string,
  isRegister: boolean,
  name?: string
): { isValid: boolean; error: string | null } {
  if (isRegister && (!name || !name.trim())) {
    return { isValid: false, error: "Nama lengkap wajib diisi" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return { isValid: false, error: "Format email tidak valid" };
  }
  if (!pass || pass.length < 6) {
    return { isValid: false, error: "Kata sandi minimal 6 karakter" };
  }
  return { isValid: true, error: null };
}

async function fetchAuthWithFallback(endpoint: string, options: RequestInit): Promise<Response> {
  const gateway = getGatewayUrl();
  const token = await getAuthToken();
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token && !reqHeaders["Authorization"]) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const fullUrl = gateway ? `${gateway}${endpoint}` : endpoint;
  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: reqHeaders,
      credentials: "include",
    });
    return res;
  } catch (err) {
    // If direct gateway URL fails (e.g. CORS, DNS, or network error), fallback to same-origin relative URL
    if (gateway && typeof window !== "undefined") {
      try {
        const fallbackRes = await fetch(endpoint, {
          ...options,
          headers: reqHeaders,
          credentials: "include",
        });
        return fallbackRes;
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

export const authApi = {
  async register(name: string, email: string, password: string): Promise<User> {
    const res = await fetchAuthWithFallback("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.data?.user) {
      throw new Error(json.error?.message || "Gagal melakukan pendaftaran akun");
    }
    if (json.data.token && typeof window !== "undefined") {
      try {
        localStorage.setItem("tstore_auth_token", json.data.token);
      } catch {}
    }
    return json.data.user;
  },

  async login(email: string, password: string): Promise<User> {
    const res = await fetchAuthWithFallback("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.data?.user) {
      throw new Error(json.error?.message || "Email atau kata sandi tidak cocok");
    }
    if (json.data.token && typeof window !== "undefined") {
      try {
        localStorage.setItem("tstore_auth_token", json.data.token);
      } catch {}
    }
    return json.data.user;
  },

  async logout(): Promise<void> {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("tstore_auth_token");
      } catch {}
    }
    try {
      await fetchAuthWithFallback("/api/v1/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore network errors on logout
    }
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await fetchAuthWithFallback("/api/v1/auth/me", {
        method: "GET",
      });
      if (!res.ok) return null;
      const json: AuthResponse = await res.json();
      return json.data?.user || null;
    } catch {
      return null;
    }
  },
};
