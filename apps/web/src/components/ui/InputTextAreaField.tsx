import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  textareaClassName?: string;
  required?: boolean;
}

const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, error, hint, className, textareaClassName, required, id, ...props },
  ref,
) {
  const reactId = useId();
  const textareaId = id ?? props.name ?? reactId;

  const stateStyles = error
    ? 'border-red-500 focus:border-red-500'
    : 'border-[#232938] focus:border-[#00AA5B]';

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-medium text-zinc-300 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-invalid={!!error}
        className={cn(
          // Layout, Background & Border ─────────────────────────────
          'w-full px-4 py-2.5 bg-[#0F1117] border rounded-xl text-sm text-zinc-100',

          // Placeholder, Focus & Resize Behavior ────────────────────
          'placeholder-zinc-500 focus:outline-none transition-colors resize-none',

          // State Disabled ──────────────────────────────────────────
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // ─── State dinamis (error / normal) ──────────────────────
          stateStyles,

          // ─── Custom ClassName. Override dari user (paling akhir = menang) ───────────────────────
          textareaClassName,
        )}
        {...props}
      />

      {error ? (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default TextareaField;
