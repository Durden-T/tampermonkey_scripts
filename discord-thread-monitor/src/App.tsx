import { ManagerPanel } from './components/ManagerPanel';
import { ToggleButton } from './components/ToggleButton';
import { ToastContainer } from './components/ToastContainer';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useAppData } from './hooks/useAppData';
import type { ThreadStore } from './core/ThreadStore';
import type { Notifier } from './core/Notifier';
import type { MonitoredThread, TitleChange } from './types';

interface AppProps {
  store: ThreadStore;
  notifier: Notifier;
  performScan: () => { currentThreads: MonitoredThread[]; changes: TitleChange[] };
}

// eslint-disable-next-line max-lines-per-function
function App({ store, notifier, performScan }: AppProps) {
  const {
    isPanelOpen,
    setIsPanelOpen,
    unseenCount,
    pendingToasts,
    setPendingToasts,
    retentionDays,
    setRetentionDays,
    changeGroups,
    storageInfo,
    refreshData,
  } = useAppData({ store, notifier, performScan });

  const {
    handleScanNow,
    handleOpen,
    handleBlock,
    handleResume,
    handleClearChanges,
    handleMarkAllRead,
    handleRetentionChange,
    handleToastDismiss,
    handleToastNavigate,
    handleSimulateTitleChange,
  } = useAppHandlers({
    store,
    notifier,
    refreshData,
    setPendingToasts,
    setRetentionDays,
    performScan,
  });

  return (
    <>
      <ToggleButton unseenCount={unseenCount} onClick={() => setIsPanelOpen(!isPanelOpen)} />

      <ManagerPanel
        isOpen={isPanelOpen}
        threads={Object.values(store.getThreads())}
        changes={store.getChanges()}
        changeGroups={changeGroups}
        blacklistedThreads={store.getBlacklistedThreads()}
        unseenCount={unseenCount}
        retentionDays={retentionDays}
        storageInfo={storageInfo}
        onClose={() => setIsPanelOpen(false)}
        onScanNow={handleScanNow}
        onOpen={handleOpen}
        onBlock={handleBlock}
        onResume={handleResume}
        onClearChanges={handleClearChanges}
        onMarkAllRead={handleMarkAllRead}
        onSimulateTitleChange={handleSimulateTitleChange}
        onRetentionChange={handleRetentionChange}
      />

      <ToastContainer
        changes={pendingToasts}
        threads={store.getThreads()}
        onDismiss={handleToastDismiss}
        onNavigate={handleToastNavigate}
      />
    </>
  );
}

export default App;
