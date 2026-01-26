import pako from 'pako';
import {
  type StoredData,
  type StorageInfo,
  DEFAULT_RETENTION_DAYS,
  COMPRESSION_THRESHOLD_BYTES,
} from '../types';
import { STORAGE, UTF8_CODE_POINTS, UTF8_BYTE_SIZES, TIME_UNITS } from '../constants';

interface StorageWrapper {
  compressed: boolean;
  data: string;
}

const getStringSize = (str: string): number => {
  let size = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < UTF8_CODE_POINTS.SINGLE_BYTE_MAX) {
      size += 1;
    } else if (code < UTF8_CODE_POINTS.DOUBLE_BYTE_MAX) {
      size += 2;
    } else if (code < UTF8_CODE_POINTS.SURROGATE_MIN || code >= UTF8_CODE_POINTS.SURROGATE_MAX) {
      size += UTF8_BYTE_SIZES.TRIPLE;
    } else {
      size += UTF8_BYTE_SIZES.QUAD;
      i++;
    }
  }
  return size;
};

export class StorageEngine {
  private lastRawSize: number = 0;
  private lastCompressedSize: number = 0;
  private isCompressed: boolean = false;
  private saveDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingData: StoredData | null = null;

  loadData(): StoredData {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const stored = GM_getValue(STORAGE.KEY, null);
      if (stored === null || stored === undefined || stored === 'undefined') {
        return this.getEmptyData();
      }

      const { jsonStr, isCompressed } = this.parseStoredData(stored);
      this.isCompressed = isCompressed;
      this.lastRawSize = getStringSize(jsonStr);
      return this.migrateData(JSON.parse(jsonStr) as StoredData & { retentionMonths?: number });
    } catch (error) {
      console.error('Failed to load data from storage:', error);
      return this.getEmptyData();
    }
  }

  saveData(data: StoredData): void {
    try {
      const jsonStr = JSON.stringify(data);
      this.lastRawSize = getStringSize(jsonStr);

      let wrapper: StorageWrapper;
      if (this.lastRawSize > COMPRESSION_THRESHOLD_BYTES) {
        const compressed = this.compress(jsonStr);
        this.lastCompressedSize = getStringSize(compressed);
        this.isCompressed = true;
        wrapper = { compressed: true, data: compressed };
      } else {
        this.lastCompressedSize = this.lastRawSize;
        this.isCompressed = false;
        wrapper = { compressed: false, data: jsonStr };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      GM_setValue(STORAGE.KEY, JSON.stringify(wrapper) as string & number);
    } catch (error) {
      console.error('Failed to save data to storage:', error);
    }
  }

  scheduleSave(data: StoredData, immediate: boolean = false): void {
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
      this.saveDebounceTimeout = null;
    }

    if (immediate) {
      this.pendingData = null;
      this.saveData(data);
      return;
    }

    this.pendingData = data;
    this.saveDebounceTimeout = setTimeout(() => {
      this.saveData(data);
      this.saveDebounceTimeout = null;
      this.pendingData = null;
    }, STORAGE.SAVE_DEBOUNCE_MS);
  }

  flushPendingSave(): void {
    if (this.saveDebounceTimeout && this.pendingData) {
      clearTimeout(this.saveDebounceTimeout);
      this.saveDebounceTimeout = null;
      this.saveData(this.pendingData);
      this.pendingData = null;
    }
  }

  getStorageInfo(changeCount: number, threadCount: number): StorageInfo {
    return {
      rawSize: this.lastRawSize,
      compressedSize: this.isCompressed ? this.lastCompressedSize : this.lastRawSize,
      isCompressed: this.isCompressed,
      changeCount,
      threadCount,
    };
  }

  private compress(jsonStr: string): string {
    const uint8 = pako.deflate(jsonStr);
    return btoa(String.fromCharCode(...uint8));
  }

  private decompress(base64: string): string {
    const binary = atob(base64);
    const uint8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8[i] = binary.charCodeAt(i);
    }
    return pako.inflate(uint8, { to: 'string' });
  }

  private parseStoredData(stored: unknown): { jsonStr: string; isCompressed: boolean } {
    if (typeof stored !== 'string') {
      return { jsonStr: JSON.stringify(stored), isCompressed: false };
    }

    let wrapper: StorageWrapper;
    try {
      wrapper = JSON.parse(stored) as StorageWrapper;
    } catch {
      return { jsonStr: stored, isCompressed: false };
    }

    if (wrapper?.compressed !== true) {
      return { jsonStr: wrapper?.data ?? stored, isCompressed: false };
    }

    try {
      const decompressed = this.decompress(wrapper.data);
      return { jsonStr: decompressed, isCompressed: true };
    } catch (error) {
      console.error('Failed to decompress stored data:', error);
      console.error('Storage data may be corrupted. Resetting to empty state.');
      throw new Error('Failed to decompress stored data');
    }
  }

  private getEmptyData(): StoredData {
    return {
      threads: {},
      changes: [],
      blacklist: [],
      retentionDays: DEFAULT_RETENTION_DAYS,
    };
  }

  private migrateData(parsed: StoredData & { retentionMonths?: number }): StoredData {
    if (parsed.retentionMonths !== undefined && parsed.retentionDays === undefined) {
      parsed.retentionDays = parsed.retentionMonths * TIME_UNITS.DAYS_PER_MONTH;
      delete parsed.retentionMonths;
    }
    parsed.retentionDays ??= DEFAULT_RETENTION_DAYS;
    return parsed;
  }
}
