import { cn } from '../../lib/cn';

/**
 * Large, high-contrast timer display for outdoor use.
 */
export function TimerDisplay({ value, className, muted }) {
    return (
        <div
            className={cn(
                'text-center py-8 flex items-center justify-center',
                className
            )}
        >
            <span
                className={cn(
                    'text-timer font-mono font-black tracking-tighter tabular-nums select-none',
                    muted
                        ? 'text-outdoor-muted line-through opacity-70'
                        : 'text-outdoor-text'
                )}
            >
                {value}
            </span>
        </div>
    );
}
