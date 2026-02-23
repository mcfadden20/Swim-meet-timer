import { cn } from '../../lib/cn';

/**
 * Top bar with title and optional actions. Admin: minimal, structured.
 */
export function HeaderBar({ title, subtitle, actions, className, ...props }) {
    return (
        <header
            className={cn(
                'flex justify-between items-center shrink-0 border-b border-admin-border pb-4',
                className
            )}
            {...props}
        >
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-admin-text">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-admin-muted mt-0.5">{subtitle}</p>
                )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
    );
}
