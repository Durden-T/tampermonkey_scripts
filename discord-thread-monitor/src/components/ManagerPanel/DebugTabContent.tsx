import { getTexts } from '../../i18n';
import type { StorageInfo } from '../../types';
import { DebugActions } from './DebugActions';
import { DebugStats } from './DebugStats';
import { RetentionInputSection } from './RetentionInputSection';
import { StorageInfoSection } from './StorageInfoSection';

interface DebugTabContentProps {
  storageInfo: StorageInfo;
  showStorageWarning: boolean;
  retentionDays: number;
  unseenCount: number;
  onSimulateTitleChange: () => void;
  onClearChanges: () => void;
  onRetentionChange: (days: number) => void;
  t: ReturnType<typeof getTexts>;
}

export function DebugTabContent({
  storageInfo,
  showStorageWarning,
  retentionDays,
  unseenCount,
  onSimulateTitleChange,
  onClearChanges,
  onRetentionChange,
  t,
}: DebugTabContentProps) {
  return (
    <>
      {showStorageWarning && (
        <div className="storage-warning-banner">{t.settings.storageTooLarge}</div>
      )}

      <div className="debug-section">
        <RetentionInputSection
          retentionDays={retentionDays}
          onRetentionChange={onRetentionChange}
          t={t}
        />

        <StorageInfoSection storageInfo={storageInfo} t={t} />

        <DebugActions
          onSimulateTitleChange={onSimulateTitleChange}
          onClearChanges={onClearChanges}
          t={t}
        />

        <DebugStats storageInfo={storageInfo} unseenCount={unseenCount} t={t} />
      </div>
    </>
  );
}
