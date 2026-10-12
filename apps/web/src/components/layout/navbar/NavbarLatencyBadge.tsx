import React from 'react';
import { Zap } from 'lucide-react';
import { CacheTierLabel } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export interface NavbarLatencyBadgeProps {
  apiResponseTime: number | null;
  apiIsCache: boolean;
  apiCacheTier: CacheTierLabel | null;
  className?: string;
}

export function NavbarLatencyBadge({
  apiResponseTime,
  apiIsCache,
  apiCacheTier,
  className,
}: NavbarLatencyBadgeProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
        <Zap className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-slate-400">Response Time API:</span>
      </span>

      {apiResponseTime !== null && apiResponseTime !== undefined ? (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md',
            'font-mono text-[10px] font-bold border transition-colors',
            apiIsCache
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/40'
              : apiResponseTime < 150
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : apiResponseTime < 350
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          )}
          title={
            apiIsCache
              ? `Data disajikan dari Cache Tier ${apiCacheTier || 'T4'}. Latency: ${apiResponseTime} ms`
              : 'Waktu respons API platform terkini'
          }
        >
          {apiIsCache ? (
            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-400/25 text-emerald-300 font-black">
              CACHE {apiCacheTier || 'T4'}
            </span>
          ) : null}
          <span>{apiResponseTime} ms</span>
        </span>
      ) : (
        <span className="text-slate-500 animate-pulse text-[10px] font-mono">
          Mengukur...
        </span>
      )}
    </div>
  );
}

export default NavbarLatencyBadge;
