import { cn } from '../../lib/cn';

/**
 * Card for upload/setup sections (e.g. Maestro). Title, optional status, children.
 */
export function UploadCard({
    title,
    description,
    status,
    statusVariant = 'default',
    children,
    className,
    ...props
}) {
    return (
        <div
            className={cn(
                'rounded-xl border p-6',
                'bg-admin-surface border-admin-accent/30',
                className
            )}
            {...props}
        >
            <h2 className="text-sm font-semibold text-admin-accent uppercase tracking-wider mb-1">
                {title}
            </h2>
            {description && (
                <p className="text-sm text-admin-muted mb-4">{description}</p>
            )}
            {status && (
                <div
                    className={cn(
                        'rounded-lg border p-4 mb-4 flex items-center gap-3',
                        statusVariant === 'success' &&
                            'bg-green-950/40 border-green-500/50',
                        statusVariant === 'error' &&
                            'bg-red-950/40 border-red-500/50',
                        statusVariant === 'default' &&
                            'bg-admin-bg border-admin-border'
                    )}
                >
                    {status}
                </div>
            )}
            {children}
        </div>
    );
}
