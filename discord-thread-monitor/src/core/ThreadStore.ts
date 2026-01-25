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
        // Create a deep copy to avoid sharing arrays between instances
        return {
          threads: { ...defaultData.threads },
          changes: [...defaultData.changes],
          blacklist: [...defaultData.blacklist],
          retentionDays: defaultData.retentionDays,
        };
      }

      let jsonStr: string;
      if (typeof stored === 'string') {
        try {
          const wrapper = JSON.parse(stored) as StorageWrapper;
          // Check if this is actually a wrapper object with expected structure
          if (
            wrapper &&
            typeof wrapper === 'object' &&
            'compressed' in wrapper &&
            'data' in wrapper
          ) {
            if (wrapper.compressed) {
              jsonStr = this.decompress(wrapper.data);
              this.isCompressed = true;
            } else {
              jsonStr = wrapper.data;
              this.isCompressed = false;
            }
          } else {
            // This is old format - just the raw JSON string
            jsonStr = stored;
            this.isCompressed = false;
          }
        } catch {
          jsonStr = stored;
          this.isCompressed = false;
        }
      } else {
        jsonStr = JSON.stringify(stored);
        this.isCompressed = false;
      }

      this.lastRawSize = new Blob([jsonStr]).size;
      const parsed = JSON.parse(jsonStr);
      return this.migrateData(parsed);
    } catch (error) {
      console.error('Failed to load data from storage:', error);
      // Create a deep copy to avoid sharing arrays between instances
      return {
        threads: { ...defaultData.threads },
        changes: [...defaultData.changes],
        blacklist: [...defaultData.blacklist],
        retentionDays: defaultData.retentionDays,
      };
    }
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
      this.lastRawSize = new Blob([jsonStr]).size;

      let wrapper: StorageWrapper;
      if (this.lastRawSize > COMPRESSION_THRESHOLD_BYTES) {
        const compressed = this.compress(jsonStr);
        this.lastCompressedSize = new Blob([compressed]).size;
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
    const groupMap = new Map<string, TitleChange[]>();

    for (const change of this.data.changes) {
      const existing = groupMap.get(change.threadId) ?? [];
      existing.push(change);
      groupMap.set(change.threadId, existing);
    }

    const groups: ThreadChangeGroup[] = [];
    for (const [threadId, changes] of groupMap) {
      const sortedChanges = changes.sort((a, b) => b.changedAt - a.changedAt);
      groups.push({
        threadId,
        thread: this.data.threads[threadId],
        changes: sortedChanges,
        latestChangeAt: sortedChanges[0].changedAt,
        hasUnseen: sortedChanges.some((c) => !c.seen),
      });
    }

    return groups.sort((a, b) => b.latestChangeAt - a.latestChangeAt);
  }

  getUnseenChangesCount(): number {
    return this.data.changes.filter((c) => !c.seen).length;
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
    return this.data.blacklist
      .map((id) => this.data.threads[id])
      .filter((thread): thread is MonitoredThread => thread !== undefined);
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
