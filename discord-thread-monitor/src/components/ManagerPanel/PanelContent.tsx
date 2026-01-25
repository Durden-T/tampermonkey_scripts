import { getTexts } from '../../i18n';
import { ThreadList } from '../ThreadList';
import type { MonitoredThread, ThreadChangeGroup, StorageInfo } from '../../types';
import { ChangesTabContent } from './ChangesTabContent';
import { DebugTabContent } from './DebugTabContent';
import type { TimePeriod, TimeFilterMode } from '../../utils/timeFilters';

interface PanelContentProps {
  activeTab: 'changes' | 'monitoring' | 'blacklist' | 'debug';
  threads: MonitoredThread[];
  blacklistedThreads: MonitoredThread[];
  filteredChangeGroups: ThreadChangeGroup[];
  storageInfo: StorageInfo;
  showStorageWarning: boolean;
  retentionDays: number;
  unseenCount: number;
  changesLength: number;
  filterMode: TimeFilterMode | 'all';
  selectedPeriod: TimePeriod;
  onFilterModeChange: (mode: TimeFilterMode | 'all') => void;
  onPeriodChange: (period: TimePeriod) => void;
  onMarkAllRead: () => void;
  onClearChanges: () => void;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
  onResume: (threadId: string) => void;
  onSimulateTitleChange: () => void;
  onRetentionChange: (days: number) => void;
  t: ReturnType<typeof getTexts>;
}

// eslint-disable-next-line max-lines-per-function
export const PanelContent: React.FC<PanelContentProps> = (props) => {
  const {
    activeTab,
    threads,
    blacklistedThreads,
    filteredChangeGroups,
    storageInfo,
    showStorageWarning,
    retentionDays,
    unseenCount,
    changesLength,
    filterMode,
    selectedPeriod,
    onFilterModeChange,
    onPeriodChange,
    onMarkAllRead,
    onClearChanges,
    onOpen,
    onBlock,
    onResume,
    onSimulateTitleChange,
    onRetentionChange,
    t,
  } = props;

  const handleOpenThread = (url: string, threadId: string) => {
    onOpen(url, threadId);
  };

  // eslint-disable-next-line max-lines-per-function
  const renderTab = () => {
    switch (activeTab) {
      case 'changes':
        return (
          <ChangesTabContent
            filterMode={filterMode}
            selectedPeriod={selectedPeriod}
            onFilterModeChange={onFilterModeChange}
            onPeriodChange={onPeriodChange}
            unseenCount={unseenCount}
            changesLength={changesLength}
            onMarkAllRead={onMarkAllRead}
            onClearChanges={onClearChanges}
            filteredChangeGroups={filteredChangeGroups}
            onOpen={handleOpenThread}
            onBlock={onBlock}
            onResume={onResume}
            t={t}
          />
        );
      case 'monitoring':
        return (
          <ThreadList
            threads={threads}
            emptyMessage={t.labels.noThreads}
            onOpen={handleOpenThread}
            onBlock={onBlock}
            onResume={onResume}
          />
        );
      case 'blacklist':
        return (
          <ThreadList
            threads={blacklistedThreads}
            isBlacklisted
            emptyMessage={t.labels.noBlacklist}
            onOpen={handleOpenThread}
            onBlock={onBlock}
            onResume={onResume}
          />
        );
      case 'debug':
        return (
          <DebugTabContent
            storageInfo={storageInfo}
            showStorageWarning={showStorageWarning}
            retentionDays={retentionDays}
            unseenCount={unseenCount}
            onSimulateTitleChange={onSimulateTitleChange}
            onClearChanges={onClearChanges}
            onRetentionChange={onRetentionChange}
            t={t}
          />
        );
    }
  };

  return <div className="panel-content tm-scrollbar">{renderTab()}</div>;
};
