"use client";

import React from "react";
import { useToast } from "./ToastContext";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Komponen kontainer notifikasi Toast global.
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "flex flex-col gap-2",
        "w-full max-w-sm",
        "pointer-events-none"
      )}
    >
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
        };

        const borderThemes = {
          success: "border-emerald-500/30 bg-slate-900/95 shadow-emerald-950/20",
          error: "border-rose-500/30 bg-slate-900/95 shadow-rose-950/20",
          warning: "border-amber-500/30 bg-slate-900/95 shadow-amber-950/20",
          info: "border-cyan-500/30 bg-slate-900/95 shadow-cyan-950/20",
        };

        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto",
              "flex items-start gap-3",
              "p-4 rounded-xl",
              "border backdrop-blur-md shadow-2xl",
              "transition-all duration-200 animate-in slide-in-from-right-4 fade-in-0",
              borderThemes[toast.type]
            )}
          >
            <div className="shrink-0 pt-0.5">{icons[toast.type]}</div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-100 leading-tight">
                {toast.title}
              </div>

              {toast.message && (
                <div className="text-xs text-slate-400 mt-1 leading-normal break-words">
                  {toast.message}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Tutup notifikasi"
              className={cn(
                "p-0.5 rounded-md",
                "text-slate-400",
                "hover:text-slate-200 hover:bg-slate-800/80",
                "transition-colors duration-150 cursor-pointer shrink-0"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
