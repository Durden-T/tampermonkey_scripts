import React from 'react';
import { getTexts } from '../i18n';
import type { TitleChange, MonitoredThread } from '../types';
import { UpdateIcon, CloseIcon } from './Icons';
import { useToastManager, type Toast } from '../hooks/useToastManager';

interface ToastContainerProps {
  changes: TitleChange[];
  threads: Record<string, MonitoredThread>;
  onDismiss: (threadId: string) => void;
  onNavigate: (url: string, threadId: string) => void;
}

interface ToastItemProps {
  toast: Toast;
  thread?: MonitoredThread;
  t: ReturnType<typeof getTexts>;
  onDismiss: (toastId: string, threadId: string) => void;
  onNavigate: (threadId: string, url: string) => void;
}

const ToastItem = React.memo<ToastItemProps>(({ toast, thread, t, onDismiss, onNavigate }) => {
  const handleClick = () => {
    if (!thread?.url) {
      return;
    }
    onNavigate(toast.threadId, thread.url);
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
        <CloseIcon size={14} />
      </button>
    </div>
  );
});
ToastItem.displayName = 'ToastItem';

export function ToastContainer({ changes, threads, onDismiss, onNavigate }: ToastContainerProps) {
  const t = getTexts();
  const { toasts, handleDismiss, removeToast } = useToastManager(changes, onDismiss);

  const toastsRef = React.useRef(toasts);
  React.useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  const handleToastNavigate = React.useCallback(
    (threadId: string, url: string) => {
      const toastToRemove = toastsRef.current.find((t) => t.threadId === threadId);
      if (toastToRemove) {
        removeToast(toastToRemove.toastId);
      }
      onNavigate(url, threadId);
    },
    [removeToast, onNavigate]
  );

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
