import { apiRequest } from "../../../lib/api-client";
import { ServiceHealth } from "../types";

export interface HealthApiResponse {
  status: string;
  services?: Record<string, string>;
}

export const systemApi = {
  checkHealth: async (): Promise<Record<string, string>> => {
    try {
      // 1. In browser, try Next.js server route /api/health which proxies internally to gateway
      if (typeof window !== "undefined") {
        try {
          const localRes = await fetch("/api/health", { cache: "no-store" }).then((r) => r.json());
          const services = localRes?.gateway?.services || localRes?.gateway?.data?.services;
          const status = localRes?.gateway?.status || localRes?.gateway?.data?.status;
          if (services && typeof services === "object") {
            return {
              ...services,
              "api-gateway": services["api-gateway"] || status || "healthy",
            };
          }
        } catch {
          // Fall through to direct call
        }
      }

      // 2. Direct gateway call fallback
      const res = await apiRequest<HealthApiResponse | Record<string, string>>("/api/v1/health");
      if (res && typeof res === "object") {
        if ("services" in res && res.services && typeof res.services === "object") {
          return {
            ...res.services,
            "api-gateway": res.services["api-gateway"] || res.status || "healthy",
          };
        }
        return res as Record<string, string>;
      }
      return {};
    } catch {
      return {};
    }
  },
  getUsers: async (): Promise<{ users: any[]; total: number }> => {
    return apiRequest<{ users: any[]; total: number }>("/api/v1/users");
  },
};
