import { cn } from '../../lib/cn';

/**
 * Inline status message with optional indicator and action. Admin style.
 */
export function StatusBanner({
    status = 'default',
    title,
    description,
    action,
    className,
}) {
    const isSuccess = status === 'success';
    const isError = status === 'error';

    return (
        <div
            className={cn(
                'rounded-xl border flex items-center justify-between px-4 py-3',
                isSuccess && 'bg-emerald-950/30 border-emerald-500/30',
                isError && 'bg-red-950/30 border-red-500/30',
                !isSuccess && !isError && 'bg-admin-surface border-admin-border',
                className
            )}
        >
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        'w-2.5 h-2.5 rounded-full shrink-0',
                        isSuccess && 'bg-emerald-500 animate-pulse',
                        isError && 'bg-red-500',
                        !isSuccess && !isError && 'bg-admin-muted'
                    )}
                />
                <div>
                    {title && (
                        <div className="text-sm font-medium text-admin-text">
                            {title}
                        </div>
                    )}
                    {description && (
                        <div className="text-xs text-admin-muted mt-0.5">
                            {description}
                        </div>
                    )}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
