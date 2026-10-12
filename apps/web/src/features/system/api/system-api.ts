import { apiRequest } from "../../../lib/api-client";
import { ServiceHealth } from "../types";

export interface HealthApiResponse {
  status: string;
  services?: Record<string, string>;
}

export const systemApi = {
  checkHealth: async (): Promise<Record<string, string>> => {
    try {
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
