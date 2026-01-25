import { useEffect, useRef } from 'react';
import type { Notifier } from '../core/Notifier';
import type { TitleChange } from '../types';

export const useNotificationListener = (
  notifier: Notifier,
  onNotification: (change: TitleChange) => void,
  onMount: () => void
) => {
  const hasMounted = useRef(false);
  const onMountRef = useRef(onMount);

  useEffect(() => {
    onMountRef.current = onMount;
  }, [onMount]);

  useEffect(() => {
    notifier.onNotify(onNotification);

    if (!hasMounted.current) {
      hasMounted.current = true;
      onMountRef.current();
    }

    return () => notifier.offNotify(onNotification);
  }, [notifier, onNotification]);
};
