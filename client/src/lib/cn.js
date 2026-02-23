import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx logic. Use for conditional/combined classNames.
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
