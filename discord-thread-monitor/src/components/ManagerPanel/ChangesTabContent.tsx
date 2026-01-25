import { type getTexts } from '../../i18n';
import { ThreadList } from '../ThreadList';
import type { ThreadChangeGroup } from '../../types';
import type { TimePeriod, TimeFilterMode } from '../../utils/timeFilters';
import { FilterControls } from './FilterControls';

interface ChangesTabContentProps {
  filterMode: TimeFilterMode | 'all' | 'allUnread';
  selectedPeriod: TimePeriod;
  onFilterModeChange: (mode: TimeFilterMode | 'all' | 'allUnread') => void;
  onPeriodChange: (period: TimePeriod) => void;
  unseenCount: number;
  onMarkAllRead: () => void;
  filteredChangeGroups: ThreadChangeGroup[];
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
  onResume: (threadId: string) => void;
  t: ReturnType<typeof getTexts>;
}

export const ChangesTabContent: React.FC<ChangesTabContentProps> = ({
  filterMode,
  selectedPeriod,
  onFilterModeChange,
  onPeriodChange,
  unseenCount,
  onMarkAllRead,
  filteredChangeGroups,
  onOpen,
  onBlock,
  onResume,
  t,
}) => {
  return (
    <>
      <FilterControls
        filterMode={filterMode}
        selectedPeriod={selectedPeriod}
        onFilterModeChange={onFilterModeChange}
        onPeriodChange={onPeriodChange}
        unseenCount={unseenCount}
        onMarkAllRead={onMarkAllRead}
        t={t}
      />
      <ThreadList
        threads={[]}
        changeGroups={filteredChangeGroups}
        emptyMessage={t.labels.noChanges}
        onOpen={onOpen}
        onBlock={onBlock}
        onResume={onResume}
      />
    </>
  );
};
