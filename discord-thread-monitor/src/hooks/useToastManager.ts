import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { TitleChange } from '../types';

export interface Toast extends TitleChange {
  toastId: string;
}

export const useToastManager = (changes: TitleChange[], onDismiss: (threadId: string) => void) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const onDismissRef = useRef(onDismiss);

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
  }, []);

  const handleDismiss = useCallback(
    (toastId: string, threadId: string) => {
      removeToast(toastId);
      onDismissRef.current(threadId);
    },
    [removeToast]
  );

  return { toasts, handleDismiss, removeToast };
};
