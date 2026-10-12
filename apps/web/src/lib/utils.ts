import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility helper untuk menggabungkan class Tailwind CSS secara kondisional
 * dan menyelesaikan konflik kelas secara otomatis menggunakan clsx dan twMerge.
 *
 * @example
 * ```ts
 * cn("px-2 py-1", isPrimary && "bg-emerald-500", "p-4") // Menghasilkan "p-4 bg-emerald-500"
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };
export default cn;
