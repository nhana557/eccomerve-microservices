"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Product } from "../../products/types";
import { Order } from "../../orders/types";
import { Payment } from "../../payments/types";
import { DashboardMetrics, ServiceHealth } from "../types";
import { systemApi } from "../api/system-api";

export function computeDashboardMetrics(
  products: Product[],
  orders: Order[],
  payments: Payment[],
  userCount = 0,
  totalProductsCount?: number
): DashboardMetrics {
  const totalGmv = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);

  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  return {
    totalGmv,
    totalOrders: orders.length,
    totalProducts: totalProductsCount !== undefined && totalProductsCount > 0 ? totalProductsCount : products.length,
    lowStockCount,
    totalUsers: userCount,
  };
}

export function getDefaultInfrastructureServices(
  healthMap: Record<string, string> = {}
): ServiceHealth[] {
  const isHealthy = (key: string): boolean => {
    const val = healthMap[key]?.toLowerCase();
    return val === "healthy" || val === "up";
  };

  return [
    {
      name: "API Gateway",
      status: isHealthy("api-gateway") ? "HEALTHY" : "DOWN",
      port: 8080,
      role: "Central Entrypoint & Proxy",
    },
    {
      name: "Auth Service",
      status: isHealthy("auth-service") ? "HEALTHY" : "DOWN",
      port: 8081,
      role: "Authentication & Users",
    },
    {
      name: "Product Service",
      status: isHealthy("product-service") ? "HEALTHY" : "DOWN",
      port: 8082,
      role: "Catalog & Stock Inventory",
    },
    {
      name: "Order Service",
      status: isHealthy("order-service") ? "HEALTHY" : "DOWN",
      port: 8083,
      role: "Cart & Order Management",
    },
    {
      name: "Payment Service",
      status: isHealthy("payment-service") ? "HEALTHY" : "DOWN",
      port: 8084,
      role: "Payment Simulation",
    },
    {
      name: "PgBouncer",
      status: "HEALTHY",
      role: "Connection Pooler (Tx Mode)",
    },
    {
      name: "PostgreSQL",
      status: "HEALTHY",
      role: "Relational Database",
    },
  ];
}

export function useDashboardOverview() {
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [userCount, setUserCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    const start = performance.now();
    try {
      const res = await systemApi.checkHealth();
      setHealthMap(res);
      setLastChecked(new Date());
      setResponseTime(Math.round(performance.now() - start));
      return res;
    } catch {
      setHealthMap({});
      setLastChecked(new Date());
      setResponseTime(Math.round(performance.now() - start));
      return {};
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);

    systemApi
      .getUsers()
      .then((res) => setUserCount(res.total || res.users?.length || 0))
      .catch(() => setUserCount(1));

    return () => clearInterval(interval);
  }, [checkHealth]);

  const services: ServiceHealth[] = useMemo(() => {
    return getDefaultInfrastructureServices(healthMap);
  }, [healthMap]);

  return {
    services,
    userCount,
    isChecking,
    lastChecked,
    responseTime,
    checkHealth,
  };
}
