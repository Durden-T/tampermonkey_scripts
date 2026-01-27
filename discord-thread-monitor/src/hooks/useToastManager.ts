import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { TitleChange } from '../types';
import { TIMING } from '../constants';

export interface Toast extends TitleChange {
  toastId: string;
}

export const useToastManager = (changes: TitleChange[], onDismiss: (threadId: string) => void) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const onDismissRef = useRef(onDismiss);
  const timeoutIdsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const toasts = useMemo(() => {
    return changes
      .map((c) => ({ ...c, toastId: `${c.threadId}-${c.changedAt}` }))
      .filter((t) => !dismissedIds.has(t.toastId));
  }, [changes, dismissedIds]);

  const removeToast = useCallback((toastId: string) => {
    setDismissedIds((prev) => new Set(prev).add(toastId));
    const timeoutId = timeoutIdsRef.current.get(toastId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(toastId);
    }
  }, []);

  const handleDismiss = useCallback(
    (toastId: string, threadId: string) => {
      removeToast(toastId);
      onDismissRef.current(threadId);
    },
    [removeToast]
  );

  const handleDismissRef = useRef(handleDismiss);
  useEffect(() => {
    handleDismissRef.current = handleDismiss;
  }, [handleDismiss]);

  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current;

    toasts.forEach((toast) => {
      if (!timeoutIds.has(toast.toastId)) {
        const timeoutId = setTimeout(() => {
          handleDismissRef.current(toast.toastId, toast.threadId);
        }, TIMING.TOAST_AUTO_DISMISS_MS);
        timeoutIds.set(toast.toastId, timeoutId);
      }
    });

    return () => {
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIds.clear();
    };
  }, [toasts]);

  return { toasts, handleDismiss, removeToast };
};
