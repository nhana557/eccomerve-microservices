import { getGatewayUrl } from "@/lib/api-client";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? getGatewayUrl()
    : process.env.INTERNAL_GATEWAY_URL || "http://localhost:8080");

export const STORAGE_KEYS = {
  ENV_MODE: "tstore_env_mode",
  CART: "tstore_cart_v1",
  AUTH_TOKEN: "tstore_auth_token",
} as const;
