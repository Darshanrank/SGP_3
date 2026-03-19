import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

/**
 * A proper input dialog to replace window.prompt().
 *
 * Props:
 *  - open (bool)
 *  - title (string)
 *  - placeholder (string)
 *  - submitLabel (string, default "Submit")
 *  - cancelLabel (string, default "Cancel")
 *  - onSubmit (value: string) => void
 *  - onCancel ()
 */
const InputDialog = ({
    open,
    title = 'Enter a value',
    placeholder = '',
    submitLabel = 'Submit',
    cancelLabel = 'Cancel',
    onSubmit,
    onCancel,
}) => {
    const [value, setValue] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setValue('');
            // Delay focus so the input is mounted
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onCancel]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSubmit?.(value.trim());
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/65" onClick={onCancel} />
            {/* Dialog */}
            <form onSubmit={handleSubmit} className="relative mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                <h3 className="text-lg font-semibold text-[#DCE7F5]">{title}</h3>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="mt-3 w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none focus:ring-2 focus:ring-[#0A4D9F]/40"
                />
                <div className="mt-4 flex justify-end gap-3">
                    <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button type="submit" size="sm" disabled={!value.trim()}>
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default InputDialog;
