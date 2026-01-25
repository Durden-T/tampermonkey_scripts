import { BYTES } from '../../constants';

export function formatBytes(bytes: number): string {
  if (bytes < 0 || !Number.isFinite(bytes)) {
    return '0 B';
  }
  if (bytes < BYTES.KB) {
    return `${bytes} B`;
  }
  if (bytes < BYTES.MB) {
    return `${(bytes / BYTES.KB).toFixed(1)} KB`;
  }
  return `${(bytes / BYTES.MB).toFixed(2)} MB`;
}
