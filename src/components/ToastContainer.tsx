import React from 'react';
import type { Toast } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast"
          onClick={() => onRemove(toast.id)}
          style={{
            background:
              toast.type === 'error'
                ? 'var(--color-danger)'
                : toast.type === 'success'
                  ? 'var(--color-success)'
                  : 'var(--color-text)',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};
