import type { ThreadStore } from '../core/ThreadStore';
import type { ThreadChangeGroup, StorageInfo } from '../types';

interface ManagerPanelPropsInput {
  store: ThreadStore;
  isPanelOpen: boolean;
  changeGroups: ThreadChangeGroup[];
  unseenCount: number;
  retentionDays: number;
  storageInfo: StorageInfo;
  setIsPanelOpen: (open: boolean) => void;
  handlers: {
    handleScanNow: () => void;
    handleOpen: (url: string, threadId: string) => void;
    handleBlock: (threadId: string) => void;
    handleResume: (threadId: string) => void;
    handleMarkAllRead: () => void;
    handleSimulateTitleChange: () => void;
    handleRetentionChange: (days: number) => void;
  };
}

export const useManagerPanelProps = (input: ManagerPanelPropsInput) => ({
  isOpen: input.isPanelOpen,
  threads: Object.values(input.store.getThreads()),
  changes: input.store.getChanges(),
  changeGroups: input.changeGroups,
  blacklistedThreads: input.store.getBlacklistedThreads(),
  unseenCount: input.unseenCount,
  retentionDays: input.retentionDays,
  storageInfo: input.storageInfo,
  onClose: () => input.setIsPanelOpen(false),
  onScanNow: input.handlers.handleScanNow,
  onOpen: input.handlers.handleOpen,
  onBlock: input.handlers.handleBlock,
  onResume: input.handlers.handleResume,
  onMarkAllRead: input.handlers.handleMarkAllRead,
  onSimulateTitleChange: input.handlers.handleSimulateTitleChange,
  onRetentionChange: input.handlers.handleRetentionChange,
});
