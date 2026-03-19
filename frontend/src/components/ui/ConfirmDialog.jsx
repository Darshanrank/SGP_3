import { useEffect, useRef } from 'react';
import { Button } from './Button';

/**
 * A proper confirm dialog to replace window.confirm().
 *
 * Props:
 *  - open (bool)
 *  - title (string)
 *  - message (string)
 *  - confirmLabel (string, default "Confirm")
 *  - cancelLabel (string, default "Cancel")
 *  - variant ("primary" | "danger", default "primary")
 *  - confirmDisabled (bool, default false)
 *  - children (ReactNode, optional custom content)
 *  - onConfirm ()
 *  - onCancel ()
 */
const ConfirmDialog = ({
    open,
    title = 'Are you sure?',
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'primary',
    confirmDisabled = false,
    children,
    onConfirm,
    onCancel,
}) => {
    const confirmRef = useRef(null);

    useEffect(() => {
        if (open) confirmRef.current?.focus();
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/65" onClick={onCancel} />
            {/* Dialog */}
            <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in">
                <h3 className="text-lg font-semibold text-[#DCE7F5]">{title}</h3>
                {message && <p className="mt-2 text-sm text-[#8DA0BF]">{message}</p>}
                {children ? <div className="mt-4">{children}</div> : null}
                <div className="mt-5 flex justify-end gap-3">
                    <Button variant="secondary" size="sm" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button ref={confirmRef} variant={variant} size="sm" onClick={onConfirm} disabled={confirmDisabled}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
