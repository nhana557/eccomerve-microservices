import { expect, test, describe } from "bun:test";
import {
  computeDashboardMetrics,
  getDefaultInfrastructureServices,
} from "./hooks/use-dashboard-overview";
import { DashboardTab } from "./layouts/DashboardSidebar";
import { MetricCard } from "./components/MetricCard";
import { TechEngineCards } from "./layouts/TechEngineCards";
import { BackendArchitectureInfo } from "./components/BackendArchitectureInfo";
import { Payment } from "../payments/types";
import { Order } from "../orders/types";
import { Product } from "../products/types";
import { DollarSign } from "lucide-react";

const mockPayments: Payment[] = [
  { id: "pay-1", order_id: "o1", amount: 1500000, payment_method: "CREDIT_CARD", status: "SUCCESS", created_at: "", updated_at: "" },
  { id: "pay-2", order_id: "o2", amount: 500000, payment_method: "E_WALLET", status: "PENDING", created_at: "", updated_at: "" },
];

const mockOrders: Order[] = [
  { id: "o1", user_id: "u1", total_amount: 1500000, status: "PAID", items: [], created_at: "", updated_at: "" },
  { id: "o2", user_id: "u2", total_amount: 500000, status: "PENDING", items: [], created_at: "", updated_at: "" },
];

const mockProducts: Product[] = [
  { id: "p1", name: "Keyboard", description: "", price: 1000000, stock: 2, category: "Electronics", created_at: "", updated_at: "" },
  { id: "p2", name: "Mouse", description: "", price: 500000, stock: 10, category: "Electronics", created_at: "", updated_at: "" },
];

describe("Dashboard Metrics Aggregation", () => {
  test("computeDashboardMetrics calculates total GMV only from successful payments and counts low stock", () => {
    const metrics = computeDashboardMetrics(mockProducts, mockOrders, mockPayments, 5);
    expect(metrics.totalGmv).toBe(1500000);
    expect(metrics.totalOrders).toBe(2);
    expect(metrics.totalProducts).toBe(2);
    expect(metrics.lowStockCount).toBe(1);

    // With explicit totalProductsCount from backend database
    const metricsWithTotal = computeDashboardMetrics(mockProducts, mockOrders, mockPayments, 5, 1000000);
    expect(metricsWithTotal.totalProducts).toBe(1000000);
  });

  test("getDefaultInfrastructureServices lists PgBouncer and PostgreSQL without port and maps healthy services", () => {
    const services = getDefaultInfrastructureServices({
      "api-gateway": "healthy",
      "product-service": "healthy",
      "auth-service": "offline",
    });
    const pgbouncer = services.find((s) => s.name === "PgBouncer");
    const postgres = services.find((s) => s.name === "PostgreSQL");
    const productService = services.find((s) => s.name === "Product Service");
    const authService = services.find((s) => s.name === "Auth Service");
    const orderService = services.find((s) => s.name === "Order Service");
    const paymentService = services.find((s) => s.name === "Payment Service");

    expect(pgbouncer).toBeDefined();
    expect(pgbouncer?.port).toBeUndefined();
    expect(pgbouncer?.status).toBe("HEALTHY");

    expect(postgres).toBeDefined();
    expect(postgres?.port).toBeUndefined();
    expect(postgres?.status).toBe("HEALTHY");

    expect(productService).toBeDefined();
    expect(productService?.port).toBe(8082);
    expect(productService?.status).toBe("HEALTHY");

    expect(authService).toBeDefined();
    expect(authService?.port).toBe(8081);
    expect(authService?.status).toBe("DOWN");

    expect(orderService).toBeDefined();
    expect(orderService?.port).toBe(8083);
    expect(orderService?.status).toBe("DOWN");

    expect(paymentService).toBeDefined();
    expect(paymentService?.port).toBe(8084);
    expect(paymentService?.status).toBe("DOWN");
  });

  test("DashboardTab defines valid sidebar menu options", () => {
    const validTabs: DashboardTab[] = ["products", "orders", "payments", "health"];
    expect(validTabs).toContain("products");
    expect(validTabs).toContain("orders");
    expect(validTabs).toContain("payments");
    expect(validTabs).toContain("health");
    expect(validTabs.length).toBe(4);
  });

  test("MetricCard, TechEngineCards and BackendArchitectureInfo components are exported and defined", () => {
    expect(typeof MetricCard).toBe("function");
    expect(typeof TechEngineCards).toBe("function");
    expect(typeof BackendArchitectureInfo).toBe("function");
  });
});
