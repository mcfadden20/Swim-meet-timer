import { cn } from '../../lib/cn';

/**
 * Card/panel container. Use for admin surfaces (sidebar, main content, cards).
 * variant: 'default' (admin surface) | 'outdoor' (dark high-contrast)
 */
export function Panel({
    children,
    className,
    variant = 'default',
    padding = 'md',
    ...props
}) {
    return (
        <div
            className={cn(
                'rounded-xl border',
                variant === 'default' &&
                    'bg-admin-surface border-admin-border',
                variant === 'outdoor' &&
                    'bg-outdoor-surface border-outdoor-border',
                padding === 'none' && 'p-0',
                padding === 'sm' && 'p-3',
                padding === 'md' && 'p-4',
                padding === 'lg' && 'p-6',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
