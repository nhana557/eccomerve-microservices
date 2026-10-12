"use client";

import React, { useState } from "react";
import { ServiceHealth } from "../types";
import { Server, Activity, Database, Network, RefreshCw, Zap } from "lucide-react";
import { useToast } from "@/components/feedback/ToastContext";
import { getResponseTimeBadgeClass, formatResponseTime } from "@/lib/table-helpers";

interface ServiceHealthGridProps {
  services: ServiceHealth[];
  onTestConnection?: () => Promise<any> | void;
  isTesting?: boolean;
  lastChecked?: Date | null;
  responseTime?: number | null;
}

export function ServiceHealthGrid({
  services,
  onTestConnection,
  isTesting = false,
  lastChecked,
  responseTime,
}: ServiceHealthGridProps) {
  const { showToast } = useToast();
  const [internalTesting, setInternalTesting] = useState(false);

  const testing = isTesting || internalTesting;

  const handleTestConnection = async () => {
    if (testing) return;
    setInternalTesting(true);
    try {
      if (onTestConnection) {
        await onTestConnection();
      }
      const healthyCount = services.filter(
        (s) => s.status === "HEALTHY" || s.status === "UP"
      ).length;
      showToast(
        "success",
        "Uji Koneksi Selesai",
        `${healthyCount} dari ${services.length} layanan terhubung dan beroperasi normal.`
      );
    } catch (err: any) {
      showToast(
        "error",
        "Uji Koneksi Gagal",
        err?.message || "Tidak dapat menghubungi API Gateway"
      );
    } finally {
      setInternalTesting(false);
    }
  };

  const formatTime = (date?: Date | null) => {
    if (!date) return null;
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const getIcon = (name: string) => {
    if (name.includes("PostgreSQL") || name.includes("PgBouncer")) {
      return Database;
    }
    if (name.includes("Gateway")) {
      return Network;
    }
    return Server;
  };

  const healthyCount = services.filter((s) => s.status === "HEALTHY" || s.status === "UP").length;
  const offlineCount = services.length - healthyCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>Status Layanan &amp; Infrastruktur</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoring konektivitas backend microservices dan routing API Gateway.
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {healthyCount} Aktif
            </span>
            {offlineCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {offlineCount} Offline
              </span>
            )}
            {lastChecked && (
              <span className="text-slate-500">
                • Diperiksa: {formatTime(lastChecked)}
              </span>
            )}
            {responseTime !== undefined && responseTime !== null && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${getResponseTimeBadgeClass(
                  responseTime
                )}`}
                title="Waktu respons API Gateway Health Check"
              >
                <Zap className="w-3 h-3 text-current" />
                <span>{formatResponseTime(responseTime)}</span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-500/50 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-start sm:self-center cursor-pointer"
          title="Uji koneksi ke seluruh microservices"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin text-cyan-400" : ""}`} />
          <span>{testing ? "Menguji Koneksi..." : "Test Koneksi"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => {
          const SvcIcon = getIcon(svc.name);
          const isUp = svc.status === "UP" || svc.status === "HEALTHY";
          const hasPort = Boolean(svc.port) && !svc.name.toLowerCase().includes("pgbouncer") && !svc.name.toLowerCase().includes("postgres");

          return (
            <div
              key={svc.name}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 shadow-md flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isUp
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  <SvcIcon className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100 text-xs truncate">{svc.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{svc.role}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                    isUp
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/80"
                      : "bg-rose-950/80 text-rose-300 border-rose-800/80"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isUp ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                    }`}
                  />
                  <span>{hasPort ? `:${svc.port} • ` : ""}{svc.status}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
