import pako from 'pako';
import {
  type StoredData,
  type StorageInfo,
  type MonitoredThread,
  type TitleChange,
  DEFAULT_RETENTION_DAYS,
} from '../types';
import { STORAGE, DISCORD_URL_PREFIX, BYTES, IDB } from '../constants';
import type { AppDB } from './db';

interface StorageWrapper {
  compressed: boolean;
  data: string;
}

const MAX_COMPRESSION_SIZE_MB = 5;
const STORAGE_VERSION = 1;

const getStringSize = (str: string): number => new TextEncoder().encode(str).length;

export class StorageEngine {
  private db: AppDB;
  private lastRawSize: number = 0;
  private lastCompressedSize: number = 0;
  private isCompressed: boolean = false;
  private saveDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingData: StoredData | null = null;
  private pendingSavePromise: Promise<void> | null = null;

  private constructor(db: AppDB) {
    this.db = db;
  }

  static fromDB(db: AppDB): StorageEngine {
    return new StorageEngine(db);
  }

  async loadData(): Promise<StoredData> {
    try {
      const stored: unknown = await this.db.get(IDB.DATA_STORE, IDB.DATA_KEY);
      if (stored === null || stored === undefined) {
        return this.getEmptyData();
      }

      const { jsonStr, isCompressed } = this.parseStoredData(stored);
      if (!jsonStr) {
        return this.getEmptyData();
      }

      this.isCompressed = isCompressed;
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      return this.expand(parsed);
    } catch (error) {
      console.error('Failed to load data from storage:', error);
      return this.getEmptyData();
    }
  }

  async saveData(data: StoredData): Promise<void> {
    try {
      const compactData = this.compact(data);
      const jsonStr = JSON.stringify(compactData);
      const rawSize = getStringSize(jsonStr);

      const compressed = this.compress(jsonStr);
      const compressedSize = getStringSize(compressed);
      const wrapper: StorageWrapper = { compressed: true, data: compressed };

      await this.db.put(IDB.DATA_STORE, wrapper, IDB.DATA_KEY);

      this.lastRawSize = rawSize;
      this.lastCompressedSize = compressedSize;
      this.isCompressed = true;
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
      const currentSave = this.pendingSavePromise;
      this.pendingSavePromise = currentSave
        ? currentSave.then(() => this.saveData(data))
        : this.saveData(data);
      return;
    }

    this.pendingData = data;
    this.saveDebounceTimeout = setTimeout(() => {
      this.pendingSavePromise = this.saveData(data);
      this.saveDebounceTimeout = null;
      this.pendingData = null;
    }, STORAGE.SAVE_DEBOUNCE_MS);
  }

  async flushPendingSave(): Promise<void> {
    const timeoutToCancel = this.saveDebounceTimeout;
    const dataToSave = this.pendingData;
    const saveToAwait = this.pendingSavePromise;

    this.saveDebounceTimeout = null;
    this.pendingData = null;
    this.pendingSavePromise = null;

    if (timeoutToCancel) {
      clearTimeout(timeoutToCancel);
    }

    if (saveToAwait) {
      await saveToAwait;
    }

    if (dataToSave) {
      await this.saveData(dataToSave);
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

    if (uint8.length > MAX_COMPRESSION_SIZE_MB * BYTES.MB) {
      console.warn(
        `Compression input exceeds ${MAX_COMPRESSION_SIZE_MB}MB, performance may degrade`
      );
    }

    const chunkSize = 8192;
    const chunks: string[] = [];
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
      chunks.push(String.fromCharCode(...chunk));
    }

    return btoa(chunks.join(''));
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
    if (typeof stored === 'object' && stored !== null) {
      const wrapper = stored as Partial<StorageWrapper>;
      if (wrapper.compressed === true && typeof wrapper.data === 'string') {
        try {
          const decompressed = this.decompress(wrapper.data);
          return { jsonStr: decompressed, isCompressed: true };
        } catch (error) {
          console.error('Failed to decompress stored data:', error);
          console.error('Storage data may be corrupted. Resetting to empty state.');
          throw new Error('Failed to decompress stored data');
        }
      }
      return { jsonStr: JSON.stringify(stored), isCompressed: false };
    }

    if (typeof stored === 'string') {
      try {
        const wrapper = JSON.parse(stored) as StorageWrapper;
        if (wrapper?.compressed === true) {
          const decompressed = this.decompress(wrapper.data);
          return { jsonStr: decompressed, isCompressed: true };
        }
        return { jsonStr: wrapper?.data ?? stored, isCompressed: false };
      } catch {
        return { jsonStr: stored, isCompressed: false };
      }
    }

    return { jsonStr: '', isCompressed: false };
  }

