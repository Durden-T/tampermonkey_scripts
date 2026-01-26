import {
  type MonitoredThread,
  type TitleChange,
  type StoredData,
  type ThreadChangeGroup,
  type StorageInfo,
  DEFAULT_RETENTION_DAYS,
} from '../types';
import { RETENTION } from '../constants';
import { StorageEngine } from './StorageEngine';
import { ChangeTracker } from './ChangeTracker';
import { BlacklistManager } from './BlacklistManager';
import type { IThreadRepository } from './IThreadRepository';

export class ThreadStore implements IThreadRepository {
  private data: StoredData;
  private storageEngine: StorageEngine;
  private changeTracker: ChangeTracker;
  private blacklistManager: BlacklistManager;
  private cachedThreads: Record<string, MonitoredThread> | null = null;
  private cachedDashboardData: {
    unseenCount: number;
    changeGroups: ThreadChangeGroup[];
    storageInfo: StorageInfo;
  } | null = null;

  constructor() {
    this.storageEngine = new StorageEngine();
    this.data = this.storageEngine.loadData();
    this.changeTracker = new ChangeTracker(this.data.changes);
    this.blacklistManager = new BlacklistManager(this.data.blacklist);
    this.cleanupOldChanges();
  }

  private invalidateDashboardCache(): void {
    this.cachedDashboardData = null;
  }

  private invalidateAllCaches(): void {
    this.cachedThreads = null;
    this.cachedDashboardData = null;
  }

  private scheduleSave(immediate: boolean = false): void {
    this.storageEngine.scheduleSave(this.data, immediate);
  }

  private persistMutation(
    options: { invalidateAllCaches?: boolean; immediate?: boolean } = {}
  ): void {
    const { invalidateAllCaches = false, immediate = false } = options;

    if (invalidateAllCaches) {
      this.invalidateAllCaches();
    } else {
      this.invalidateDashboardCache();
    }

    this.scheduleSave(immediate);
  }

  getStorageInfo(): StorageInfo {
    return this.storageEngine.getStorageInfo(
      this.changeTracker.getChanges().length,
      Object.keys(this.data.threads).length
    );
  }

  getDashboardData(): {
    unseenCount: number;
    changeGroups: ThreadChangeGroup[];
    storageInfo: StorageInfo;
  } {
    if (this.cachedDashboardData !== null) {
      return this.cachedDashboardData;
    }

    const { unseenCount, groupMap } = this.changeTracker.processChangesIntoGroups();
    const changeGroups = this.changeTracker.buildChangeGroups(groupMap, this.data.threads);

    this.cachedDashboardData = {
      unseenCount,
      changeGroups,
      storageInfo: this.getStorageInfo(),
    };

    return this.cachedDashboardData;
  }

  addThread(thread: MonitoredThread): void {
    if (!this.blacklistManager.has(thread.id)) {
      this.data.threads[thread.id] = thread;
      this.persistMutation({ invalidateAllCaches: true });
    }
  }

  getThreads(): Record<string, MonitoredThread> {
    if (this.cachedThreads !== null) {
      return this.cachedThreads;
    }

    const filtered: Record<string, MonitoredThread> = {};
    for (const [id, thread] of Object.entries(this.data.threads)) {
      if (!this.blacklistManager.has(id)) {
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
    this.changeTracker.recordChange(change);
    const thread = this.data.threads[change.threadId];
    if (thread) {
      thread.currentTitle = newTitle;
    }
    this.persistMutation({ invalidateAllCaches: true });
  }

  getChanges(): TitleChange[] {
    return [...this.changeTracker.getChanges()];
  }

  getChangesGroupedByThread(): ThreadChangeGroup[] {
    return this.getDashboardData().changeGroups;
  }

  getUnseenChangesCount(): number {
    return this.changeTracker.getUnseenCount();
  }

  markChangeSeen(threadId: string): void {
    if (this.changeTracker.markSeen(threadId)) {
      this.persistMutation();
    }
  }

  markAllChangesSeen(): void {
    if (this.changeTracker.markAllSeen()) {
      this.persistMutation();
    }
  }

  clearChanges(): void {
    this.changeTracker.clear();
    this.persistMutation({ immediate: true });
  }

  addToBlacklist(threadId: string): void {
    if (this.blacklistManager.add(threadId)) {
      this.data.blacklist = this.blacklistManager.getAll();
      this.cachedThreads = null;
      const hasChanges = this.changeTracker.getChanges().some((c) => c.threadId === threadId);
      if (hasChanges) {
        this.invalidateDashboardCache();
      }
      this.scheduleSave();
    }
  }

  removeFromBlacklist(threadId: string): void {
    if (this.blacklistManager.remove(threadId)) {
      this.data.blacklist = this.blacklistManager.getAll();
      this.cachedThreads = null;
      const hasChanges = this.changeTracker.getChanges().some((c) => c.threadId === threadId);
      if (hasChanges) {
        this.invalidateDashboardCache();
      }
      this.scheduleSave();
    }
  }

  getBlacklist(): string[] {
    return this.blacklistManager.getAll();
  }

  isBlacklisted(threadId: string): boolean {
    return this.blacklistManager.has(threadId);
  }

  getBlacklistedThreads(): MonitoredThread[] {
    const result: MonitoredThread[] = [];
    for (const id of this.blacklistManager.getAll()) {
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
    if (!Number.isFinite(days) || days < 0) {
      throw new Error('Retention days must be a finite non-negative number');
    }

    const clampedDays =
      days === 0 ? 0 : Math.min(Math.max(1, Math.floor(days)), RETENTION.MAX_DAYS);
    const currentDays = this.getRetentionDays();
    const needsCleanup = clampedDays < currentDays || (clampedDays > 0 && currentDays === 0);
    this.data.retentionDays = clampedDays;

    if (needsCleanup && this.changeTracker.cleanupOldChanges(clampedDays)) {
      this.invalidateDashboardCache();
    }
    this.scheduleSave(true);
  }

  flush(): void {
    this.storageEngine.flushPendingSave();
  }

  private cleanupOldChanges(): void {
    const retentionDays = this.getRetentionDays();
    if (this.changeTracker.cleanupOldChanges(retentionDays)) {
      this.persistMutation({ immediate: true });
    }
  }
}
