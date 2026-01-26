import { ManagerPanel } from './components/ManagerPanel';
import { ToggleButton } from './components/ToggleButton';
import { ToastContainer } from './components/ToastContainer';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useAppData } from './hooks/useAppData';
import { useManagerPanelProps } from './hooks/useManagerPanelProps';
import type { ThreadStore } from './core/ThreadStore';
import type { Notifier } from './core/Notifier';
import type { ScanScheduler } from './core/ScanScheduler';
import type { MonitoredThread, TitleChange } from './types';

interface AppProps {
  store: ThreadStore;
  notifier: Notifier;
  scheduler: ScanScheduler;
  performScan: () => { currentThreads: MonitoredThread[]; changes: TitleChange[] };
}

function App({ store, notifier, scheduler, performScan }: AppProps) {
  const data = useAppData({ store, notifier, scheduler, performScan });
  const handlers = useAppHandlers({
    store,
    notifier,
    refreshData: data.refreshData,
    setPendingToasts: data.setPendingToasts,
    setRetentionDays: data.setRetentionDays,
    performScan,
  });

  const managerPanelProps = useManagerPanelProps({
    store,
    isPanelOpen: data.isPanelOpen,
    changeGroups: data.changeGroups,
    unseenCount: data.unseenCount,
    retentionDays: data.retentionDays,
    storageInfo: data.storageInfo,
    setIsPanelOpen: data.setIsPanelOpen,
    handlers,
  });

  return (
    <>
      <ToggleButton
        unseenCount={data.unseenCount}
        onClick={() => data.setIsPanelOpen(!data.isPanelOpen)}
      />
      <ManagerPanel {...managerPanelProps} />
      <ToastContainer
        changes={data.pendingToasts}
        threads={store.getThreads()}
        onDismiss={handlers.handleToastDismiss}
        onNavigate={handlers.handleToastNavigate}
      />
    </>
  );
}

export default App;
