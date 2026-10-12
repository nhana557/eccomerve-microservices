import React, { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'default' | 'elevated' | 'outline' | 'interactive' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Variasi visual kartu */
  variant?: CardVariant;
  /** Ukuran padding internal kartu */
  padding?: CardPadding;
  /** Render sebagai elemen HTML lain (default: 'div') */
  as?: React.ElementType;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-[#14161D] border border-slate-800 text-slate-100',
  elevated: 'bg-[#14161B] border border-slate-800 text-slate-100 shadow-xl shadow-black/40',
  outline: 'bg-transparent border border-slate-800 text-slate-100',
  interactive:
    'bg-[#14161D] border border-slate-800 text-slate-100 hover:border-slate-700/90 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-black/20',
  glass: 'bg-slate-900/80 border border-slate-800/80 backdrop-blur-md text-slate-100 shadow-lg',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = 'default',
    padding = 'md',
    as: Component = 'div',
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cn(
        'rounded-2xl relative overflow-hidden',
        variantStyles[variant],
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { bordered = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-3',
        bordered && 'pb-3.5 border-b border-slate-800/80 mb-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span';
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { as: Component = 'h3', className, children, ...props },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cn(
        'font-bold text-slate-100 tracking-tight text-base sm:text-lg',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  function CardDescription({ className, children, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn('text-xs sm:text-sm text-slate-400 font-normal', className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('space-y-3', className)}
      {...props}
    >
      {children}
    </div>
  );
});

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { bordered = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-3 pt-4',
        bordered && 'border-t border-slate-800/80 mt-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

// Alias for convenience
export const CardBody = CardContent;

export default Card;
