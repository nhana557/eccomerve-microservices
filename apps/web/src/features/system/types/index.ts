export interface ServiceHealth {
  name: string;
  status: "UP" | "DOWN" | "DEGRADED" | "HEALTHY" | "OFFLINE";
  port?: number | string;
  role: string;
}

export interface DashboardMetrics {
  totalGmv: number;
  totalOrders: number;
  totalProducts: number;
  lowStockCount: number;
  totalUsers: number;
}
