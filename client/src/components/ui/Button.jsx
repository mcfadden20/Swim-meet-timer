import { cn } from '../../lib/cn';

const variants = {
    primary:
        'bg-admin-accent text-admin-bg font-semibold hover:bg-admin-accent-hover border border-transparent',
    secondary:
        'bg-admin-surface border border-admin-border text-admin-text hover:bg-admin-surface-hover',
    ghost:
        'bg-transparent text-admin-muted hover:bg-admin-surface hover:text-admin-text',
    danger:
        'bg-red-600 text-white font-semibold hover:bg-red-500 border border-transparent',
    link: 'bg-transparent text-admin-accent hover:text-admin-accent-hover underline-offset-2 hover:underline',
    // Outdoor (timer/officials): high-contrast
    'outdoor-cta':
        'bg-outdoor-cta-start text-outdoor-bg font-black tracking-widest uppercase hover:bg-outdoor-cta-start-hover shadow-lg active:scale-[0.98] transition-transform',
    'outdoor-stop':
        'bg-outdoor-cta-stop text-white font-black tracking-widest uppercase border-2 border-outdoor-cta-stop shadow-lg active:scale-[0.98] transition-transform',
    'outdoor-save':
        'bg-outdoor-cta-save text-outdoor-bg font-black tracking-widest uppercase shadow-lg active:scale-[0.98] transition-transform',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl',
    'cta': 'min-h-[160px] w-full rounded-2xl flex flex-col items-center justify-center gap-2 text-2xl md:text-3xl touch-manipulation',
};

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    as = 'button',
    ...props
}) {
    const Tag = as;

    return (
        <Tag
            className={cn(
                'inline-flex items-center justify-center gap-2 font-mono transition-colors disabled:opacity-50 disabled:pointer-events-none',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </Tag>
    );
}
