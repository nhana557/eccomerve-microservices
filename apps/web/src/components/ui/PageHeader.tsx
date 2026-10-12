import React, { forwardRef, type HTMLAttributes, type ComponentType, type SVGProps } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Judul utama halaman */
  title: React.ReactNode;
  /** Subtitle atau deskripsi pelengkap di bawah judul */
  description?: React.ReactNode;
  /** Ikon visual di samping judul */
  icon?: IconComponent;
  /** Warna / kelas kustom untuk kontainer ikon */
  iconClassName?: string;
  /** Badge status, jumlah item, atau tag label di samping judul */
  badge?: React.ReactNode;
  /** Tautan URL untuk tombol navigasi kembali (opsional) */
  backHref?: string;
  /** Label teks tombol kembali (default: "Kembali") */
  backLabel?: string;
  /** Callback opsional jika tombol kembali menggunakan aksi tombol alih-alih tautan */
  onBack?: () => void;
  /** Elemen aksi di sisi kanan header (cth: tombol filter, tombol refresh) */
  actions?: React.ReactNode;
  /** Tampilkan garis pembatas bawah (default: true) */
  bordered?: boolean;
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(function PageHeader(
  {
    title,
    description,
    icon: Icon,
    iconClassName,
    badge,
    backHref,
    backLabel = 'Kembali',
    onBack,
    actions,
    bordered = true,
    className,
    children,
    ...props
  },
  ref,
) {
  const hasBackAction = Boolean(backHref || onBack);

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5',
        bordered && 'border-b border-slate-800/80',
        className,
      )}
      {...props}
    >
      <div className="space-y-2.5 min-w-0">
        {/* Tombol Navigasi Kembali */}
        {hasBackAction && (
          <div>
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-medium group"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>{backLabel}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-medium cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>{backLabel}</span>
              </button>
            )}
          </div>
        )}

        {/* Baris Judul & Ikon */}
        <div className="flex items-center gap-3 flex-wrap">
          {Icon && (
            <div
              className={cn(
                'w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-sm',
                iconClassName,
              )}
              aria-hidden="true"
            >
              <Icon className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>

            {description && (
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {children}
      </div>

      {/* Sisi Kanan: Aksi (Actions Slot) */}
      {actions && (
        <div className="flex items-center gap-2 sm:self-center shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
});

export default PageHeader;
