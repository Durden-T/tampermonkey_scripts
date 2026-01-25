import pako from 'pako';
import type {
  MonitoredThread,
  TitleChange,
  StoredData,
  ThreadChangeGroup,
  StorageInfo,
} from '../types';
// eslint-disable-next-line no-duplicate-imports
import { DEFAULT_RETENTION_DAYS, COMPRESSION_THRESHOLD_BYTES } from '../types';

const STORAGE_KEY = 'discord-thread-monitor-data';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SAVE_DEBOUNCE_MS = 300;

const getStringSize = (str: string): number => new Blob([str]).size;

const defaultData: StoredData = {
  threads: {},
  changes: [],
  blacklist: [],
  retentionDays: DEFAULT_RETENTION_DAYS,
};

interface StorageWrapper {
  compressed: boolean;
  data: string;
}

export class ThreadStore {
  private data: StoredData;
  private lastRawSize: number = 0;
  private lastCompressedSize: number = 0;
  private isCompressed: boolean = false;
  private blacklistSet: Set<string>;
  private cachedThreads: Record<string, MonitoredThread> | null = null;
  private saveDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.data = this.loadData();
    this.blacklistSet = new Set(this.data.blacklist);
    this.cleanupOldChanges();
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
    try {
      return pako.inflate(uint8, { to: 'string' });
    } catch (error) {
      console.error('Failed to decompress data:', error);
      throw error; // Re-throw to be caught by outer try-catch
    }
  }

  private loadData(): StoredData {
    try {
      const stored = GM_getValue(STORAGE_KEY, null);
      if (stored === null || stored === undefined || stored === 'undefined') {
        return this.getEmptyData();
      }

      const { jsonStr, isCompressed } = this.parseStoredData(stored);
      this.isCompressed = isCompressed;
      this.lastRawSize = getStringSize(jsonStr);
      return this.migrateData(JSON.parse(jsonStr));
    } catch (error) {
      console.error('Failed to load data from storage:', error);
      return this.getEmptyData();
    }
  }

  private parseStoredData(stored: unknown): { jsonStr: string; isCompressed: boolean } {
    if (typeof stored === 'string') {
      try {
        const wrapper = JSON.parse(stored) as StorageWrapper;
        if (wrapper?.compressed) {
          return { jsonStr: this.decompress(wrapper.data), isCompressed: true };
        }
        return { jsonStr: wrapper?.data ?? stored, isCompressed: false };
      } catch {
        return { jsonStr: stored, isCompressed: false };
      }
    }
    return { jsonStr: JSON.stringify(stored), isCompressed: false };
  }

  private getEmptyData(): StoredData {
    return {
      threads: {},
      changes: [],
      blacklist: [],
      retentionDays: defaultData.retentionDays,
    };
  }

  private migrateData(parsed: StoredData & { retentionMonths?: number }): StoredData {
    if (parsed.retentionMonths !== undefined && parsed.retentionDays === undefined) {
      parsed.retentionDays = parsed.retentionMonths * 30;
      delete parsed.retentionMonths;
    }
    if (!parsed.retentionDays) {
      parsed.retentionDays = DEFAULT_RETENTION_DAYS;
    }
    return parsed;
  }

  private invalidateCache(): void {
    this.cachedThreads = null;
  }

  private scheduleSave(immediate: boolean = false): void {
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
      this.saveDebounceTimeout = null;
    }

    if (immediate) {
      this.saveData();
      return;
    }

    this.saveDebounceTimeout = setTimeout(() => {
      this.saveData();
      this.saveDebounceTimeout = null;
    }, SAVE_DEBOUNCE_MS);
  }

  private saveData(): void {
    try {
      const jsonStr = JSON.stringify(this.data);
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

      GM_setValue(STORAGE_KEY, JSON.stringify(wrapper));
    } catch (error) {
      console.error('Failed to save data to storage:', error);
    }
  }

  getStorageInfo(): StorageInfo {
    return {
      rawSize: this.lastRawSize,
      compressedSize: this.isCompressed ? this.lastCompressedSize : this.lastRawSize,
      isCompressed: this.isCompressed,
      changeCount: this.data.changes.length,
      threadCount: Object.keys(this.data.threads).length,
    };
  }

  addThread(thread: MonitoredThread): void {
    if (!this.isBlacklisted(thread.id)) {
      this.data.threads[thread.id] = thread;
      this.invalidateCache();
      this.scheduleSave();
    }
  }

  updateTitle(threadId: string, newTitle: string): void {
    const thread = this.data.threads[threadId];
    if (thread && thread.currentTitle !== newTitle) {
      thread.currentTitle = newTitle;
      this.invalidateCache();
      this.scheduleSave();
    }
  }

  getThreads(): Record<string, MonitoredThread> {
    if (this.cachedThreads !== null) {
      return this.cachedThreads;
    }

    const filtered: Record<string, MonitoredThread> = {};
    for (const [id, thread] of Object.entries(this.data.threads)) {
      if (!this.isBlacklisted(id)) {
        filtered[id] = thread;
      }
    }
    this.cachedThreads = filtered;
    return filtered;
  }

  getThread(threadId: string): MonitoredThread | undefined {
    return this.data.threads[threadId];
  }

  recordTitleChange(change: TitleChange, newTitle: string): void {
    this.data.changes.push(change);
    const thread = this.data.threads[change.threadId];
    if (thread) {
      thread.currentTitle = newTitle;
      this.invalidateCache();
    }
    this.scheduleSave();
  }

  getChanges(): TitleChange[] {
    return this.data.changes;
  }

  getChangesGroupedByThread(): ThreadChangeGroup[] {
    const groupMap = new Map<string, { changes: TitleChange[]; hasUnseen: boolean }>();

    for (const change of this.data.changes) {
      const existing = groupMap.get(change.threadId);
      if (existing) {
        existing.changes.push(change);
        if (!change.seen) {
          existing.hasUnseen = true;
        }
      } else {
        groupMap.set(change.threadId, {
          changes: [change],
          hasUnseen: !change.seen,
        });
      }
    }

    const groups: ThreadChangeGroup[] = [];
    for (const [threadId, groupData] of groupMap) {
      groupData.changes.sort((a, b) => b.changedAt - a.changedAt);

      groups.push({
        threadId,
        thread: this.data.threads[threadId],
        changes: groupData.changes,
        latestChangeAt: groupData.changes[0].changedAt,
        hasUnseen: groupData.hasUnseen,
      });
    }

    return groups.sort((a, b) => b.latestChangeAt - a.latestChangeAt);
  }

  getUnseenChangesCount(): number {
    let count = 0;
    for (const change of this.data.changes) {
      if (!change.seen) count++;
    }
    return count;
  }

  markChangeSeen(threadId: string): void {
    let changed = false;
    for (const change of this.data.changes) {
      if (change.threadId === threadId && !change.seen) {
        change.seen = true;
        changed = true;
      }
    }
    if (changed) {
      this.scheduleSave();
    }
  }

  markAllChangesSeen(): void {
    let changed = false;
    for (const change of this.data.changes) {
      if (!change.seen) {
        change.seen = true;
        changed = true;
      }
    }
    if (changed) {
      this.scheduleSave();
    }
  }

  clearChanges(): void {
    this.data.changes = [];
    this.scheduleSave(true);
  }

  addToBlacklist(threadId: string): void {
    if (!this.blacklistSet.has(threadId)) {
      this.blacklistSet.add(threadId);
      this.data.blacklist.push(threadId);
      this.invalidateCache();
      this.scheduleSave();
    }
  }

  removeFromBlacklist(threadId: string): void {
    if (this.blacklistSet.has(threadId)) {
      this.blacklistSet.delete(threadId);
      const index = this.data.blacklist.indexOf(threadId);
      if (index > -1) {
        this.data.blacklist.splice(index, 1);
      }
      this.invalidateCache();
      this.scheduleSave();
    }
  }

  getBlacklist(): string[] {
    return this.data.blacklist;
  }

  isBlacklisted(threadId: string): boolean {
    return this.blacklistSet.has(threadId);
  }

  getBlacklistedThreads(): MonitoredThread[] {
    const result: MonitoredThread[] = [];
    for (const id of this.data.blacklist) {
      const thread = this.data.threads[id];
      if (thread) {
        result.push(thread);
      }
    }
    return result;
  }

  getRetentionDays(): number {
    return this.data.retentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  setRetentionDays(days: number): void {
    const newDays = days === 0 ? 0 : Math.max(1, Math.min(365, days));
    const currentDays = this.getRetentionDays();
    const needsCleanup = newDays < currentDays || (newDays > 0 && currentDays === 0);
    this.data.retentionDays = newDays;
    if (needsCleanup) {
      this.cleanupOldChanges();
    } else {
      this.scheduleSave(true);
    }
  }

  private cleanupOldChanges(): void {
    const retentionDays = this.getRetentionDays();
    if (retentionDays === 0) {
      return;
    }

    const retentionMs = retentionDays * MS_PER_DAY;
    const cutoffTime = Date.now() - retentionMs;

    const originalLength = this.data.changes.length;
    this.data.changes = this.data.changes.filter((change) => change.changedAt >= cutoffTime);

    if (this.data.changes.length !== originalLength) {
      this.scheduleSave(true);
    }
  }
}
