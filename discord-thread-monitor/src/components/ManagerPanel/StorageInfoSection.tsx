import { type getTexts } from '../../i18n';
import { formatBytes } from './utils';
import type { StorageInfo } from '../../types';

interface StorageInfoSectionProps {
  storageInfo: StorageInfo;
  t: ReturnType<typeof getTexts>;
}

export function StorageInfoSection({ storageInfo, t }: StorageInfoSectionProps) {
  const actualSize = storageInfo.isCompressed ? storageInfo.compressedSize : storageInfo.rawSize;

  return (
    <div className="storage-info">
      <label>{t.settings.storageUsage}:</label>
      <div className="storage-details">
        <div className="storage-row">
          <span className="storage-size">{formatBytes(actualSize)}</span>
        </div>
      </div>
    </div>
  );
}
