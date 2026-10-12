import React, { forwardRef, useId, type ComponentType, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label di atas input */
  label?: string;
  /** Icon component dari lucide-react / heroicons, dll */
  icon?: IconComponent;
  /** Pesan error (menggantikan hint jika ada) */
  error?: string;
  /** Teks bantuan di bawah input */
  hint?: string;
  /** Ukuran input */
  size?: InputSize;
  /** Class untuk wrapper div */
  className?: string;
  /** Class untuk elemen input */
  inputClassName?: string;
  /** Tandai required (menambahkan *) */
  required?: boolean;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  {
    label,
    icon: Icon,
    error,
    hint,
    size = 'md',
    disabled = false,
    required = false,
    className,
    inputClassName,
    id,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? props.name ?? reactId;

  // Base styles (selalu dipakai)
  const baseInputStyles =
    'w-full bg-[#0F1117] border rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  // Varian ukuran
  const sizeStyles: Record<InputSize, string> = {
    sm: Icon ? 'pl-9 pr-3 py-2 text-xs' : 'px-3 py-2 text-xs',
    md: Icon ? 'pl-10 pr-4 py-2.5 text-sm' : 'px-4 py-2.5 text-sm',
    lg: Icon ? 'pl-11 pr-4 py-3 text-base' : 'px-4 py-3 text-base',
  };

  const iconSizeStyles: Record<InputSize, string> = {
    sm: 'w-3.5 h-3.5 left-3',
    md: 'w-4 h-4 left-3.5',
    lg: 'w-5 h-5 left-3.5',
  };

  const stateStyles = error
    ? 'border-red-500 focus:border-red-500'
    : 'border-[#232938] focus:border-[#00AA5B]';

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-zinc-300 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            className={cn(
              'absolute top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none',
              iconSizeStyles[size],
            )}
            aria-hidden="true"
          />
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(baseInputStyles, sizeStyles[size], stateStyles, inputClassName)}
          {...props}
        />
      </div>

      {error ? (
        <p
          id={`${inputId}-error`}
          className="mt-1.5 text-xs text-red-500"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${inputId}-hint`}
          className="mt-1.5 text-xs text-zinc-500"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default InputField;
