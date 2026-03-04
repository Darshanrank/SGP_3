import { clsx } from 'clsx';

/**
 * Shimmer skeleton placeholder.
 *
 * Props:
 *  - className: additional Tailwind classes (use to set width/height)
 *  - variant: "text" | "circle" | "rect" (default "text")
 *  - count: number of skeleton lines to render (default 1)
 */
const Skeleton = ({ className, variant = 'text', count = 1 }) => {
    const base = 'animate-pulse bg-gray-200 rounded';

    const variantStyles = {
        text: 'h-4 w-full rounded',
        circle: 'rounded-full',
        rect: 'rounded-lg',
    };

    if (count > 1) {
        return (
            <div className="space-y-3">
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className={clsx(base, variantStyles[variant], className)}
                        style={variant === 'text' && i === count - 1 ? { width: '60%' } : undefined}
                    />
                ))}
            </div>
        );
    }

    return <div className={clsx(base, variantStyles[variant], className)} />;
};

/** Pre-built skeleton for a stat card (used on Dashboard) */
export const StatCardSkeleton = () => (
    <div className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden border border-gray-100">
        <dt>
            <div className="absolute rounded-md p-3 bg-gray-200 animate-pulse">
                <div className="h-6 w-6" />
            </div>
            <div className="ml-16">
                <Skeleton className="h-4 w-24" />
            </div>
        </dt>
        <dd className="ml-16 pb-6 mt-2 sm:pb-7">
            <Skeleton className="h-7 w-16" />
        </dd>
    </div>
);

/** Pre-built skeleton for list items (swaps, notifications, etc.) */
export const ListItemSkeleton = ({ count = 3 }) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-64 mb-2" />
                <Skeleton className="h-3 w-20" />
            </div>
        ))}
    </div>
);

export default Skeleton;
