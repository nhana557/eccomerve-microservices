import React, { forwardRef, type ComponentType, type SVGProps } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type ButtonVariant =
  | 'primary' // tombol aksi utama (hijau T.STORE)
  | 'secondary' // tombol abu-abu netral
  | 'outline' // border saja, background transparan
  | 'ghost' // tanpa border, hanya hover background
  | 'danger' // untuk aksi destruktif (hapus, logout)
  | 'link'; // tampil seperti link

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variasi visual tombol */
  variant?: ButtonVariant;
  /** Ukuran tombol */
  size?: ButtonSize;
  /** Tampilkan spinner & disable otomatis */
  isLoading?: boolean;
  /** Icon di sebelah kiri teks */
  leftIcon?: IconComponent;
  /** Icon di sebelah kanan teks */
  rightIcon?: IconComponent;
  /** Full width (100%) */
  fullWidth?: boolean;
  /** Class tambahan */
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  // Base styles (selalu dipakai)
  const baseStyles = cn(
    'inline-flex items-center justify-center gap-2 font-semibold',
    'rounded-xl transition-all',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[0.98]',
  );

  // Varian warna
  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[#00AA5B] hover:bg-[#029650] text-white shadow-lg shadow-[#00AA5B]/25 focus-visible:ring-[#00AA5B]',
    secondary:
      'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 focus-visible:ring-zinc-500',
    outline:
      'bg-transparent hover:bg-zinc-800/50 text-zinc-300 hover:text-white border border-[#232938] hover:border-zinc-700 focus-visible:ring-zinc-500',
    ghost:
      'bg-transparent hover:bg-zinc-800/80 text-zinc-400 hover:text-white focus-visible:ring-zinc-500',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 focus-visible:ring-red-500',
    link: 'bg-transparent hover:underline text-[#00AA5B] hover:text-[#029650] shadow-none p-0 h-auto focus-visible:ring-0',
  };

  // Varian ukuran
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2.5 w-10 h-10',
  };

  // Override padding untuk variant link (biar tidak ada padding)
  const resolvedSize = variant === 'link' ? '' : sizeStyles[size];

  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        resolvedSize,
        fullWidth && 'w-full',
        className, // user override menang
      )}
      {...props}
    >
      {/* Loading spinner menggantikan leftIcon */}
      {isLoading ? (
        <Loader2
          className="w-4 h-4 animate-spin"
          aria-hidden="true"
        />
      ) : (
        LeftIcon && (
          <LeftIcon
            className="w-4 h-4"
            aria-hidden="true"
          />
        )
      )}

      {/* Text (sembunyikan saat size="icon") */}
      {size !== 'icon' && children}

      {!isLoading && RightIcon && (
        <RightIcon
          className="w-4 h-4"
          aria-hidden="true"
        />
      )}
    </button>
  );
});

export { Button };
export default Button;
