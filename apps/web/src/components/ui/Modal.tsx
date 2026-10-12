'use client';

import React, { useEffect, forwardRef, type HTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
export type ModalPadding = 'none' | 'sm' | 'md' | 'lg';

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Status apakah modal aktif terbuka */
  isOpen: boolean;
  /** Callback saat modal meminta ditutup */
  onClose: () => void;
  /** Judul modal (opsional jika menggunakan ModalHeader komposit) */
  title?: React.ReactNode;
  /** Deskripsi subtitle di bawah judul (opsional) */
  description?: React.ReactNode;
  /** Footer tombol aksi (opsional) */
  footer?: React.ReactNode;
  /**
   * Pilihan ukuran lebar maksimal modal:
   * - `sm`: max-w-sm (384px)
   * - `md`: max-w-md (448px, default)
   * - `lg`: max-w-lg (512px)
   * - `xl`: max-w-xl (576px)
   * - `2xl`: max-w-2xl (672px)
   * - `3xl`: max-w-3xl (768px)
   * - `full`: max-w-5xl w-full
   */
  size?: ModalSize;
  /** Kompatibilitas mundur untuk properti maxWidth lama */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Padding pada area konten body modal (default: 'md' = 24px/p-6) */
  padding?: ModalPadding;
  /** Class tambahan untuk area body konten */
  bodyClassName?: string;
  /** Tampilkan tombol silang di kanan atas header (default: true) */
  showCloseButton?: boolean;
  /** Tutup modal saat area backdrop luar diklik (default: true) */
  closeOnBackdropClick?: boolean;
  /** Tutup modal saat tombol Escape ditekan (default: true) */
  closeOnEsc?: boolean;
  /** Class tambahan untuk container luar modal overlay */
  overlayClassName?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-5xl w-full',
};

const paddingClasses: Record<ModalPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    isOpen,
    onClose,
    title,
    description,
    footer,
    size = 'md',
    maxWidth,
    padding = 'md',
    bodyClassName,
    showCloseButton = true,
    closeOnBackdropClick = true,
    closeOnEsc = true,
    className,
    overlayClassName,
    children,
    ...props
  },
  ref,
) {
  // Handle Escape key listener & Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEsc]);

  if (!isOpen) return null;

  // Resolusi size dengan prioritas size > maxWidth
  const resolvedSize = maxWidth ? (maxWidth as ModalSize) : size;
  const sizeClass = sizeClasses[resolvedSize] || sizeClasses.md;

  const hasSimpleHeader = Boolean(title);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4',
        overlayClassName,
      )}
    >
      {/* Backdrop Gelap dengan Efek Blur */}
      <div
        className={cn(
          'fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in',
        )}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Kartu Dialog Modal */}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasSimpleHeader ? 'shared-modal-title' : undefined}
        className={cn(
          'relative z-10 w-full overflow-hidden text-slate-100 flex flex-col',
          'bg-[#14161D] border border-slate-800 rounded-2xl shadow-2xl shadow-black/60',
          'max-h-[90vh] animate-in fade-in-50 zoom-in-95 duration-200',
          sizeClass,
          className,
        )}
        {...props}
      >
        {/* Render default Header jika prop `title` disediakan */}
        {hasSimpleHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#161922]/50 shrink-0">
            <div className="min-w-0 pr-3">
              <h3
                id="shared-modal-title"
                className="text-lg font-bold text-slate-100 tracking-tight truncate"
              >
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup Dialog"
                className={cn(
                  'p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80',
                  'transition-colors duration-150 cursor-pointer shrink-0',
                )}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Jika tidak ada title dan showCloseButton aktif, tampilkan tombol X melayang */}
        {!hasSimpleHeader && showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Dialog"
            className={cn(
              'absolute top-4 right-4 z-20 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80',
              'transition-colors duration-150 cursor-pointer',
            )}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Body Konten Modal */}
        <div
          className={cn(
            'overflow-y-auto flex-1',
            paddingClasses[padding],
            bodyClassName,
          )}
        >
          {children}
        </div>

        {/* Footer opsional jika prop `footer` disediakan */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-slate-800/80 bg-[#101217] flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

/* Composable Sub-Components untuk Kontrol Penuh */

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(function ModalHeader(
  { bordered = true, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'px-6 py-4 flex items-center justify-between gap-3 bg-[#161922]/50 shrink-0',
        bordered && 'border-b border-slate-800/80',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(function ModalTitle(
  { className, children, ...props },
  ref,
) {
  return (
    <h3
      ref={ref}
      className={cn('text-lg font-bold text-slate-100 tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
});

export interface ModalDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const ModalDescription = forwardRef<HTMLParagraphElement, ModalDescriptionProps>(
  function ModalDescription({ className, children, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn('text-xs text-slate-400 mt-0.5', className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);

export interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {}

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  function ModalContent({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('p-6 overflow-y-auto flex-1', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

export const ModalBody = ModalContent;

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(function ModalFooter(
  { bordered = true, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'px-6 py-3.5 flex items-center justify-end gap-2.5 bg-[#101217] shrink-0',
        bordered && 'border-t border-slate-800/80',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export default Modal;
