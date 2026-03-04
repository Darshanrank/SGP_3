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
            <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
            {/* Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 animate-in fade-in zoom-in">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
                <div className="mt-5 flex justify-end gap-3">
                    <Button variant="secondary" size="sm" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button ref={confirmRef} variant={variant} size="sm" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
