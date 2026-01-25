import { getTexts } from '../../i18n';
import type { StorageInfo } from '../../types';

interface DebugStatsProps {
  storageInfo: StorageInfo;
  unseenCount: number;
  t: ReturnType<typeof getTexts>;
}

export function DebugStats({ storageInfo, unseenCount, t }: DebugStatsProps) {
  return (
    <div className="debug-info">
      <div>
        <span>{t.debug.stats.threads}:</span>
        <span>{storageInfo.threadCount}</span>
      </div>
      <div>
        <span>{t.debug.stats.changes}:</span>
        <span>{storageInfo.changeCount}</span>
      </div>
      <div>
        <span>{t.debug.stats.unseen}:</span>
        <span>{unseenCount}</span>
      </div>
    </div>
  );
}
