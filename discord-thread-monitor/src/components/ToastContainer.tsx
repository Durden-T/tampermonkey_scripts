import { useEffect, useState, useRef } from 'react';
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
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2
      12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

interface ToastItemProps {
  toast: Toast;
  thread?: MonitoredThread;
  t: ReturnType<typeof getTexts>;
  onDismiss: (toastId: string, threadId: string) => void;
  onNavigate: (threadId: string, url: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, thread, t, onDismiss, onNavigate }) => {
  const handleClick = () => {
    const url = thread?.url;
    onNavigate(toast.threadId, url !== undefined ? url : '');
  };

  const handleDismissClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(toast.toastId, toast.threadId);
  };

  return (
    <div key={toast.toastId} className="toast" onClick={handleClick}>
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
      <button className="toast-close" onClick={handleDismissClick}>
        <CloseIcon />
      </button>
      <div className="toast-progress" />
    </div>
  );
};

// eslint-disable-next-line max-lines-per-function
const useToastManager = (changes: TitleChange[], onDismiss: (threadId: string) => void) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const newToasts: Toast[] = [];
    const changeIds = new Set(changes.map((c) => `${c.threadId}-${c.changedAt}`));

    // Add new toasts
    changes.forEach((change) => {
      const toastId = `${change.threadId}-${change.changedAt}`;
      if (!timersRef.current.has(toastId)) {
        const newToast: Toast = { ...change, toastId };
        newToasts.push(newToast);

        // Schedule removal
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
          timersRef.current.delete(toastId);
          onDismiss(change.threadId);
        }, TOAST_DURATION_MS);
        timersRef.current.set(toastId, timer);
      }
    });

    if (newToasts.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToasts((prev) => [...prev, ...newToasts]);
    }

    // Cleanup timers for toasts that are no longer in changes
    timersRef.current.forEach((timer, toastId) => {
      if (!changeIds.has(toastId)) {
        clearTimeout(timer);
        timersRef.current.delete(toastId);
        setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
      }
    });
  }, [changes, onDismiss]);

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

  const handleDismiss = (toastId: string, threadId: string) => {
    removeToast(toastId);
    onDismiss(threadId);
  };

  return { toasts, handleDismiss, removeToast };
};

export function ToastContainer({ changes, threads, onDismiss, onNavigate }: ToastContainerProps) {
  const t = getTexts();
  const { toasts, handleDismiss, removeToast } = useToastManager(changes, onDismiss);

  const handleToastNavigate = (threadId: string, url: string) => {
    // Find and remove the toast for this thread
    const toastToRemove = toasts.find((t) => t.threadId === threadId);
    if (toastToRemove) {
      removeToast(toastToRemove.toastId);
    }
    onNavigate(url, threadId);
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const thread = threads[toast.threadId];
        return (
          <ToastItem
            key={toast.toastId}
            toast={toast}
            thread={thread}
            t={t}
            onDismiss={handleDismiss}
            onNavigate={handleToastNavigate}
          />
        );
      })}
    </div>
  );
}
