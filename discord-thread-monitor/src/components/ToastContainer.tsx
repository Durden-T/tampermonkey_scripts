import { useEffect, useState, useRef, useCallback } from 'react';
import { getTexts } from '../i18n';
import type { TitleChange, MonitoredThread } from '../types';

interface Toast extends TitleChange {
  toastId: string;
}

interface ToastContainerProps {
  changes: TitleChange[];
  threads: Record<string, MonitoredThread>;
  onDismiss: (threadId: string) => void;
  onNavigate: (url: string, threadId: string) => void;
}

const TOAST_DURATION_MS = 5000;

const UpdateIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export function ToastContainer({
  changes,
  threads,
  onDismiss,
  onNavigate,
}: ToastContainerProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const onDismissRef = useRef(onDismiss);
  const t = getTexts();

  onDismissRef.current = onDismiss;

  const scheduleRemoval = useCallback((toastId: string, threadId: string) => {
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
      timersRef.current.delete(toastId);
      onDismissRef.current(threadId);
    }, TOAST_DURATION_MS);
    timersRef.current.set(toastId, timer);
  }, []);

  useEffect(() => {
    for (const change of changes) {
      const toastId = `${change.threadId}-${change.changedAt}`;
      if (timersRef.current.has(toastId)) {
        continue;
      }

      const newToast: Toast = { ...change, toastId };
      setToasts((prev) => [...prev, newToast]);
      scheduleRemoval(toastId, change.threadId);
    }
  }, [changes, scheduleRemoval]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const removeToast = (toastId: string) => {
    const timer = timersRef.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  const handleDismiss = (toast: Toast) => {
    removeToast(toast.toastId);
    onDismiss(toast.threadId);
  };

  const handleClick = (toast: Toast, url: string) => {
    removeToast(toast.toastId);
    onNavigate(url, toast.threadId);
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const thread = threads[toast.threadId];
        return (
          <div
            key={toast.toastId}
            className="toast"
            onClick={() => handleClick(toast, thread?.url || '')}
          >
            <div className="toast-icon">
              <UpdateIcon />
            </div>
            <div className="toast-content">
              <div className="toast-title">{t.toast?.titleUpdated || 'Title Updated'}</div>
              <div className="toast-change">
                <span className="toast-old">{toast.oldTitle}</span>
                <span className="toast-new">{toast.newTitle}</span>
              </div>
            </div>
            <button
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(toast);
              }}
            >
              <CloseIcon />
            </button>
            <div className="toast-progress" />
          </div>
        );
      })}
    </div>
  );
}
