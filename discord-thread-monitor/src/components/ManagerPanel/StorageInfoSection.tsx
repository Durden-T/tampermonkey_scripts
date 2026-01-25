import { getTexts } from '../../i18n';
import { formatBytes } from './utils';
import type { StorageInfo } from '../../types';

interface StorageInfoSectionProps {
  storageInfo: StorageInfo;
  t: ReturnType<typeof getTexts>;
}

export function StorageInfoSection({ storageInfo, t }: StorageInfoSectionProps) {
  return (
    <div className="storage-info">
      <label>{t.settings.storageUsage}:</label>
      <div className="storage-details">
        <div className="storage-row">
          <span>{t.settings.rawSize}:</span>
          <span>{formatBytes(storageInfo.rawSize)}</span>
        </div>
        {storageInfo.isCompressed && (
          <div className="storage-row">
            <span>{t.settings.compressedSize}:</span>
            <span>{formatBytes(storageInfo.compressedSize)}</span>
          </div>
        )}
        <div className="storage-row">
          <span>{t.settings.compression}:</span>
          <span>{storageInfo.isCompressed ? t.settings.enabled : t.settings.disabled}</span>
        </div>
      </div>
    </div>
  );
}
