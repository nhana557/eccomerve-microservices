import React, { forwardRef, type HTMLAttributes, type ComponentType, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'default';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeShape = 'pill' | 'rounded';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Variasi warna tema status */
  variant?: BadgeVariant;
  /** Ukuran badge */
  size?: BadgeSize;
  /** Bentuk sudut badge (pill = rounded-full, rounded = rounded-lg) */
  shape?: BadgeShape;
  /** Tampilkan titik indikator warna status */
  dot?: boolean;
  /** Efek denyut berkedip pada titik indikator (animate-pulse) */
  pulse?: boolean;
  /** Icon di sebelah kiri teks */
  leftIcon?: IconComponent;
  /** Icon di sebelah kanan teks */
  rightIcon?: IconComponent;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  success: {
    container: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  warning: {
    container: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-400',
  },
  danger: {
    container: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    dot: 'bg-rose-400',
  },
  info: {
    container: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30',
    dot: 'bg-cyan-400',
  },
  neutral: {
    container: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
    dot: 'bg-slate-400',
  },
  default: {
    container: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
    dot: 'bg-slate-400',
  },
  purple: {
    container: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
    dot: 'bg-indigo-400',
  },
};

const sizeStyles: Record<BadgeSize, { text: string; icon: string; dot: string }> = {
  sm: {
    text: 'text-[10px] px-2 py-0.5 gap-1 font-medium',
    icon: 'w-3 h-3',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    text: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    icon: 'w-3.5 h-3.5',
    dot: 'w-2 h-2',
  },
  lg: {
    text: 'text-sm px-3 py-1.5 gap-2 font-semibold',
    icon: 'w-4 h-4',
    dot: 'w-2.5 h-2.5',
  },
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    variant = 'neutral',
    size = 'md',
    shape = 'pill',
    dot = false,
    pulse = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    children,
    ...props
  },
  ref,
) {
  const currentVariant = variantStyles[variant] || variantStyles.neutral;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center shrink-0 tracking-tight transition-colors select-none',
        shape === 'pill' ? 'rounded-full' : 'rounded-lg',
        currentVariant.container,
        currentSize.text,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'rounded-full shrink-0',
            currentVariant.dot,
            currentSize.dot,
            pulse && 'animate-pulse',
          )}
          aria-hidden="true"
        />
      )}

      {LeftIcon && (
        <LeftIcon
          className={cn(currentSize.icon, 'shrink-0')}
          aria-hidden="true"
        />
      )}

      {children}

      {RightIcon && (
        <RightIcon
          className={cn(currentSize.icon, 'shrink-0')}
          aria-hidden="true"
        />
      )}
    </span>
  );
});

export default Badge;
