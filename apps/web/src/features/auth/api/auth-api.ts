import { User, AuthResponse } from "../types";

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const authApi = {
  async register(name: string, email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include",
    });

    const json: AuthResponse = await res.json();
    if (!res.ok || !json.data?.user) {
      throw new Error(json.error?.message || "Gagal melakukan pendaftaran akun");
    }
    return json.data.user;
  },

  async login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const json: AuthResponse = await res.json();
    if (!res.ok || !json.data?.user) {
      throw new Error(json.error?.message || "Email atau kata sandi tidak cocok");
    }
    return json.data.user;
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return null;
      const json: AuthResponse = await res.json();
      return json.data?.user || null;
    } catch {
      return null;
    }
  },
};
