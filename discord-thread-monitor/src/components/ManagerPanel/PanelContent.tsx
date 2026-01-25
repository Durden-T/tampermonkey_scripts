import { type getTexts } from '../../i18n';
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
  filterMode: TimeFilterMode | 'all' | 'allUnread';
  selectedPeriod: TimePeriod;
  onFilterModeChange: (mode: TimeFilterMode | 'all' | 'allUnread') => void;
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

// Switch statement with JSX for 4 tabs - prop forwarding, no complex logic
// eslint-disable-next-line max-lines-per-function
export const PanelContent: React.FC<PanelContentProps> = (props) => {
  // eslint-disable-next-line max-lines-per-function
  const renderTab = () => {
    switch (props.activeTab) {
      case 'changes':
        return (
          <ChangesTabContent
            filterMode={props.filterMode}
            selectedPeriod={props.selectedPeriod}
            onFilterModeChange={props.onFilterModeChange}
            onPeriodChange={props.onPeriodChange}
            unseenCount={props.unseenCount}
            onMarkAllRead={props.onMarkAllRead}
            filteredChangeGroups={props.filteredChangeGroups}
            onOpen={props.onOpen}
            onBlock={props.onBlock}
            onResume={props.onResume}
            t={props.t}
          />
        );
      case 'monitoring':
        return (
          <ThreadList
            threads={props.threads}
            emptyMessage={props.t.labels.noThreads}
            onOpen={props.onOpen}
            onBlock={props.onBlock}
            onResume={props.onResume}
          />
        );
      case 'blacklist':
        return (
          <ThreadList
            threads={props.blacklistedThreads}
            isBlacklisted
            emptyMessage={props.t.labels.noBlacklist}
            onOpen={props.onOpen}
            onBlock={props.onBlock}
            onResume={props.onResume}
          />
        );
      case 'debug':
        return (
          <DebugTabContent
            storageInfo={props.storageInfo}
            showStorageWarning={props.showStorageWarning}
            retentionDays={props.retentionDays}
            unseenCount={props.unseenCount}
            onSimulateTitleChange={props.onSimulateTitleChange}
            onClearChanges={props.onClearChanges}
            onRetentionChange={props.onRetentionChange}
            t={props.t}
          />
        );
    }
  };

  return <div className="panel-content tm-scrollbar">{renderTab()}</div>;
};
