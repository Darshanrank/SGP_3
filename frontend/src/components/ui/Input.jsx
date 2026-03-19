import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef(({ label, error, className, ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={twMerge(clsx(
                    "block w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3] transition-colors focus:border-[#0A4D9F] focus:outline-none focus:ring-2 focus:ring-[#0A4D9F]/40",
                    error ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/40" : "",
                    className
                ))}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-[#EF4444]">{error.message}</p>
            )}
        </div>
    );
});

Input.displayName = "Input";
