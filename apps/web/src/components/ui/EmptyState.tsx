import React, { forwardRef, type HTMLAttributes, type ComponentType, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateVariant = 'card' | 'flat';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Icon visual yang ditampilkan di tengah (cth: ShoppingBag, Package, Search) */
  icon?: IconComponent;
  /** Judul pesan status kosong */
  title: React.ReactNode;
  /** Deskripsi penjelasan atau ajakan bertindak */
  description?: React.ReactNode;
  /** Tombol aksi opsional (cth: <Button>Mulai Belanja</Button>) */
  action?: React.ReactNode;
  /** Ukuran visual komponen */
  size?: EmptyStateSize;
  /** Varian background (card = kotak berbingkai, flat = transparan tanpa border) */
  variant?: EmptyStateVariant;
}

const sizeStyles: Record<
  EmptyStateSize,
  {
    container: string;
    iconBox: string;
    iconSize: string;
    title: string;
    description: string;
  }
> = {
  sm: {
    container: 'p-6 max-w-sm space-y-3',
    iconBox: 'w-12 h-12 rounded-xl',
    iconSize: 'w-6 h-6 stroke-[1.5]',
    title: 'text-sm font-bold',
    description: 'text-xs',
  },
  md: {
    container: 'p-8 sm:p-10 max-w-md space-y-4',
    iconBox: 'w-16 h-16 rounded-2xl',
    iconSize: 'w-8 h-8 stroke-[1.5]',
    title: 'text-base sm:text-lg font-bold',
    description: 'text-xs sm:text-sm',
  },
  lg: {
    container: 'p-10 sm:p-14 max-w-lg space-y-5',
    iconBox: 'w-20 h-20 rounded-3xl',
    iconSize: 'w-10 h-10 stroke-[1.5]',
    title: 'text-lg sm:text-xl font-bold',
    description: 'text-sm sm:text-base',
  },
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    icon: Icon,
    title,
    description,
    action,
    size = 'md',
    variant = 'card',
    className,
    children,
    ...props
  },
  ref,
) {
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <div
      ref={ref}
      className={cn(
        'text-center mx-auto flex flex-col items-center justify-center',
        variant === 'card' && 'bg-[#14161D] border border-slate-800 rounded-2xl shadow-sm',
        currentSize.container,
        className,
      )}
      {...props}
    >
      {Icon && (
        <div
          className={cn(
            'bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner',
            currentSize.iconBox,
          )}
          aria-hidden="true"
        >
          <Icon className={currentSize.iconSize} />
        </div>
      )}

      <div className="space-y-1.5 w-full">
        <h3 className={cn('text-slate-100 tracking-tight', currentSize.title)}>
          {title}
        </h3>
        {description && (
          <p className={cn('text-slate-400 font-normal leading-relaxed', currentSize.description)}>
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}

      {children}
    </div>
  );
});

export default EmptyState;
