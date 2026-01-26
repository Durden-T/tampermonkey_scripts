import { useEffect } from 'react';
import type { Notifier } from '../core/Notifier';
import type { TitleChange } from '../types';

export const useNotificationListener = (
  notifier: Notifier,
  onNotification: (change: TitleChange) => void,
  onMount: () => void
) => {
  useEffect(() => {
    onMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    notifier.onNotify(onNotification);
    return () => notifier.offNotify(onNotification);
  }, [notifier, onNotification]);
};
