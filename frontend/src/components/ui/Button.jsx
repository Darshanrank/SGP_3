import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = forwardRef(({ children, className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0A4D9F]/70 focus:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none';
    
    const variants = {
        primary: 'bg-[#0A4D9F] text-white hover:bg-[#083A78] shadow-[0_10px_24px_rgba(10,77,159,0.35)]',
        secondary: 'bg-[#111721] text-[#DCE7F5] border border-white/10 hover:bg-[#151D27]',
        danger: 'bg-[#EF4444] text-white hover:bg-[#dc2626] shadow-[0_10px_24px_rgba(239,68,68,0.35)]',
        ghost: 'bg-transparent text-[#8DA0BF] hover:bg-[#151D27] hover:text-[#DCE7F5] border border-transparent',
    };

    const sizes = {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-lg',
    };

    return (
        <button 
            ref={ref}
            className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = 'Button';