  private buildThreadIdDict(data: StoredData): { dict: string[]; indexMap: Map<string, number> } {
    const threadIdSet = new Set<string>();
    for (const id of Object.keys(data.threads)) {
      threadIdSet.add(id);
    }
    for (const change of data.changes) {
      threadIdSet.add(change.threadId);
    }
    for (const id of data.blacklist) {
      threadIdSet.add(id);
    }

    const dict = Array.from(threadIdSet);
    const indexMap = new Map(dict.map((id, idx) => [id, idx]));
    return { dict, indexMap };
  }

  private compactThreads(
    threads: Record<string, MonitoredThread>,
    indexMap: Map<string, number>
  ): Record<string, unknown> {
    const compactThreads: Record<string, unknown> = {};
    for (const [id, thread] of Object.entries(threads)) {
      const idx = indexMap.get(id);
      if (idx === undefined) {
        continue;
      }
      compactThreads[idx] = {
        currentTitle: thread.currentTitle,
        url: thread.url.startsWith(DISCORD_URL_PREFIX)
          ? thread.url.slice(DISCORD_URL_PREFIX.length)
          : thread.url,
        parentChannel: thread.parentChannel,
        firstSeenAt: thread.firstSeenAt,
      };
    }
    return compactThreads;
  }

  private compactChanges(indexMap: Map<string, number>, changes: TitleChange[]): unknown[] {
    return changes.map((change) => {
      const idx = indexMap.get(change.threadId);
      if (idx === undefined) {
        throw new Error(`Thread ID ${change.threadId} not found in dictionary`);
      }
      const compactChange: Record<string, unknown> = {
        t: idx,
        o: change.oldTitle,
        n: change.newTitle,
        c: change.changedAt,
      };
      if (change.seen) {
        compactChange.s = true;
      }
      return compactChange;
    });
  }

  private compactBlacklist(blacklist: string[], indexMap: Map<string, number>): number[] {
    return blacklist.map((id) => {
      const idx = indexMap.get(id);
      if (idx === undefined) {
        throw new Error(`Thread ID ${id} not found in dictionary`);
      }
      return idx;
    });
  }

  private compact(data: StoredData): Record<string, unknown> {
    const { dict, indexMap } = this.buildThreadIdDict(data);

    const result: Record<string, unknown> = {
      _v: STORAGE_VERSION,
      dict,
      threads: this.compactThreads(data.threads, indexMap),
      changes: this.compactChanges(indexMap, data.changes),
      blacklist: this.compactBlacklist(data.blacklist, indexMap),
    };

    if (data.retentionDays && data.retentionDays !== 0) {
      result.retentionDays = data.retentionDays;
    }

    return result;
  }

  private expand(parsed: Record<string, unknown>): StoredData {
    if (parsed._v !== STORAGE_VERSION) {
      throw new Error('Incompatible storage version');
    }

    const dict = parsed.dict as string[];

    const expandedThreads: Record<string, MonitoredThread> = {};
    const threadsData = parsed.threads as Record<string, Record<string, unknown>>;
    for (const [idx, thread] of Object.entries(threadsData)) {
      const id = dict[Number(idx)];
      expandedThreads[id] = {
        id,
        currentTitle: thread.currentTitle as string,
        url: (thread.url as string).startsWith(DISCORD_URL_PREFIX)
          ? (thread.url as string)
          : DISCORD_URL_PREFIX + (thread.url as string),
        parentChannel: thread.parentChannel as string,
        firstSeenAt: thread.firstSeenAt as number,
      };
    }

    const changesData = parsed.changes as Array<Record<string, unknown>>;
    const expandedChanges = changesData.map((change) => ({
      threadId: dict[change.t as number],
      oldTitle: change.o as string,
      newTitle: change.n as string,
      changedAt: change.c as number,
      seen: (change.s as boolean | undefined) ?? false,
    }));

    const blacklistData = parsed.blacklist as number[];
    const expandedBlacklist = blacklistData.map((idx) => dict[idx]);

    return {
      threads: expandedThreads,
      changes: expandedChanges,
      blacklist: expandedBlacklist,
      retentionDays: (parsed.retentionDays as number | undefined) ?? DEFAULT_RETENTION_DAYS,
    };
  }

  private getEmptyData(): StoredData {
    return {
      threads: {},
      changes: [],
      blacklist: [],
      retentionDays: DEFAULT_RETENTION_DAYS,
    };
  }
}
