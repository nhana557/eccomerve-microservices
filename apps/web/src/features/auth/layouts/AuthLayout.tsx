import React from 'react';
import { cn } from '@/lib/utils';

export interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4 relative',
        className,
      )}
    >
      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  );
}

export default AuthLayout;
